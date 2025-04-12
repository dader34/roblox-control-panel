/**
 * Process Service
 * Handles operations related to processes including listing, terminating, and tracking
 */

const { exec } = require('child_process');
const platformService = require('./platformService');

// Process tracking maps
const launchedProcesses = new Map();
const processToAccount = new Map();

/**
 * Gets processes by name
 * @param {string} processName - Name of the process to search for
 * @returns {Promise<Array>} List of processes that match the name
 */
function getProcesses(processName) {
  return new Promise((resolve, reject) => {
    const command = platformService.getProcessListCommand(processName);

    exec(command, (error, stdout, stderr) => {
      // On Mac/Linux, pgrep returns non-zero exit code if no processes found
      if (error && (error.code !== 1 || stderr)) {
        console.error(`Error executing process list: ${error}`);
        return reject(error);
      }
      
      let processes = [];
      
      if (platformService.PLATFORM_MODE.IS_WINDOWS) {
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

/**
 * Checks if a process is running
 * @param {string|string[]} processNames - Names of the processes to check
 * @returns {Promise<boolean>} True if any of the processes are running
 */
function isProcessRunning(processNames) {
  // Ensure processNames is an array
  const names = Array.isArray(processNames) ? processNames : [processNames];
  
  return new Promise((resolve) => {
    const command = platformService.PLATFORM_MODE.IS_WINDOWS
      ? `tasklist /fi "imagename eq ${names[0]}" /fo csv /nh`
      : `pgrep -f "${names[0]}"`;

    exec(command, (error, stdout) => {
      // Explicitly resolve based on output, not error
      if (platformService.PLATFORM_MODE.IS_WINDOWS) {
        // Windows: check if output exists and doesn't start with INFO
        resolve(stdout.trim().length > 0 && !stdout.trim().startsWith('INFO'));
      } else {
        // Mac/Linux: check if pgrep returned any PIDs
        resolve(stdout.trim().length > 0);
      }
    });
  });
}

/**
 * Checks if the Roblox installer is currently running
 * @returns {Promise<boolean>} True if the installer is running
 */
function isRobloxInstallerRunning() {
  const installerNames = platformService.getRobloxInstallerNames();
  return isProcessRunning(installerNames);
}

/**
 * Waits for the Roblox installer to complete
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if the installer completed, false if timed out
 */
async function waitForInstallerToComplete(timeout = 30000) {
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

/**
 * Gets running Roblox processes
 * @returns {Promise<Array>} List of running Roblox processes
 */
function getRobloxProcesses() {
  const processName = platformService.getRobloxProcessName();
  return getProcesses(processName);
}

/**
 * Terminates a process by PID
 * @param {number} pid - Process ID to terminate
 * @returns {Promise<string>} Command output
 */
function terminateProcess(pid) {
  return new Promise((resolve, reject) => {
    const command = platformService.getTerminateProcessCommand(pid);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error terminating process: ${error}`);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

/**
 * Associates a process with an account
 * @param {number} pid - Process ID
 * @param {string} account - Account name
 * @param {object} additionalInfo - Additional information about the process
 */
function associateProcess(pid, account, additionalInfo = {}) {
  const pidStr = pid.toString();
  
  // Map the process to the account
  processToAccount.set(pidStr, account);
  
  // Update or create launched process entry
  if (launchedProcesses.has(account)) {
    const existingInfo = launchedProcesses.get(account);
    launchedProcesses.set(account, {
      ...existingInfo,
      status: 'running',
      pid: parseInt(pid),
      ...additionalInfo
    });
  } else {
    launchedProcesses.set(account, {
      account,
      status: 'running',
      pid: parseInt(pid),
      launchTime: new Date(),
      ...additionalInfo
    });
  }
  
  console.log(`Process ${pid} associated with account ${account}`);
}

/**
 * Gets the enhanced list of processes with account information
 * @returns {Promise<Array>} List of processes with enhanced information
 */
async function getEnhancedProcessList() {
  try {
    const processes = await getRobloxProcesses();
    
    // Enhance processes with account info
    return processes.map(process => {
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
  } catch (error) {
    console.error('Failed to get enhanced process list:', error);
    throw error;
  }
}

/**
 * Resets the process mapping
 * Useful for when Roblox crashes and restarts
 */
function resetProcessMapping() {
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
  
  console.log('Process mapping reset successfully');
}

/**
 * Updates game data for an account
 * @param {string} accountName - Account name
 * @param {object} data - Game data to update
 */
function updateGameData(accountName, data) {
  const { money, bankMoney, placeId, otherData, hasWebSocket } = data;
  
  // Store this data with the account
  if (accountName) {
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
        lastAutoMove: info.lastAutoMove || null, // Keep track of when we last auto-moved
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
  }
}

/**
 * Gets all launched processes
 * @param {boolean} visibleOnly - If true, only return visible processes
 * @returns {Array} List of launched processes
 */
function getLaunchedProcesses(visibleOnly = false) {
  const processes = Array.from(launchedProcesses.values());
  
  if (visibleOnly) {
    return processes.filter(process => process.visible !== false);
  }
  
  return processes;
}

/**
 * Gets game data for all accounts
 * @returns {Array} List of game data for all accounts
 */
function getGameData() {
  return Array.from(launchedProcesses.entries())
    .filter(([_, data]) => data.visible !== false) // Only return visible accounts
    .map(([account, data]) => ({
      account,
      money: data.money !== undefined ? data.money : 0,
      bankMoney: data.bankMoney !== undefined ? data.bankMoney : 0,
      placeId: data.placeId || '',
      hasWebSocket: data.hasWebSocket,
      lastUpdate: data.lastUpdate || null,
      lastAutoMove: data.lastAutoMove || null,
      pid: data.pid || null,
      status: data.status || 'unknown',
      otherData: data.otherData || {},
      // Include balance history info for debugging/monitoring
      balanceHistoryLength: data.balanceHistory ? data.balanceHistory.length : 0,
      inactiveCount: data.balanceHistory ? data.balanceHistory.filter(change => !change).length : 0,
      // Add helpful flag to indicate if there's any activity in the history
      hasRecentActivity: data.balanceHistory ? data.balanceHistory.some(change => change) : true
    }));
}

/**
 * Marks an account as disconnected
 * @param {string} accountName - Account name
 */
function markAccountDisconnected(accountName) {
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

/**
 * Removes game data for an account
 * @param {string} accountName - Account name
 * @returns {boolean} True if data was found and removed
 */
function removeGameData(accountName) {
  if (launchedProcesses.has(accountName)) {
    // Remove the entry
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
    return true;
  }
  
  return false;
}

/**
 * Updates the last auto-move timestamp for an account
 * @param {string} accountName - Account name
 */
function updateLastAutoMove(accountName) {
  if (launchedProcesses.has(accountName)) {
    const updatedInfo = launchedProcesses.get(accountName);
    launchedProcesses.set(accountName, {
      ...updatedInfo,
      lastAutoMove: new Date()
    });
  }
}

// Export the functions
module.exports = {
  getProcesses,
  isProcessRunning,
  isRobloxInstallerRunning,
  waitForInstallerToComplete,
  getRobloxProcesses,
  terminateProcess,
  associateProcess,
  getEnhancedProcessList,
  resetProcessMapping,
  updateGameData,
  getLaunchedProcesses,
  getGameData,
  markAccountDisconnected,
  removeGameData,
  updateLastAutoMove,
  // Export the maps for other modules that need direct access
  launchedProcesses,
  processToAccount
};