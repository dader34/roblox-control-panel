/**
 * Roblox Control Panel - Server
 * Main entry point for the server application
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');

// Configuration
const config = require('../config');

// Middleware
const createRamProxyMiddleware = require('./middleware/ramProxyMiddleware');
const createLaunchInterceptorMiddleware = require('./middleware/launchInterceptorMiddleware');

// Routes
const accountRoutes = require('./routes/accountRoutes');
const processRoutes = require('./routes/processRoutes');
const gameRoutes = require('./routes/gameRoutes');
const scriptRoutes = require('./routes/scriptRoutes');

// Services
const webSocketService = require('./services/webSocketService');

// Initialize Express app
const app = express();

// Store port in app settings
app.set('port', config.PORT);

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/build')));

// Create launch interceptor middleware
const launchInterceptor = createLaunchInterceptorMiddleware();

// Apply launch interceptor middleware to the LaunchAccount route
app.use('/api/LaunchAccount', launchInterceptor.preLaunchMiddleware);
app.use('/api/LaunchAccount', launchInterceptor.postLaunchMiddleware);

// Apply routes
app.use('/api', accountRoutes);
app.use('/api', processRoutes);
app.use('/api', gameRoutes);
app.use('/api', scriptRoutes);

// Add the RAM proxy middleware
app.use('/api', createRamProxyMiddleware(config));

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

// Any other routes should serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  console.log(`Proxying requests to Roblox Account Manager at ${config.RAM_API.HOST}:${config.RAM_API.PORT}`);
  
  // Initialize WebSocket server
  webSocketService.setupWebSocketServer(server);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };