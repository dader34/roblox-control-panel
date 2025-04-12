/**
 * Account Controller
 * Handles operations related to Roblox accounts
 */

const httpUtils = require('../utils/httpUtils');
const processService = require('../services/processService');
const webSocketService = require('../services/webSocketService');
const serverBrowserService = require('../services/serverBrowserService');
const platformService = require('../services/platformService')
const config = require('../../config');

/**
 * Launches a single Roblox account
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function launchAccount(req, res) {
  const account = req.query.Account;
  const placeId = req.query.PlaceId;
  const jobId = req.query.JobId || '';
  
  console.log(`Direct launch attempt for account: ${account}, placeId: ${placeId}`);
  
  // Make direct request to RAM
  const http = require('http');

  let url = `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}/LaunchAccount?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
  if (jobId) {
    url += `&JobId=${encodeURIComponent(jobId)}`;
  }
  if (config.RAM_API.PASSWORD) {
    url += `&Password=${encodeURIComponent(config.RAM_API.PASSWORD)}`;
  }
  
  console.log(`Making direct request to RAM: ${url}`);
  
  http.get(url, (ramRes) => {
    let data = '';
    ramRes.on('data', (chunk) => { data += chunk; });
    ramRes.on('end', () => {
      console.log(`RAM direct response: ${data}`);
      
      // Continue with the response
      res.send({
        success: true,
        message: 'Launch request processed',
        account: account,
        placeId: placeId,
        jobId: jobId || 'None',
        platform: platformService.PLATFORM_MODE

      });
    });
  }).on('error', (err) => {
    console.error(`Error making direct request to RAM: ${err.message}`);
    res.status(500).send({
      success: false,
      error: err.message
    });
  });
}

/**
 * Launches multiple Roblox accounts
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function launchMultiple(req, res) {
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
        jobIds = await serverBrowserService.getMultipleDifferentJobIds(placeId, accounts.length, false);
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
        if (await processService.isRobloxInstallerRunning()) {
          console.log(`Waiting for installer to finish before launching ${account}...`);
          await processService.waitForInstallerToComplete();
          console.log(`Installer finished or timeout reached`);
        }
        
        // Determine which job ID to use
        let currentJobId = jobId;
        if (joinDifferentServers && i < jobIds.length) {
          currentJobId = jobIds[i];
          console.log(`Using server ${currentJobId} for account ${account}`);
        }
        
        // Use the same URL structure as a direct browser request to LaunchAccount
        // This way it will go through all the middleware for process tracking
        let launchUrl = `http://localhost:${req.app.get('port')}/api/LaunchAccount?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
        if (currentJobId) {
          launchUrl += `&JobId=${encodeURIComponent(currentJobId)}`;
        }
        
        // Launch using local http request to trigger all the middleware
        await httpUtils.makeLocalRequest(launchUrl);
        
        console.log(`Successfully launched account ${account}`);
        
        // Wait between launches
        if (i < accounts.length - 1) {
          console.log(`Waiting 5 seconds before next launch...`);
          await httpUtils.sleep(5000);
        }
      } catch (error) {
        console.error(`Error launching account ${account}:`, error);
      }
    }
    
    console.log("All account launches completed");
  })().catch(error => {
    console.error('Error in background processing:', error);
  });
}

/**
 * Notifies that an account has left the game
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function leaveGame(req, res) {
  const { accountName } = req.body;
  
  if (!accountName) {
    return res.status(400).json({
      success: false,
      message: 'Account name is required'
    });
  }
  
  console.log(`Received leave game notification for account: ${accountName}`);
  
  // Remove game data for this account
  const removed = processService.removeGameData(accountName);
  
  if (removed) {
    res.json({
      success: true,
      message: 'Account data removed successfully'
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'No game data found for the specified account'
    });
  }
}

module.exports = {
  launchAccount,
  launchMultiple,
  leaveGame
};