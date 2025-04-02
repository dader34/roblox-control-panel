const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { exec } = require('child_process');
const puppeteer = require('puppeteer'); // You'll need to install this with npm
const UserAgent = require('user-agents'); // You'll need to install this with npm

// Configuration
const config = require('./config');
const serverBrowser = require('./ServerBrowser');


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

const http = require('http');

// Function to make requests to the RAM API
function apiRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.RAM_API.HOST,
      port: config.RAM_API.PORT,
      path: endpoint,
      method: 'GET'
    };

    // Add password if configured
    if (config.RAM_API.PASSWORD) {
      const urlObj = new URL(`http://${options.hostname}:${options.port}${options.path}`);
      urlObj.searchParams.append('Password', config.RAM_API.PASSWORD);
      options.path = urlObj.pathname + urlObj.search;
    }

    const req = http.request(options, (res) => {
      let data = '';

      // Handle error status codes
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`API request failed with status ${res.statusCode}`));
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Add this function to check if the Roblox Player Installer is currently running
function isRobloxInstallerRunning() {
  return new Promise((resolve, reject) => {
    exec('tasklist /fi "imagename eq RobloxPlayerInstaller.exe" /fo csv /nh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error checking installer: ${error}`);
        return reject(error);
      }
      
      // If output contains data, the installer is running

      const isRunning = !stdout.trim().startsWith('INFO')
      resolve(isRunning);
    });
  });
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
  return new Promise((resolve, reject) => {
    // Windows command to list processes
    exec('tasklist /fi "imagename eq RobloxPlayerBeta.exe" /fo csv /nh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing tasklist: ${error}`);
        return reject(error);
      }
      
      // Parse the CSV output
      const processes = stdout.trim().split('\r\n')
        .filter(line => line.length > 0)
        .map(line => {
          const parts = line.split('","');
          if (parts.length >= 2) {
            return {
              name: parts[0].replace('"', ''),
              pid: parseInt(parts[1].replace('"', '')),
              sessionName: parts[2] ? parts[2].replace('"', '') : 'Unknown',
              sessionNumber: parts[3] ? parseInt(parts[3].replace('"', '')) : 0,
              memoryUsage: parts[4] ? parts[4].replace('"', '') : 'Unknown'
            };
          }
          return null;
        })
        .filter(process => process !== null);
      
      resolve(processes);
    });
  });
}

