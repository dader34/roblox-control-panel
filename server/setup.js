/**
 * Setup script to ensure required directories exist
 */

const fs = require('fs').promises;
const path = require('path');

// Paths to create
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Ensures all required directories exist
 * @async
 */
async function setupDirectories() {
  try {
    // Check if data directory exists
    try {
      await fs.access(DATA_DIR);
      console.log('Data directory already exists');
    } catch (error) {
      // Create data directory if it doesn't exist
      console.log('Creating data directory...');
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log('Data directory created successfully');
    }
    
    console.log('Directory setup complete');
  } catch (error) {
    console.error('Error setting up directories:', error);
  }
}

// If this script is run directly, execute the setup
if (require.main === module) {
  setupDirectories();
}

module.exports = {
  setupDirectories
};