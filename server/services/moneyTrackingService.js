/**
 * Money Tracking Service
 * Handles tracking and analyzing money changes for accounts
 */

const fs = require('fs/promises');
const path = require('path');

// File path for storing tracking data
const TRACKING_FILE = path.join(__dirname, '..', 'data', 'money_tracking.json');

// Ensure the data directory exists
async function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating data directory:', error);
      throw error;
    }
  }
}

/**
 * Save tracking data to file
 * @param {Object} data - Tracking data to save
 * @returns {Promise<boolean>} - Whether save was successful
 */
async function saveTrackingData(data) {
  try {
    await ensureDataDirectory();
    
    // Save data to file
    await fs.writeFile(
      TRACKING_FILE, 
      JSON.stringify(data, null, 2), 
      'utf8'
    );
    
    console.log('Money tracking data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving money tracking data:', error);
    return false;
  }
}

/**
 * Load tracking data from file
 * @returns {Promise<Object>} - Loaded tracking data
 */
async function loadTrackingData() {
  try {
    await ensureDataDirectory();
    
    // Check if file exists
    try {
      await fs.access(TRACKING_FILE);
    } catch (error) {
      // File doesn't exist yet - create empty data structure
      const emptyData = {
        accounts: {},
        lastUpdate: new Date().toISOString()
      };
      await saveTrackingData(emptyData);
      return emptyData;
    }
    
    // Read and parse data
    const rawData = await fs.readFile(TRACKING_FILE, 'utf8');
    
    // Handle empty file case
    if (!rawData || rawData.trim() === '') {
      console.warn('Money tracking file was empty, initializing with default data');
      const defaultData = {
        accounts: {},
        lastUpdate: new Date().toISOString()
      };
      await saveTrackingData(defaultData);
      return defaultData;
    }
    
    try {
      // Try to parse the data
      return JSON.parse(rawData);
    } catch (error) {
      // Handle corrupted JSON
      console.error('Money tracking data corrupted, initializing with default data');
      const defaultData = {
        accounts: {},
        lastUpdate: new Date().toISOString()
      };
      await saveTrackingData(defaultData);
      return defaultData;
    }
  } catch (error) {
    console.error('Error loading money tracking data:', error);
    // Return an empty data structure as fallback
    return {
      accounts: {},
      lastUpdate: new Date().toISOString()
    };
  }
}

/**
 * Update money tracking for an account
 * @param {string} accountName - Account name
 * @param {number|string} money - Pocket money value
 * @param {number|string} bankMoney - Bank money value
 * @returns {Promise<Object>} - Updated tracking data for the account
 */
async function updateAccountMoney(accountName, money, bankMoney) {
  try {
    // Parse values to ensure we're working with numbers
    const pocketValue = parseMoneyValue(money);
    const bankValue = parseMoneyValue(bankMoney);
    const currentTotal = pocketValue + bankValue;
    const timestamp = new Date();
    
    // Load current tracking data
    const trackingData = await loadTrackingData();
    
    // Initialize account data if it doesn't exist
    if (!trackingData.accounts[accountName]) {
      trackingData.accounts[accountName] = {
        timestamps: [],
        pocketValues: [],
        bankValues: [],
        totalValues: [],
        lastUpdate: null,
        earnings: 0,
        earningRate: 0,
        sessionStart: timestamp.toISOString()
      };
    }
    
    const account = trackingData.accounts[accountName];
    
    // Check if we have previous values to compare with
    if (account.timestamps.length > 0) {
      const prevPocket = account.pocketValues[account.pocketValues.length - 1];
      const prevBank = account.bankValues[account.bankValues.length - 1];
      const prevTotal = prevPocket + prevBank;
      
      // Calculate earnings if total increased
      if (currentTotal > prevTotal) {
        account.earnings += (currentTotal - prevTotal);
        
        // Calculate time difference in hours since session start
        const sessionStartTime = new Date(account.sessionStart).getTime();
        const hoursActive = (timestamp.getTime() - sessionStartTime) / (1000 * 60 * 60);
        
        // Update earning rate (earnings per hour)
        if (hoursActive > 0) {
          account.earningRate = account.earnings / hoursActive;
        }
      }
    }
    
    // Add current values to history (limit to last 50 entries to avoid file bloat)
    if (account.timestamps.length >= 50) {
      account.timestamps.shift();
      account.pocketValues.shift();
      account.bankValues.shift();
      account.totalValues.shift();
    }
    
    // Add current reading
    account.timestamps.push(timestamp.toISOString());
    account.pocketValues.push(pocketValue);
    account.bankValues.push(bankValue);
    account.totalValues.push(currentTotal);
    account.lastUpdate = timestamp.toISOString();
    
    // Update global last update time
    trackingData.lastUpdate = timestamp.toISOString();
    
    // Save updated data
    await saveTrackingData(trackingData);
    
    // Return updated account data
    return account;
  } catch (error) {
    console.error(`Error updating money for account ${accountName}:`, error);
    throw error;
  }
}

