/**
 * HTTP Utilities
 * Helper functions for HTTP operations
 */

const http = require('http');

/**
 * Makes an HTTP request to a local endpoint
 * @param {string} url - Local URL to request
 * @returns {Promise<string>} Response data
 */
function makeLocalRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Imports an account to Roblox Account Manager
 * @param {string} username - The Roblox username
 * @param {string} password - The account password
 * @param {object} config - Configuration with RAM API settings
 * @returns {Promise<string>} Response from RAM
 */
async function importAccountToRAM(username, password, config) {
  // Construct the URL for adding an account to RAM
  const addAccountUrl = `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}/AddAccount?Username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`;
  
  // Add password if configured
  const finalUrl = config.RAM_API.PASSWORD 
    ? `${addAccountUrl}&Password=${encodeURIComponent(config.RAM_API.PASSWORD)}` 
    : addAccountUrl;
  
  // Make the request to RAM
  return makeLocalRequest(finalUrl);
}

/**
 * Helper function to sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  makeLocalRequest,
  importAccountToRAM,
  sleep
};