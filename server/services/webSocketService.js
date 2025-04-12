/**
 * WebSocket Service
 * Handles WebSocket connections with Roblox instances
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const processService = require('./processService');

// Store active WebSocket connections for each account
const activeConnections = new Map();

/**
 * Sets up the WebSocket server
 * @param {object} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
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
        if (ws.accountName) {
          processService.markAccountDisconnected(ws.accountName);
        }
        
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, config.WEBSOCKET.PING_INTERVAL);
  
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
          
          // Mark the process as having a WebSocket connection
          const processInfo = processService.launchedProcesses.get(accountName);
          if (processInfo) {
            processService.updateGameData(accountName, {
              ...processInfo,
              hasWebSocket: true,
              visible: true
            });
          } else {
            // Create a minimal entry if none exists
            processService.updateGameData(accountName, {
              hasWebSocket: true,
              visible: true,
              status: 'unknown'
            });
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
            const processInfo = processService.launchedProcesses.get(accountName);
            if (processInfo) {
              processService.updateGameData(accountName, {
                ...processInfo,
                hasWebSocket: true,
                visible: true
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
          processService.markAccountDisconnected(accountName);
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
          processService.markAccountDisconnected(accountName);
        }
      }
    });
  });
  
  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Executes a script on a specific account
 * @param {string} accountName - Account name
 * @param {string} script - Script to execute
 * @returns {Promise<object>} Result of the execution
 */
function executeScript(accountName, script) {
  return new Promise((resolve, reject) => {
    if (!accountName || !script) {
      return reject(new Error('Account name and script are required'));
    }
    
    console.log(`Execution request for ${accountName}`);
    
    if (!activeConnections.has(accountName) || activeConnections.get(accountName).size === 0) {
      return reject(new Error('No active WebSocket connection for this account'));
    }
    
    try {
      // Get the first connection for this account
      const ws = Array.from(activeConnections.get(accountName).values())[0];
      
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
      resolve({
        success: true,
        message: 'Script execution requested',
        execId
      });
    } catch (error) {
      console.error(`Error executing script for ${accountName}:`, error);
      reject(error);
    }
  });
}

/**
 * Executes a script on all active accounts
 * @param {string} script - Script to execute
 * @returns {Promise<object>} Result of the execution
 */
function executeScriptOnAllAccounts(script) {
  return new Promise((resolve) => {
    if (!script) {
      return resolve({
        success: false,
        message: 'Script is required'
      });
    }
    
    const results = {
      success: true,
      totalAccounts: 0,
      successfulAccounts: 0,
      failedAccounts: 0,
      message: 'Execution started on multiple accounts',
      execId: uuidv4()
    };
    
    // Execute on all accounts with active connections
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
        } catch (error) {
          results.failedAccounts++;
          console.error(`Failed to send script to ${account}:`, error);
        }
      }
    }
    
    // Return results
    resolve({
      ...results,
      message: `Execution started on ${results.successfulAccounts}/${results.totalAccounts} accounts`
    });
  });
}

/**
 * Executes a script on multiple specific accounts
 * @param {string[]} accountNames - Array of account names
 * @param {string} script - Script to execute
 * @returns {Promise<object>} Result of the execution
 */
function executeScriptOnMultipleAccounts(accountNames, script) {
  return new Promise((resolve, reject) => {
    if (!accountNames || !Array.isArray(accountNames) || accountNames.length === 0 || !script) {
      return reject(new Error('Account names array and script are required'));
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
    resolve(results);
  });
}

/**
 * Sends auto-movement script to an inactive account
 * @param {string} accountName - Account name
 */
function sendAutoMovementScript(accountName) {
  // Auto-movement script to execute when an account is inactive
  const moveForwardScript = `
-- Script to walk forward one block in Roblox
-- Get the player and humanoid
local player = game.Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
-- Define the distance of one block (4 studs is roughly one block in Roblox)
local blockDistance = 4
-- Get current position and orientation
local hrp = character:WaitForChild("HumanoidRootPart")
local currentPos = hrp.Position
local lookVector = hrp.CFrame.LookVector
-- Calculate the target position (one block forward)
local targetPos = currentPos + (lookVector.Unit * blockDistance)
-- Walk to the target position
humanoid:MoveTo(targetPos)
-- Optional: wait until the movement is complete
humanoid.MoveToFinished:Wait()
print("Moved forward one block!")
`;

  try {
    // Check if we have a connection for this account
    if (!activeConnections.has(accountName) || activeConnections.get(accountName).size === 0) {
      console.log(`WebSocket connection not found for ${accountName} despite hasWebSocket flag.`);
      return false;
    }
    
    // Get the first connection for this account
    const ws = Array.from(activeConnections.get(accountName).values())[0];
    
    // Generate a unique execution ID
    const execId = uuidv4();
    
    // Send the script execution request
    ws.send(JSON.stringify({
      type: 'execute',
      execId,
      script: moveForwardScript
    }));
    
    console.log(`Auto-movement script sent to ${accountName} (ExecID: ${execId})`);
    
    // Update the last auto-move timestamp
    processService.updateLastAutoMove(accountName);
    
    return true;
  } catch (error) {
    console.error(`Error sending auto-movement script to ${accountName}:`, error);
    return false;
  }
}

/**
 * Checks if an account has an active WebSocket connection
 * @param {string} accountName - Account name
 * @returns {boolean} True if the account has an active connection
 */
function hasActiveConnection(accountName) {
  return activeConnections.has(accountName) && activeConnections.get(accountName).size > 0;
}

/**
 * Gets all accounts with active connections
 * @returns {string[]} List of account names with active connections
 */
function getActiveAccounts() {
  return Array.from(activeConnections.keys())
    .filter(account => activeConnections.get(account).size > 0);
}

module.exports = {
  setupWebSocketServer,
  executeScript,
  executeScriptOnAllAccounts,
  executeScriptOnMultipleAccounts,
  sendAutoMovementScript,
  hasActiveConnection,
  getActiveAccounts,
  // Export the connections map for direct access
  activeConnections
};