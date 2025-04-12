/**
 * Script Controller
 * Handles operations related to script execution
 */

const webSocketService = require('../services/webSocketService');

/**
 * Executes a script on a specific account
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function executeScript(req, res) {
  const { accountName, script } = req.body;
  
  if (!accountName || !script) {
    return res.status(400).json({
      success: false,
      message: 'Account name and script are required'
    });
  }
  
  console.log(`Execution request for ${accountName}`);
  
  // Special case for executing on all accounts
  if (accountName === 'all_accounts') {
    try {
      const result = await webSocketService.executeScriptOnAllAccounts(script);
      return res.json(result);
    } catch (error) {
      console.error('Error executing script on all accounts:', error);
      return res.status(500).json({
        success: false,
        message: 'Error executing script'
      });
    }
  }
  
  // Normal execution on a single account
  try {
    const result = await webSocketService.executeScript(accountName, script);
    res.json(result);
  } catch (error) {
    console.error(`Error executing script for ${accountName}:`, error);
    res.status(error.message.includes('No active WebSocket') ? 404 : 500).json({
      success: false,
      message: error.message || 'Error executing script'
    });
  }
}

/**
 * Executes a script on multiple accounts
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function executeScriptMultiple(req, res) {
  const { accountNames, script } = req.body;
  
  if (!accountNames || !Array.isArray(accountNames) || accountNames.length === 0 || !script) {
    return res.status(400).json({
      success: false,
      message: 'Account names array and script are required'
    });
  }
  
  console.log(`Multiple script execution request for ${accountNames.length} accounts`);
  
  try {
    const results = await webSocketService.executeScriptOnMultipleAccounts(accountNames, script);
    res.json(results);
  } catch (error) {
    console.error('Error executing script on multiple accounts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error executing script on multiple accounts'
    });
  }
}

module.exports = {
  executeScript,
  executeScriptMultiple
};