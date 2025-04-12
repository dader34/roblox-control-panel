/**
 * Script Routes
 * Routes for script execution operations
 */

const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');

// POST /api/executeScript - Execute a script on a specific account
router.post('/executeScript', scriptController.executeScript);

// POST /api/executeScriptMultiple - Execute a script on multiple accounts
router.post('/executeScriptMultiple', scriptController.executeScriptMultiple);

module.exports = router;