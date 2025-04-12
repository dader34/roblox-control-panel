/**
 * Process Routes
 * Routes for process-related operations
 */

const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');

// GET /api/platformMode - Get platform information
router.get('/platformMode', processController.getPlatformInfo);

// GET /api/processes - Get all processes
router.get('/processes', processController.getProcesses);

// POST /api/resetProcessMapping - Reset process mapping
router.post('/resetProcessMapping', processController.resetProcessMapping);

// POST /api/associateProcess - Associate a process with an account
router.post('/associateProcess', processController.associateProcess);

// GET /api/mapProcess - Map a process to an account
router.get('/mapProcess', processController.mapProcess);

// POST /api/terminate - Terminate a process
router.post('/terminate', processController.terminateProcess);

// GET /api/launched - Get all launched processes
router.get('/launched', processController.getLaunchedProcesses);

module.exports = router;