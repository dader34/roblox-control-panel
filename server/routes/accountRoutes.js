/**
 * Account Routes
 * Routes for account-related operations
 */

const express = require('express');
const router = express.Router();
const config = require('../../config');
const accountController = require('../controllers/accountController');

// GET /api/LaunchAccount - Launch a single account
router.get('/LaunchAccount', accountController.launchAccount);

// POST /api/launchMultiple - Launch multiple accounts
router.post('/launchMultiple', accountController.launchMultiple);

// POST /api/leaveGame - Notify that an account left the game
router.post('/leaveGame', accountController.leaveGame);

module.exports = router;