// Configuration file for Roblox Control Panel

module.exports = {
    // Port for our server
    PORT: process.env.PORT || 3000,
    
    // Roblox Account Manager API settings
    RAM_API: {
      HOST: 'localhost',
      PORT: 7963, // Default RAM port, change if you've modified it in RAM
      PASSWORD: 'Whatever' // Set this if you've configured a password in RAM
    }
  };