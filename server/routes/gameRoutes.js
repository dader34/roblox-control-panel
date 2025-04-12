/**
 * Game Routes
 * Routes for game-related operations
 */

const express = require('express');
const config = require('../../config');
const router = express.Router();
const gameController = require('../controllers/gameController');

// POST /api/gameData - Update game data for an account
router.post('/gameData', gameController.updateGameData);

// GET /api/gameData - Get game data for all accounts
router.get('/gameData', gameController.getGameData);

// GET /api/servers - Get servers for a place
router.get('/servers', gameController.getServers);

// GET /api/randomJobId - Get a random job ID for a place
router.get('/randomJobId', gameController.getRandomJobId);

// GET /api/multipleDifferentJobIds - Get multiple different job IDs for a place
router.get('/multipleDifferentJobIds', gameController.getMultipleDifferentJobIds);

router.get('/testLaunch', (req, res) => {
    const { account, placeId } = req.query;
    const http = require('http');
    
    let url = `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}/LaunchAccount?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
    if (config.RAM_API.PASSWORD) {
      url += `&Password=${encodeURIComponent(config.RAM_API.PASSWORD)}`;
    }
    
    console.log(`Making direct request to RAM: ${url}`);
    
    http.get(url, (ramRes) => {
      let data = '';
      ramRes.on('data', (chunk) => { data += chunk; });
      ramRes.on('end', () => {
        console.log(`RAM direct response: ${data}`);
        res.send({
          success: true,
          ramResponse: data
        });
      });
    }).on('error', (err) => {
      console.error(`Error making direct request: ${err.message}`);
      res.status(500).send({
        success: false,
        error: err.message
      });
    });
  });

module.exports = router;