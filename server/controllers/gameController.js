/**
 * Game Controller
 * Handles operations related to Roblox games and servers
 */

const processService = require('../services/processService');
const serverBrowserService = require('../services/serverBrowserService');
const webSocketService = require('../services/webSocketService');
const config = require('../../config');

/**
 * Updates game data for an account
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function updateGameData(req, res) {
  const { accountName, money, bankMoney, placeId, otherData, hasWebSocket } = req.body;
  
  console.log(`Received game data from ${accountName}: Money=${money}, Bank=${bankMoney}, PlaceId=${placeId}, WebSocket=${hasWebSocket}`);
  
  // Store this data with the account
  if (accountName) {
    // Update the game data
    processService.updateGameData(accountName, {
      money,
      bankMoney,
      placeId,
      otherData,
      hasWebSocket
    });
    
    // Check if we should execute auto-movement script
    const accountInfo = processService.launchedProcesses.get(accountName);
    if (accountInfo) {
      // Only do this if: 
      // 1. The account is inactive
      // 2. Has an active WebSocket connection
      // 3. Either:
      //    a. We've never moved this account automatically before, or
      //    b. It's been at least 60 seconds since the last auto-move
      const now = new Date();
      const lastAutoMove = accountInfo.lastAutoMove ? new Date(accountInfo.lastAutoMove) : null;
      const enoughTimePassed = !lastAutoMove || (now - lastAutoMove) > config.AUTO_MOVEMENT.INTERVAL;
      
      if (accountInfo.status === 'inactive' && accountInfo.hasWebSocket && enoughTimePassed) {
        webSocketService.sendAutoMovementScript(accountName);
      }
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
}

/**
 * Gets game data for all accounts
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function getGameData(req, res) {
  const gameData = processService.getGameData();
  res.json(gameData);
}

/**
 * Gets servers for a place
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getServers(req, res) {
  const { placeId, pageCount = 1, sortLowest = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const servers = await serverBrowserService.getServers(
      placeId, 
      parseInt(pageCount), 
      sortLowest === 'true'
    );
    res.json(servers);
  } catch (error) {
    console.error('Failed to get servers:', error);
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
}

/**
 * Gets a random job ID for a place
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getRandomJobId(req, res) {
  const { placeId, chooseLowestServer = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const jobId = await serverBrowserService.getRandomJobId(
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
}

/**
 * Gets multiple different job IDs for a place
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getMultipleDifferentJobIds(req, res) {
  const { placeId, count = 1, chooseLowestServers = false } = req.query;
  
  if (!placeId) {
    return res.status(400).json({ error: 'Place ID is required' });
  }
  
  try {
    const jobIds = await serverBrowserService.getMultipleDifferentJobIds(
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
}

module.exports = {
  updateGameData,
  getGameData,
  getServers,
  getRandomJobId,
  getMultipleDifferentJobIds
};