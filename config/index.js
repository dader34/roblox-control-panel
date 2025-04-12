/**
 * Configuration file for Roblox Control Panel
 * Contains all centralized configuration settings for the application
 */

module.exports = {
    // Port for the server
    PORT: process.env.PORT || 3000,
    
    // Roblox Account Manager API settings
    RAM_API: {
      HOST: 'localhost',
      PORT: 7963, // Default RAM port, change if you've modified it in RAM
      PASSWORD: 'Whatever' // Set this if you've configured a password in RAM
    },
    
    // WebSocket settings
    WEBSOCKET: {
      PING_INTERVAL: 30000, // 30 seconds
      CONNECTION_TIMEOUT: 60000 // 1 minute
    },
    
    // Process polling settings
    PROCESS: {
      POLL_INTERVAL: 1000, // 1 second
      MAX_POLLS: 15, // Maximum number of poll attempts
      INITIAL_DELAY: 2000 // Initial delay before polling
    },
    
    // Auto-movement settings
    AUTO_MOVEMENT: {
      INTERVAL: 60000 // 60 seconds between auto-movements
    }
  };