/**
 * Clean and parse money values
 * @param {string|number} value - Money value to parse
 * @returns {number} - Parsed numeric value
 */
function parseMoneyValue(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanedValue = value.toString().replace(/[$,£€\s]/g, '');
  return parseFloat(cleanedValue) || 0;
}

/**
 * Get tracking data for all accounts
 * @returns {Promise<Object>} - All tracking data
 */
async function getAllTrackingData() {
  return await loadTrackingData();
}

/**
 * Get earnings summary statistics
 * @returns {Promise<Object>} - Earnings summary data
 */
async function getEarningsSummary() {
  try {
    const trackingData = await loadTrackingData();
    const accounts = trackingData.accounts;
    
    // Calculate total earnings
    let totalEarnings = 0;
    let totalRates = 0;
    let activeAccounts = 0;
    
    // Top earners data
    const topEarners = [];
    
    // Process each account
    for (const [accountName, accountData] of Object.entries(accounts)) {
      if (accountData.earnings > 0) {
        totalEarnings += accountData.earnings;
        totalRates += accountData.earningRate || 0;
        activeAccounts++;
        
        topEarners.push({
          accountName,
          earnings: accountData.earnings,
          earningRate: accountData.earningRate || 0,
          lastUpdate: accountData.lastUpdate
        });
      }
    }
    
    // Sort top earners by earnings
    topEarners.sort((a, b) => b.earnings - a.earnings);
    
    // Calculate session duration for each account
    const accountDurations = {};
    for (const [accountName, accountData] of Object.entries(accounts)) {
      if (accountData.sessionStart) {
        const sessionStartTime = new Date(accountData.sessionStart).getTime();
        const currentTime = new Date().getTime();
        const durationMs = currentTime - sessionStartTime;
        accountDurations[accountName] = durationMs;
      }
    }
    
    // Determine earliest session start (global session duration)
    let globalSessionStart = Date.now();
    for (const [accountName, accountData] of Object.entries(accounts)) {
      if (accountData.sessionStart) {
        const sessionStartTime = new Date(accountData.sessionStart).getTime();
        if (sessionStartTime < globalSessionStart) {
          globalSessionStart = sessionStartTime;
        }
      }
    }
    
    const globalSessionDuration = Date.now() - globalSessionStart;
    const globalSessionHours = globalSessionDuration / (1000 * 60 * 60);
    
    // Calculate global earning rate
    const globalEarningRate = globalSessionHours > 0 
      ? totalEarnings / globalSessionHours 
      : 0;
    
    return {
      totalEarnings,
      averageRate: activeAccounts > 0 ? totalRates / activeAccounts : 0,
      activeAccounts,
      globalEarningRate,
      globalSessionDuration,
      topEarners: topEarners.slice(0, 5), // Return top 5 earners
      accountDurations
    };
  } catch (error) {
    console.error('Error generating earnings summary:', error);
    return {
      totalEarnings: 0,
      averageRate: 0,
      activeAccounts: 0,
      globalEarningRate: 0,
      globalSessionDuration: 0,
      topEarners: [],
      accountDurations: {}
    };
  }
}

/**
 * Reset session for an account
 * @param {string} accountName - Account name
 * @returns {Promise<Object>} - Updated account data
 */
async function resetAccountSession(accountName) {
  try {
    const trackingData = await loadTrackingData();
    
    if (trackingData.accounts[accountName]) {
      // Keep history but reset earnings and session start time
      trackingData.accounts[accountName].earnings = 0;
      trackingData.accounts[accountName].earningRate = 0;
      trackingData.accounts[accountName].sessionStart = new Date().toISOString();
      
      // Save updated data
      await saveTrackingData(trackingData);
    }
    
    return trackingData.accounts[accountName] || null;
  } catch (error) {
    console.error(`Error resetting session for account ${accountName}:`, error);
    throw error;
  }
}

/**
 * Reset tracking for all accounts
 * @returns {Promise<boolean>} - Whether reset was successful
 */
async function resetAllTracking() {
  try {
    const emptyData = {
      accounts: {},
      lastUpdate: new Date().toISOString()
    };
    
    await saveTrackingData(emptyData);
    return true;
  } catch (error) {
    console.error('Error resetting tracking data:', error);
    return false;
  }
}

module.exports = {
  updateAccountMoney,
  getAllTrackingData,
  getEarningsSummary,
  resetAccountSession,
  resetAllTracking
};