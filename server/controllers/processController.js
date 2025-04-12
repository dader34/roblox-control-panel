/**
 * Process Controller
 * Handles operations related to processes
 */

const processService = require('../services/processService');
const platformService = require('../services/platformService');

/**
 * Gets platform information
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getPlatformInfo(req, res) {
  res.json({
    platform: process.platform,
    isMac: platformService.PLATFORM_MODE.IS_MAC,
    isWindows: platformService.PLATFORM_MODE.IS_WINDOWS
  });
}

/**
 * Gets all Roblox processes
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getProcesses(req, res) {
  try {
    const processes = await processService.getEnhancedProcessList();
    res.json(processes);
  } catch (error) {
    console.error('Failed to get processes:', error);
    res.status(500).json({ error: 'Failed to retrieve process information' });
  }
}

/**
 * Resets the process mapping
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function resetProcessMapping(req, res) {
  processService.resetProcessMapping();
  res.json({ success: true, message: 'Process mapping reset successfully' });
}

/**
 * Associates a process with an account
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function associateProcess(req, res) {
  const { pid, account } = req.body;
  
  if (!pid || !account) {
    return res.status(400).json({ error: 'Both process ID and account name are required' });
  }
  
  // Check if the account exists in launchedProcesses
  if (!processService.launchedProcesses.has(account)) {
    return res.status(404).json({ error: 'Account not found in launched processes' });
  }
  
  // Associate the process with the account
  processService.associateProcess(pid, account);
  
  res.json({ success: true, message: `Process ${pid} associated with account ${account}` });
}

/**
 * Maps a process to an account
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function mapProcess(req, res) {
  const { pid, account } = req.query;
  
  if (!pid || !account) {
    return res.status(400).json({ error: 'Both PID and account are required' });
  }
  
  // Map the process to account with additional info
  processService.associateProcess(pid, account, {
    placeId: req.query.placeId || 'Unknown',
    jobId: req.query.jobId || '',
    launchTime: new Date(),
    status: 'running'
  });
  
  res.json({ 
    success: true, 
    message: `Process ${pid} mapped to account ${account}` 
  });
}

/**
 * Terminates a process
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function terminateProcess(req, res) {
  const { pid } = req.body;
  
  if (!pid) {
    return res.status(400).json({ error: 'Process ID is required' });
  }
  
  try {
    const result = await processService.terminateProcess(pid);
    
    // Get the account associated with this PID
    const account = processService.processToAccount.get(pid.toString());
    
    // Clean up our tracking maps
    if (account) {
      processService.removeGameData(account);
    }
    
    res.json({ success: true, message: 'Process terminated successfully' });
  } catch (error) {
    console.error('Failed to terminate process:', error);
    res.status(500).json({ error: 'Failed to terminate process' });
  }
}

/**
 * Gets all launched processes
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getLaunchedProcesses(req, res) {
  const processes = processService.getLaunchedProcesses();
  res.json(processes);
}

module.exports = {
  getPlatformInfo,
  getProcesses,
  resetProcessMapping,
  associateProcess,
  mapProcess,
  terminateProcess,
  getLaunchedProcesses
};