const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { exec } = require('child_process');
const puppeteer = require('puppeteer'); // You'll need to install this with npm
const UserAgent = require('user-agents'); // You'll need to install this with npm
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // You'll need to install this package


// Configuration
const config = require('./config');
const serverBrowser = require('./ServerBrowser');

// Cross-Platform Configuration
const PLATFORM_MODE = {
  IS_MAC: process.platform === 'darwin',
  IS_WINDOWS: process.platform === 'win32'
};


// Initialize Express app
const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Store information about processes we've launched
const launchedProcesses = new Map();
// Map PIDs to accounts for reverse lookup
const processToAccount = new Map();
// Store active WebSocket connections for each account
const activeConnections = new Map();

const http = require('http');

function getProcesses(processName) {
  return new Promise((resolve, reject) => {
    let command = '';
    
    if (PLATFORM_MODE.IS_WINDOWS) {
      command = `tasklist /fi "imagename eq ${processName}" /fo csv /nh`;
    } else if (PLATFORM_MODE.IS_MAC) {
      // Use pgrep for a more reliable process check
      command = `pgrep -x "${processName}"`;
    } else if (PLATFORM_MODE.IS_LINUX) {
      command = `pgrep -x "${processName}"`;
    } else {
      return reject(new Error('Unsupported platform'));
    }

    exec(command, (error, stdout, stderr) => {
      // On Mac/Linux, pgrep returns non-zero exit code if no processes found
      if (error && (error.code !== 1 || stderr)) {
        console.error(`Error executing process list: ${error}`);
        return reject(error);
      }
      
      let processes = [];
      
      if (PLATFORM_MODE.IS_WINDOWS) {
        // If no processes, stdout will be empty
        if (!stdout.trim()) {
          return resolve([]);
        }
        
        processes = stdout.trim().split('\r\n')
          .filter(line => line.length > 0)
          .map(line => {
            const parts = line.split('","');
            if (parts.length >= 2) {
              return {
                name: parts[0].replace(/^"|"$/g, ''),
                pid: parseInt(parts[1].replace(/^"|"$/g, '')),
                sessionName: parts[2] ? parts[2].replace(/^"|"$/g, '') : 'Unknown',
                sessionNumber: parts[3] ? parseInt(parts[3].replace(/^"|"$/g, '')) : 0,
                memoryUsage: parts[4] ? parts[4].replace(/^"|"$/g, '') : 'Unknown'
              };
            }
            return null;
          })
          .filter(process => process !== null);
      } else {
        // Mac/Linux: pgrep returns PIDs, one per line
        if (!stdout.trim()) {
          return resolve([]);
        }
        
        processes = stdout.trim().split('\n')
          .map(pidStr => ({
            pid: parseInt(pidStr.trim()),
            name: processName
          }));
      }
      
      resolve(processes);
    });
  });
}


function isProcessRunning(processNames) {
  // Ensure processNames is an array
  const names = Array.isArray(processNames) ? processNames : [processNames];
  
  return new Promise((resolve) => {
    let command = '';
    
    if (PLATFORM_MODE.IS_WINDOWS) {
      // Windows: Use tasklist with multiple process names
      command = `tasklist /fi "imagename eq ${names[0]}" /fo csv /nh`;
    } else {
      // Mac/Linux: Use pgrep with multiple process names
      command = `pgrep -f "${names[0]}"`;
    }

    exec(command, (error, stdout) => {
      // Explicitly resolve based on output, not error
      if (PLATFORM_MODE.IS_WINDOWS) {
        // Windows: check if output exists and doesn't start with INFO
        resolve(stdout.trim().length > 0 && !stdout.trim().startsWith('INFO'));
      } else {
        // Mac/Linux: check if pgrep returned any PIDs
        resolve(stdout.trim().length > 0);
      }
    });
  });
}


// Add this function to check if the Roblox Player Installer is currently running
function isRobloxInstallerRunning() {
  const installerNames = PLATFORM_MODE.IS_WINDOWS 
    ? ['RobloxPlayerInstaller.exe', 'RobloxInstaller.exe']
    : ['RobloxInstaller', 'RobloxPlayerInstaller', 'Roblox Installer'];
  
  return isProcessRunning(installerNames);
}