// Function to terminate a process by PID
function terminateProcess(pid) {
  return new Promise((resolve, reject) => {
    exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error terminating process: ${error}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

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
  const { accountName, money, placeId, otherData } = req.body;
  
  console.log(`Received game data from ${accountName}: Money=${money}, PlaceId=${placeId}`);
  
  // Store this data with the account
  if (accountName) {
    // If we have a launched process for this account, update it
    if (launchedProcesses.has(accountName)) {
      const info = launchedProcesses.get(accountName);
      launchedProcesses.set(accountName, {
        ...info,
        money,
        lastUpdate: new Date(),
        otherData
      });
    } else {
      // Create a new entry if we don't have one
      launchedProcesses.set(accountName, {
        account: accountName,
        placeId,
        money,
        lastUpdate: new Date(),
        status: 'running',
        otherData
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
    .map(([account, data]) => ({
      account,
      money: data.money !== undefined ? data.money : 0,
      placeId: data.placeId || '',
      lastUpdate: data.lastUpdate || null,
      pid: data.pid || null,
      status: data.status || 'unknown',
      otherData: data.otherData || {}
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

const fs = require('fs').promises;

const proxies = [
  // You'll need to add your own reliable proxies here
  // These are just examples and will likely not work
  { host: '43.153.103.42', port: 13001, protocol: 'http' },
  { host: '201.174.175.179', port: 999, protocol: 'http' },
  { host: '103.245.205.226', port: 6969, protocol: 'http' },
  { host: '5.253.142.114', port: 1453, protocol: 'http' },
  { host: '91.107.186.37', port: 80, protocol: 'http' },
  { host: '139.9.116.150', port: 8520, protocol: 'http' },
];

// Helper function to get a random proxy from the list
function getRandomProxy() {
  if (proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

app.post('/api/createAccount', async (req, res) => {
  const { 
    username, 
    password, 
    gender = 'Male', 
    birthYear = 2000, 
    birthMonth = 1, 
    birthDay = 1, 
    useProxy = true 
  } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  let browser = null;
  
  try {
    console.log(`Starting account creation process for ${username}...`);
    
    // Get a random proxy if proxy usage is enabled
    let proxy = null;
    if (useProxy) {
      proxy = getRandomProxy();
      if (!proxy) {
        console.warn('No proxies available, proceeding without proxy');
      } else {
        console.log(`Using proxy: ${proxy.host}:${proxy.port}`);
      }
    }
    
    // Generate a random user-agent
    const userAgent = new UserAgent();
    
    // Configure Puppeteer with proxy if available
    const puppeteerOptions = {
      headless: true, // Set to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=site-per-process'
      ]
    };
    
    // Add proxy if available
    if (proxy) {
      puppeteerOptions.args.push(`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`);
    }
    
    // Launch browser
    browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    
    // Set user-agent and viewport
    await page.setUserAgent(userAgent.toString());
    await page.setViewport({ width: 1366, height: 768 });
    
    // Navigate to the signup page
    await page.goto('https://www.roblox.com/signup', { waitUntil: 'networkidle2' });
    
    // Check for cloudflare protection or captcha
    if (await page.title().then(title => title.includes('Cloudflare') || title.includes('Security'))) {
      await browser.close();
      browser = null;
      return res.status(429).json({ error: 'Cloudflare protection detected. Try again later or use a different proxy.' });
    }
    
    // Fill in the signup form
    await page.type('#signup-username', username);
    await page.type('#signup-password', password);
    
    // Set gender
    if (gender === 'Male') {
      await page.click('#MaleButton');
    } else {
      await page.click('#FemaleButton');
    }
    
    // Set birth date (Note: selectors may change based on Roblox's website structure)
    await page.select('#birthMonth', birthMonth.toString());
    await page.select('#birthDay', birthDay.toString());
    await page.select('#birthYear', birthYear.toString());
    
    // Submit the form and wait for navigation
    await Promise.all([
      page.click('#signup-button'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);
    
    // Check if registration was successful
    const currentUrl = page.url();
    if (currentUrl.includes('home') || currentUrl.includes('discover')) {
      console.log(`Successfully created account: ${username}`);
      console.log(`Account credentials: ${username}:${password}`);
      
      // Ensure the users directory exists
      const usersDir = path.join(__dirname, 'users');
      try {
        await fs.mkdir(usersDir, { recursive: true });
      } catch (mkdirErr) {
        console.error('Error creating users directory:', mkdirErr);
      }
      
      // Write user:pass to a file in the users folder
      const accountInfo = `${username}:${password}`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(usersDir, `account_${timestamp}.txt`);
      
      try {
        await fs.writeFile(filename, accountInfo);
        console.log(`Account credentials saved to ${filename}`);
        
        // Also append to a combined file
        const combinedFile = path.join(usersDir, 'all_accounts.txt');
        await fs.appendFile(combinedFile, accountInfo + '\n');
        
        await browser.close();
        browser = null;
        
        return res.status(200).json({
          success: true,
          message: 'Account created and saved to file'
        });
      } catch (fileError) {
        console.error('Error saving account info to file:', fileError);
        
        await browser.close();
        browser = null;
        
        return res.status(200).json({
          success: true,
          message: 'Account created but failed to save to file'
        });
      }
    } else {
      // Check for error messages
      const errorMessage = await page.evaluate(() => {
        const errorElement = document.querySelector('.form-group .validation-summary-errors');
        return errorElement ? errorElement.textContent.trim() : 'Unknown error occurred';
      });
      
      console.error(`Failed to create account ${username}: ${errorMessage}`);
      
      await browser.close();
      browser = null;
      
      return res.status(400).json({
        error: errorMessage || 'Failed to create account'
      });
    }
  } catch (error) {
    console.error(`Error creating account ${username}:`, error);
    
    if (browser) {
      await browser.close();
    }
    
    return res.status(500).json({
      error: 'Internal server error occurred while creating account'
    });
  }
});



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

// Start the server
const server = app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  console.log(`Proxying requests to Roblox Account Manager at ${config.RAM_API.HOST}:${config.RAM_API.PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;