async function waitForInstallerToComplete(timeout = 30000) { // Reduced timeout to 30 seconds
  console.log("Waiting for Roblox installer to complete...");
  
  const startTime = Date.now();
  let consecutiveAbsent = 0; // Track consecutive checks where installer is absent
  
  while (Date.now() - startTime < timeout) {
    try {
      const isRunning = await isRobloxInstallerRunning();
      
      if (!isRunning) {
        consecutiveAbsent++;
        console.log(`Installer not detected (${consecutiveAbsent}/3)`);
        
        // Require 3 consecutive checks showing installer is gone
        // This helps prevent false positives where the check happens between processes
        if (consecutiveAbsent >= 3) {
          console.log("Installer has completed");
          return true;
        }
      } else {
        consecutiveAbsent = 0; // Reset if installer is detected again
        console.log("Installer still running...");
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error checking installer status:", error);
      consecutiveAbsent++; // Treat errors as installer not found
    }
  }
  
  console.warn("Timeout waiting for installer to complete - proceeding anyway");
  return false;
}


// Function to get running Roblox processes with more reliable matching
function getRobloxProcesses() {
  const processName = PLATFORM_MODE.IS_WINDOWS 
    ? 'RobloxPlayerBeta.exe' 
    : 'RobloxPlayer';
  
  return getProcesses(processName);
}

// Function to terminate a process by PID
function terminateProcess(pid) {
  return new Promise((resolve, reject) => {
    let command = '';
    
    if (PLATFORM_MODE.IS_WINDOWS) {
      command = `taskkill /F /PID ${pid}`;
    } else if (PLATFORM_MODE.IS_MAC) {
      command = `kill -9 ${pid}`;
    } else {
      return reject(new Error('Unsupported platform'));
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error terminating process: ${error}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

// Set up WebSocket server
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  
  // Heartbeat mechanism to detect broken connections
  function heartbeat() {
    this.isAlive = true;
  }
  
  // Ping all clients regularly
  const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        console.log(`Terminating inactive WebSocket connection for ${ws.accountName || 'unknown'}`);
        
        // Mark account as no longer having WebSocket before terminating
        if (ws.accountName && launchedProcesses.has(ws.accountName)) {
          const processInfo = launchedProcesses.get(ws.accountName);
          launchedProcesses.set(ws.accountName, {
            ...processInfo,
            hasWebSocket: false
          });
          
          console.log(`Marked ${ws.accountName} as disconnected due to inactivity`);
        }
        
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000);
  
  // Clear interval when server closes
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    let accountName = null;
    let connectionId = uuidv4();
    
    // Set up heartbeat
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle initialization message
        if (data.type === 'init') {
          accountName = data.accountName;
          ws.accountName = accountName; // Store account name on the socket for reference
          
          console.log(`WebSocket initialized for account: ${accountName}`);
          
          // Create connection map if it doesn't exist
          if (!activeConnections.has(accountName)) {
            activeConnections.set(accountName, new Map());
            console.log(`Created new connection map for ${accountName}`);
          }
          
          // Store the connection
          activeConnections.get(accountName).set(connectionId, ws);
          console.log(`Stored connection for ${accountName}, ID: ${connectionId}`);
          console.log(`Active connections for ${accountName}: ${activeConnections.get(accountName).size}`);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'init_ack',
            success: true,
            message: 'Connection established'
          }));
          
          // Only add/update the launched process with WebSocket status when WebSocket connects
          // This ensures we only show stats for processes with active connections
          if (launchedProcesses.has(accountName)) {
            const processInfo = launchedProcesses.get(accountName);
            launchedProcesses.set(accountName, {
              ...processInfo,
              hasWebSocket: true,
              lastPing: new Date(),
              // Make sure we keep any existing stats
              visible: true // Mark as visible in UI
            });
          } else {
            // Create a minimal entry if none exists
            launchedProcesses.set(accountName, {
              account: accountName,
              hasWebSocket: true,
              lastPing: new Date(),
              status: 'unknown',
              visible: true // Mark as visible in UI
            });
            console.log(`Created minimal launchedProcess entry for ${accountName}`);
          }
        }
        // Handle execution results
        else if (data.type === 'exec_result') {
          console.log(`Execution result from ${accountName}:`, data.result);
          
          // Just log the result but don't store it
        }
        // Handle ping/heartbeat
        else if (data.type === 'ping') {
          // Update last ping time and refresh the connection
          if (accountName) {
            // Ensure we have connection map
            if (!activeConnections.has(accountName)) {
              activeConnections.set(accountName, new Map());
              console.log(`Created connection map for ${accountName} from ping`);
            }
            
            // Update the connection
            activeConnections.get(accountName).set(connectionId, ws);
            
            // Update process info
            if (launchedProcesses.has(accountName)) {
              const processInfo = launchedProcesses.get(accountName);
              launchedProcesses.set(accountName, {
                ...processInfo,
                hasWebSocket: true,
                lastPing: new Date(),
                visible: true // Keep visible flag
              });
            }
          }
          
          // Send pong
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing message'
        }));
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log(`WebSocket connection closed${accountName ? ` for ${accountName}` : ''}`);
      
      if (accountName && activeConnections.has(accountName)) {
        activeConnections.get(accountName).delete(connectionId);
        console.log(`Removed connection ${connectionId} for ${accountName}`);
        console.log(`Remaining connections: ${activeConnections.get(accountName).size}`);
        
        // If no more connections for this account, update process info to hide from UI
        if (activeConnections.get(accountName).size === 0) {
          if (launchedProcesses.has(accountName)) {
            const processInfo = launchedProcesses.get(accountName);
            launchedProcesses.set(accountName, {
              ...processInfo,
              hasWebSocket: false,
              visible: false // Mark as not visible in UI
            });
            console.log(`Marked ${accountName} as having no WebSocket and hidden from UI`);
          }
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      
      if (accountName && activeConnections.has(accountName)) {
        activeConnections.get(accountName).delete(connectionId);
        console.log(`Removed connection ${connectionId} for ${accountName} due to error`);
        
        // Check if this was the last connection for the account
        if (activeConnections.get(accountName).size === 0) {
          if (launchedProcesses.has(accountName)) {
            const processInfo = launchedProcesses.get(accountName);
            launchedProcesses.set(accountName, {
              ...processInfo,
              hasWebSocket: false,
              visible: false // Hide from UI on error
            });
          }
        }
      }
    });
  });
  
  console.log('WebSocket server initialized');
  return wss;
}

app.get('/api/platformMode', (req, res) => {
  res.json({
    platform: process.platform,
    isMac: PLATFORM_MODE.IS_MAC,
    isWindows: PLATFORM_MODE.IS_WINDOWS
  });
});

// Update the executeScript endpoint with better error handling
app.post('/api/executeScript', (req, res) => {
  const { accountName, script } = req.body;
  
  if (!accountName || !script) {
    return res.status(400).json({
      success: false,
      message: 'Account name and script are required'
    });
  }
  
  console.log(`Execution request for ${accountName}`);
  console.log(`Active connections map has ${activeConnections.size} accounts`);
  
  if (accountName === 'all_accounts') {
    // Special case for executing on all accounts
    const results = {
      success: true,
      totalAccounts: 0,
      successfulAccounts: 0,
      failedAccounts: 0,
      message: 'Execution started on multiple accounts',
      execId: uuidv4()
    };
    
    // Execute on all accounts with active connections
    let executionPromises = [];

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }

    for (const [account, connections] of activeConnections.entries()) {
      if (connections.size > 0) {
        results.totalAccounts++;
        
        // Get first connection for this account
        const ws = Array.from(connections.values())[0];
        
        try {
          // Generate unique ID for this execution
          const execId = uuidv4();
          
          // Send execution request
          ws.send(JSON.stringify({
            type: 'execute',
            execId,
            script
          }));
          
          results.successfulAccounts++;
          console.log(`Sent script to ${account} (${execId})`);
          sleep(1000)
        } catch (error) {
          results.failedAccounts++;
          console.error(`Failed to send script to ${account}:`, error);
        }
      }
    }
    
    // Return results
    return res.json({
      ...results,
      message: `Execution started on ${results.successfulAccounts}/${results.totalAccounts} accounts`
    });
  }
  
  // Normal execution on a single account
  if (!activeConnections.has(accountName)) {
    console.log(`No connections found for ${accountName}`);
    return res.status(404).json({
      success: false,
      message: 'No active WebSocket connection for this account'
    });
  }
  
  const connections = activeConnections.get(accountName);
  if (connections.size === 0) {
    console.log(`Connections map exists for ${accountName} but is empty`);
    return res.status(404).json({
      success: false,
      message: 'No active WebSocket connection for this account'
    });
  }
  
  try {
    // Get the first connection for this account
    const ws = Array.from(connections.values())[0];
    
    // Generate a unique execution ID
    const execId = uuidv4();
    
    // Send execution request
    ws.send(JSON.stringify({
      type: 'execute',
      execId,
      script
    }));
    
    // Log the execution request
    console.log(`Script execution requested for ${accountName} (ID: ${execId})`);
    
    // Return success
    res.json({
      success: true,
      message: 'Script execution requested',
      execId
    });
  } catch (error) {
    console.error(`Error executing script for ${accountName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error executing script'
    });
  }
});

// Execute script on multiple accounts
app.post('/api/executeScriptMultiple', (req, res) => {
  const { accountNames, script } = req.body;
  
  if (!accountNames || !Array.isArray(accountNames) || accountNames.length === 0 || !script) {
    return res.status(400).json({
      success: false,
      message: 'Account names array and script are required'
    });
  }
  
  console.log(`Multiple script execution request for ${accountNames.length} accounts`);
  
  const results = {
    success: true,
    totalCount: accountNames.length,
    successCount: 0,
    failedCount: 0,
    execId: uuidv4(),
    details: []
  };
  
  // Process each account
  for (const accountName of accountNames) {
    try {
      if (!activeConnections.has(accountName) || activeConnections.get(accountName).size === 0) {
        console.log(`No active connection for ${accountName}`);
        results.failedCount++;
        results.details.push({
          account: accountName,
          success: false,
          message: 'No active WebSocket connection'
        });
        continue;
      }
      
      // Get the first connection for this account
      const ws = Array.from(activeConnections.get(accountName).values())[0];
      
      // Generate a unique execution ID for this account
      const accountExecId = uuidv4();
      
      // Send execution request
      ws.send(JSON.stringify({
        type: 'execute',
        execId: accountExecId,
        script
      }));
      
      console.log(`Sent script to ${accountName} (${accountExecId})`);
      results.successCount++;
      results.details.push({
        account: accountName,
        success: true,
        execId: accountExecId
      });
    } catch (error) {
      console.error(`Failed to send script to ${accountName}:`, error);
      results.failedCount++;
      results.details.push({
        account: accountName,
        success: false,
        message: error.message || 'Unknown error'
      });
    }
  }
  
  // Return overall results
  res.json(results);
});

// Add this endpoint for getting multiple different server IDs
app.get('/api/multipleDifferentJobIds', async (req, res) => {
  const { placeId, count = 1, chooseLowestServers = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const jobIds = await serverBrowser.getMultipleDifferentJobIds(
      placeId, 
      parseInt(count),
      chooseLowestServers === 'true'
    );
    
    if (jobIds.length === 0) {
      return res.status(404).json({ error: 'No suitable servers found' });
    }
    
    res.json({ jobIds });
  } catch (error) {
    console.error('Failed to get multiple job IDs:', error);
    res.status(500).json({ error: 'Failed to get multiple job IDs' });
  }
});

// Simplified launchMultiple endpoint that uses the single-launch endpoint
app.post('/api/launchMultiple', async (req, res) => {
  const { accounts, placeId, jobId, joinDifferentServers } = req.body;
  
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'At least one account is required' });
  }
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  // Create initial results with "pending" status
  const results = accounts.map(account => ({
    account,
    success: true,
    status: 'pending',
    message: 'Launch initiated'
  }));
  
  // Send the results immediately
  res.json(results);
  
  // Process launches in background
  (async () => {
    // If joining different servers, get server IDs first
    let jobIds = [];
    if (joinDifferentServers) {
      try {
        console.log(`Getting ${accounts.length} different servers for place ID ${placeId}...`);
        jobIds = await serverBrowser.getMultipleDifferentJobIds(placeId, accounts.length, false);
        console.log(`Found ${jobIds.length} different servers`);
      } catch (error) {
        console.error('Error getting different servers:', error);
      }
    }
    
    // Launch accounts one by one
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      try {
        console.log(`Launching account ${account} (${i+1}/${accounts.length})`);
        
        // Wait for installer to finish if it's running
        if (await isRobloxInstallerRunning()) {
          console.log(`Waiting for installer to finish before launching ${account}...`);
          let waitTime = 0;
          while (await isRobloxInstallerRunning() && waitTime < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitTime++;
          }
          console.log(`Installer finished or timeout reached (${waitTime}s)`);
        }
        
        // Determine which job ID to use
        let currentJobId = jobId;
        if (joinDifferentServers && i < jobIds.length) {
          currentJobId = jobIds[i];
          console.log(`Using server ${currentJobId} for account ${account}`);
        }
        
        // Use the same URL structure as a direct browser request to LaunchAccount
        // This way it will go through all the middleware for process tracking
        let launchUrl = `http://localhost:${config.PORT}/api/LaunchAccount?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
        if (currentJobId) {
          launchUrl += `&JobId=${encodeURIComponent(currentJobId)}`;
        }
        
        // Launch using local http request to trigger all the middleware
        await new Promise((resolve, reject) => {
          const req = http.request(launchUrl, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`Successfully launched account ${account}`);
                resolve(data);
              } else {
                reject(new Error(`Failed to launch account ${account}: ${res.statusCode}`));
              }
            });
          });
          
          req.on('error', (error) => {
            console.error(`Error launching account ${account}:`, error);
            reject(error);
          });
          
          req.end();
        });
        
        // Wait between launches
        if (i < accounts.length - 1) {
          console.log(`Waiting 5 seconds before next launch...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`Error launching account ${account}:`, error);
      }
    }
    
    console.log("All account launches completed");
  })().catch(error => {
    console.error('Error in background processing:', error);
  });
});

// Get enhanced process list
app.get('/api/processes', async (req, res) => {
  try {
    const processes = await getRobloxProcesses();
    
    // Enhance processes with account info
    const enhancedProcesses = processes.map(process => {
      const account = processToAccount.get(process.pid.toString());
      
      if (account) {
        const accountInfo = launchedProcesses.get(account);
        return {
          ...process,
          account,
          placeId: accountInfo?.placeId || '',
          jobId: accountInfo?.jobId || '',
          launchTime: accountInfo?.launchTime || null,
          status: accountInfo?.status || 'running'
        };
      }
      
      return process;
    });
    
    res.json(enhancedProcesses);
  } catch (error) {
    console.error('Failed to get processes:', error);
    res.status(500).json({ error: 'Failed to retrieve process information' });
  }
});

// Add a helper function to reset the process mapping (useful for when Roblox crashes and restarts)
app.post('/api/resetProcessMapping', (req, res) => {
  processToAccount.clear();
  
  // Update status of all launched processes
  for (const [account, info] of launchedProcesses.entries()) {
    if (info.status === 'running') {
      launchedProcesses.set(account, {
        ...info,
        status: 'stopped',
        pid: null
      });
    }
  }
  
  res.json({ success: true, message: 'Process mapping reset successfully' });
});

// Add a new endpoint to manually associate a process with an account
app.post('/api/associateProcess', (req, res) => {
  const { pid, account } = req.body;
  
  if (!pid || !account) {
    return res.status(400).json({ error: 'Both process ID and account name are required' });
  }
  
  // Check if the account exists in launchedProcesses
  if (!launchedProcesses.has(account)) {
    return res.status(404).json({ error: 'Account not found in launched processes' });
  }
  
  // Associate the process with the account
  processToAccount.set(pid.toString(), account);
  
  // Update the account's process info
  const accountInfo = launchedProcesses.get(account);
  launchedProcesses.set(account, {
    ...accountInfo,
    status: 'running',
    pid: parseInt(pid)
  });
  
  res.json({ success: true, message: `Process ${pid} associated with account ${account}` });
});

// Direct endpoint to map a process to an account
app.get('/api/mapProcess', (req, res) => {
  const { pid, account } = req.query;
  
  if (!pid || !account) {
    return res.status(400).json({ error: 'Both PID and account are required' });
  }
  
  // Map the process to account
  processToAccount.set(pid, account);
  
  // Add to launched processes if not already there
  if (!launchedProcesses.has(account)) {
    launchedProcesses.set(account, {
      account,
      placeId: req.query.placeId || 'Unknown',
      jobId: req.query.jobId || '',
      launchTime: new Date(),
      status: 'running',
      pid: parseInt(pid)
    });
  } else {
    // Update existing entry
    const existingInfo = launchedProcesses.get(account);
    launchedProcesses.set(account, {
      ...existingInfo,
      status: 'running',
      pid: parseInt(pid)
    });
  }
  
  console.log(`Manually mapped PID ${pid} to account ${account}`);
  console.log('Current process to account map:', Array.from(processToAccount.entries()));
  
  res.json({ 
    success: true, 
    message: `Process ${pid} mapped to account ${account}` 
  });
});

// Endpoint to terminate a process
app.post('/api/terminate', async (req, res) => {
  const { pid } = req.body;
  
  if (!pid) {
    return res.status(400).json({ error: 'Process ID is required' });
  }
  
  try {
    const result = await terminateProcess(pid);
    
    // Get the account associated with this PID
    const account = processToAccount.get(pid.toString());
    
    // Clean up our tracking maps
    if (account) {
      launchedProcesses.delete(account);
      processToAccount.delete(pid.toString());
    }
    
    res.json({ success: true, message: 'Process terminated successfully' });
  } catch (error) {
    console.error('Failed to terminate process:', error);
    res.status(500).json({ error: 'Failed to terminate process' });
  }
});

// Simple interceptor for launch requests
app.use('/api/LaunchAccount', (req, res, next) => {
  // Capture current PIDs before the launch
  getRobloxProcesses()
    .then(beforeProcesses => {
      // Store the PIDs of existing processes
      const beforePids = new Set(beforeProcesses.map(p => p.pid));
      
      // Store this in the request object for later use
      req.beforeProcessPids = beforePids;
      
      // Continue with the request
      next();
    })
    .catch(error => {
      console.error('Error getting processes before launch:', error);
      next();
    });
});

// Handler that runs after the launch response is sent
app.use('/api/LaunchAccount', (req, res, next) => {
  // Only process if the request was successful
  if (res.statusCode === 200) {
    const account = req.query.Account;
    const placeId = req.query.PlaceId;
    const jobId = req.query.JobId || '';
    const beforePids = req.beforeProcessPids || new Set();
    
    console.log(`Account ${account} launched successfully. Tracking process...`);
    
    // Store initial launch info
    launchedProcesses.set(account, {
      account,
      placeId,
      jobId,
      launchTime: new Date(),
      status: 'launching'
    });
    
    // Start polling for the new process
    let pollCount = 0;
    const maxPolls = 15;
    const pollInterval = 1000; // 1 second
    
    const pollForProcess = () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        console.log(`Gave up looking for process for account ${account} after ${maxPolls} attempts`);
        return;
      }
      
      getRobloxProcesses()
        .then(currentProcesses => {
          // Find processes that weren't running before
          const newProcesses = currentProcesses.filter(p => !beforePids.has(p.pid));
          
          if (newProcesses.length > 0) {
            // Take the newest process (highest PID usually)
            const process = newProcesses.sort((a, b) => b.pid - a.pid)[0];
            
            console.log(`Found new process with PID ${process.pid} for account ${account}`);
            
            // Update mappings
            processToAccount.set(process.pid.toString(), account);
            launchedProcesses.set(account, {
              ...launchedProcesses.get(account),
              status: 'running',
              pid: process.pid,
              memoryUsage: process.memoryUsage
            });
          } else {
            // Try again after a delay
            setTimeout(pollForProcess, pollInterval);
          }
        })
        .catch(error => {
          console.error('Error polling for new process:', error);
          setTimeout(pollForProcess, pollInterval);
        });
    };
    
    // Start polling after a short delay
    setTimeout(pollForProcess, 2000);
  }
  
  next();
});

// Endpoint to get our tracked processes
app.get('/api/launched', (req, res) => {
  const processes = Array.from(launchedProcesses.values());
  res.json(processes);
});

// Get servers for a place
app.get('/api/servers', async (req, res) => {
  const { placeId, pageCount = 1, sortLowest = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const servers = await serverBrowser.getServers(
      placeId, 
      parseInt(pageCount), 
      sortLowest === 'true'
    );
    res.json(servers);
  } catch (error) {
    console.error('Failed to get servers:', error);
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
});

// Get random job ID
app.get('/api/randomJobId', async (req, res) => {
  const { placeId, chooseLowestServer = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const jobId = await serverBrowser.getRandomJobId(
      placeId, 
      chooseLowestServer === 'true'
    );
    
    if (!jobId) {
      return res.status(404).json({ error: 'No suitable servers found' });
    }
    
    res.json({ jobId });
  } catch (error) {
    console.error('Failed to get random job ID:', error);
    res.status(500).json({ error: 'Failed to get random job ID' });
  }
});


app.post('/api/leaveGame', (req, res) => {
  const { accountName } = req.body;
  
  if (!accountName) {
    return res.status(400).json({
      success: false,
      message: 'Account name is required'
    });
  }
  
  console.log(`Received leave game notification for account: ${accountName}`);
  
  // Check if we have data for this account
  if (launchedProcesses.has(accountName)) {
    // Instead of updating the status, completely remove the entry
    launchedProcesses.delete(accountName);
    
    // Also check if there's a process mapping to remove
    for (const [pid, account] of processToAccount.entries()) {
      if (account === accountName) {
        processToAccount.delete(pid);
        console.log(`Removed process mapping for PID ${pid}`);
        break;
      }
    }
    
    console.log(`Removed game data for account: ${accountName}`);
    
    // Return success
    res.json({
      success: true,
      message: 'Account data removed successfully'
    });
  } else {
    // We don't have data for this account
    console.log(`No game data found for account: ${accountName}`);
    
    res.status(404).json({
      success: false,
      message: 'No game data found for the specified account'
    });
  }
});

// Endpoint to receive game data from Roblox
app.post('/api/gameData', (req, res) => {
  const { accountName, money, bankMoney, placeId, otherData, hasWebSocket } = req.body;
  
  console.log(`Received game data from ${accountName}: Money=${money}, Bank=${bankMoney}, PlaceId=${placeId}, WebSocket=${hasWebSocket}`);
  
  // Store this data with the account
  if (accountName) {
    // Create placeholder for connections if needed
    if (hasWebSocket && !activeConnections.has(accountName)) {
      activeConnections.set(accountName, new Map());
      console.log(`Created new activeConnections entry for ${accountName}`);
    }
    
    // If we have a launched process for this account, update it
    if (launchedProcesses.has(accountName)) {
      const info = launchedProcesses.get(accountName);
      
      // Get previous balance values
      const prevMoney = info.money !== undefined ? info.money : 0;
      const prevBankMoney = info.bankMoney !== undefined ? info.bankMoney : 0;
      
      // Clean and parse current money values for comparison
      let currentMoney = 0;
      let currentBankMoney = 0;
      
      // Parse money values for comparison
      if (typeof money === 'number') {
        currentMoney = money;
      } else if (typeof money === 'string') {
        // Remove currency symbols and commas, then parse as number
        const cleanedMoney = money.replace(/[$,£€]/g, '');
        currentMoney = parseFloat(cleanedMoney) || 0;
      }
      
      // Parse bank money values for comparison
      if (typeof bankMoney === 'number') {
        currentBankMoney = bankMoney;
      } else if (typeof bankMoney === 'string') {
        // Remove currency symbols and commas, then parse as number
        const cleanedBankMoney = bankMoney.replace(/[$,£€]/g, '');
        currentBankMoney = parseFloat(cleanedBankMoney) || 0;
      }
      
      // Parse previous money values for comparison if they're strings
      let parsedPrevMoney = prevMoney;
      let parsedPrevBankMoney = prevBankMoney;
      
      if (typeof prevMoney === 'string') {
        const cleanedPrevMoney = prevMoney.replace(/[$,£€]/g, '');
        parsedPrevMoney = parseFloat(cleanedPrevMoney) || 0;
      }
      
      if (typeof prevBankMoney === 'string') {
        const cleanedPrevBankMoney = prevBankMoney.replace(/[$,£€]/g, '');
        parsedPrevBankMoney = parseFloat(cleanedPrevBankMoney) || 0;
      }
      
      // Check if either pocket or bank money has increased
      const hasMoneyIncreased = currentMoney > parsedPrevMoney || currentBankMoney > parsedPrevBankMoney;
      
      // Create balance history array if it doesn't exist
      let balanceHistory = info.balanceHistory || [];
      
      // If money has increased, reset the history array completely
      if (hasMoneyIncreased) {
        balanceHistory = [true]; // Reset to a single "true" entry
        console.log(`Money increased for ${accountName}. Resetting activity counter.`);
      } else {
        // Add current status to history array (false since money didn't increase)
        balanceHistory.push(false);
        
        // Only keep the last 10 entries
        if (balanceHistory.length > 10) {
          balanceHistory.shift();
        }
      }
      
      // Determine status based on balance history
      let accountStatus;
      
      // Check if there's ANY activity in the history
      const hasAnyActivity = balanceHistory.some(changed => changed);
      
      if (hasAnyActivity) {
        // If there's any activity in the history, account is active
        accountStatus = 'running';
      } else {
        // No activity detected, check the thresholds
        if (balanceHistory.length >= 10) {
          accountStatus = 'inactive';
        } else if (balanceHistory.length >= 5) {
          accountStatus = 'warning';
        } else {
          accountStatus = 'running'; // Less than 5 inactive pings, still considered running
        }
      }
      
      // Update process info
      launchedProcesses.set(accountName, {
        ...info,
        money,
        bankMoney,
        hasWebSocket: hasWebSocket || false,
        lastUpdate: new Date(),
        otherData,
        balanceHistory,
        status: accountStatus,
        // Only set visible to true if there's an active WebSocket connection
        visible: info.hasWebSocket
      });
    } else {
      // Create a new entry if we don't have one, but only mark as visible if WebSocket connected
      launchedProcesses.set(accountName, {
        account: accountName,
        placeId,
        money,
        bankMoney,
        hasWebSocket: hasWebSocket || false,
        lastUpdate: new Date(),
        status: 'running',
        balanceHistory: [true], // Initialize with a "increased" status for first entry
        otherData,
        visible: hasWebSocket // Only visible if WebSocket is connected
      });
    }
    
    // Return success
    res.json({
      success: true,
      message: 'Data received and stored'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Account name is required'
    });
  }
});


// Endpoint to retrieve the latest game data for all accounts
app.get('/api/gameData', (req, res) => {
  const gameData = Array.from(launchedProcesses.entries())
    .filter(([_, data]) => data.visible !== false) // Only return visible accounts
    .map(([account, data]) => ({
      account,
      money: data.money !== undefined ? data.money : 0,
      bankMoney: data.bankMoney !== undefined ? data.bankMoney : 0,
      placeId: data.placeId || '',
      hasWebSocket: data.hasWebSocket,
      lastUpdate: data.lastUpdate || null,
      pid: data.pid || null,
      status: data.status || 'unknown',
      otherData: data.otherData || {},
      // Include balance history info for debugging/monitoring
      balanceHistoryLength: data.balanceHistory ? data.balanceHistory.length : 0,
      inactiveCount: data.balanceHistory ? data.balanceHistory.filter(change => !change).length : 0
    }));
  
  res.json(gameData);
});

/**
 * Function to import an account to Roblox Account Manager
 * @param {string} username - The Roblox username
 * @param {string} password - The account password
 * @returns {Promise<void>}
 */
async function importAccountToRAM(username, password) {
  // Construct the URL for adding an account to RAM
  const addAccountUrl = `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}/AddAccount?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`;
  
  // Add password if configured
  const finalUrl = config.RAM_API.PASSWORD 
    ? `${addAccountUrl}&Password=${encodeURIComponent(config.RAM_API.PASSWORD)}` 
    : addAccountUrl;
  
  // Make the request to RAM
  const response = await new Promise((resolve, reject) => {
    const req = http.request(finalUrl, { method: 'GET' }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Failed to add account to RAM: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
  
  return response;
}

// Proxy middleware configuration
const ramProxyOptions = {
  target: `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}`,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/' // Rewrite path from /api/whatever to /whatever
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add password to query parameters if configured
    if (config.RAM_API.PASSWORD) {
      const url = new URL(proxyReq.path, `http://${config.RAM_API.HOST}`);
      url.searchParams.append('Password', config.RAM_API.PASSWORD);
      proxyReq.path = url.pathname + url.search;
    }
    
    // Log the request for debugging
    console.log(`Proxying request: ${req.method} ${req.path} -> ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error connecting to Roblox Account Manager');
  }
};

// Setup proxy middleware for RAM API
app.use('/api', createProxyMiddleware(ramProxyOptions));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Any other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  console.log(`Proxying requests to Roblox Account Manager at ${config.RAM_API.HOST}:${config.RAM_API.PORT}`);
  
  // Initialize WebSocket server
  const wss = setupWebSocketServer(server);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = {app,PLATFORM_MODE};