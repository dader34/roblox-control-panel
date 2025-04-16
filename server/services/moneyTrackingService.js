/**
 * Money Tracking Service
 * Handles tracking of money earned by accounts over time
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../../config');

// File path for storing money tracking data
const MONEY_TRACKING_FILE = path.join(__dirname, '../../data/money_tracking.json');

// In-memory cache of tracking data
let trackingData = null;

/**
 * Ensures the tracking file exists, creates it if not
 * @async
 * @returns {Promise<void>}
 */
async function ensureTrackingFile() {
  try {
    await fs.access(MONEY_TRACKING_FILE);
  } catch (error) {
    // If file doesn't exist, create it with default structure
    const defaultData = {
      accounts: {},
      lastUpdate: new Date().toISOString()
    };
    
    // Create directory if it doesn't exist
    const dir = path.dirname(MONEY_TRACKING_FILE);
    await fs.mkdir(dir, { recursive: true });
    
    // Write default data to file
    await fs.writeFile(MONEY_TRACKING_FILE, JSON.stringify(defaultData, null, 2));
  }
}

/**
 * Loads tracking data from file
 * @async
 * @returns {Promise<Object>} Tracking data object
 */
async function loadTrackingData() {
  if (trackingData !== null) {
    return trackingData; // Return cached data if available
  }
  
  try {
    await ensureTrackingFile();
    const data = await fs.readFile(MONEY_TRACKING_FILE, 'utf8');
    trackingData = JSON.parse(data);
    return trackingData;
  } catch (error) {
    console.error('Error loading money tracking data:', error);
    // Return empty structure if file can't be loaded
    trackingData = { accounts: {}, lastUpdate: new Date().toISOString() };
    return trackingData;
  }
}

/**
 * Saves tracking data to file
 * @async
 * @param {Object} data - Tracking data to save
 * @returns {Promise<void>}
 */
async function saveTrackingData(data) {
  try {
    await ensureTrackingFile();
    await fs.writeFile(MONEY_TRACKING_FILE, JSON.stringify(data, null, 2));
    trackingData = data; // Update cache
  } catch (error) {
    console.error('Error saving money tracking data:', error);
  }
}

/**
 * Initializes tracking for a new account if it doesn't exist
 * @async
 * @param {string} accountName - Account name to initialize
 * @returns {Promise<void>}
 */
async function initializeAccount(accountName) {
  const data = await loadTrackingData();
  
  if (!data.accounts[accountName]) {
    data.accounts[accountName] = {
      totalEarned: 0,
      startingMoney: null,
      startingBankMoney: null,
      currentMoney: 0,
      currentBankMoney: 0,
      history: [],
      lastUpdate: new Date().toISOString()
    };
    
    await saveTrackingData(data);
  }
}

/**
 * Updates money tracking data for an account
 * @async
 * @param {string} accountName - Account name to update
 * @param {number|string} money - Current pocket money value
 * @param {number|string} bankMoney - Current bank money value
 * @returns {Promise<Object>} Updated account tracking data
 */
async function updateAccountMoney(accountName, money, bankMoney) {
  // Parse numeric values from string if needed
  const currentMoney = typeof money === 'string' 
    ? parseFloat(money.replace(/[$,£€]/g, '')) || 0 
    : money || 0;
    
  const currentBankMoney = typeof bankMoney === 'string'
    ? parseFloat(bankMoney.replace(/[$,£€]/g, '')) || 0
    : bankMoney || 0;
  
  // Load current data
  const data = await loadTrackingData();
  
  // Initialize account if not exists
  if (!data.accounts[accountName]) {
    await initializeAccount(accountName);
  }
  
  const account = data.accounts[accountName];
  
  // Set starting values if not already set
  if (account.startingMoney === null) {
    account.startingMoney = currentMoney;
  }
  
  if (account.startingBankMoney === null) {
    account.startingBankMoney = currentBankMoney;
  }
  
  // Calculate new earnings based on the difference from previous values
  let earned = 0;
  
  // Calculate current total (pocket + bank)
  const previousTotal = account.currentMoney + account.currentBankMoney;
  const currentTotal = currentMoney + currentBankMoney;
  
  // If current total is higher, add the difference to earnings
  if (currentTotal > previousTotal) {
    earned = currentTotal - previousTotal;
    account.totalEarned += earned;
  }
  
  // Update current values
  account.currentMoney = currentMoney;
  account.currentBankMoney = currentBankMoney;
  
  // Add entry to history if there was a change
  if (earned > 0) {
    account.history.push({
      timestamp: new Date().toISOString(),
      earned: earned,
      newTotal: currentTotal
    });
    
    // Limit history size to prevent file growth
    if (account.history.length > 100) {
      account.history = account.history.slice(-100);
    }
  }
  
  // Update timestamps
  account.lastUpdate = new Date().toISOString();
  data.lastUpdate = new Date().toISOString();
  
  // Save data
  await saveTrackingData(data);
  
  return account;
}

/**
 * Gets tracking data for a specific account
 * @async
 * @param {string} accountName - Account name to get data for
 * @returns {Promise<Object|null>} Account tracking data or null if not found
 */
async function getAccountTracking(accountName) {
  const data = await loadTrackingData();
  return data.accounts[accountName] || null;
}

/**
 * Gets tracking data for all accounts
 * @async
 * @returns {Promise<Object>} All tracking data
 */
async function getAllTracking() {
  return await loadTrackingData();
}

/**
 * Gets earnings summary for all accounts
 * @async
 * @returns {Promise<Object>} Earnings summary
 */
async function getEarningsSummary() {
  const data = await loadTrackingData();
  
  // Calculate total earnings across all accounts
  let totalEarned = 0;
  let accountsWithEarnings = 0;
  let topEarningAccount = null;
  let topEarningAmount = 0;
  
  // Account-specific summaries
  const accountSummaries = {};
  
  Object.entries(data.accounts).forEach(([accountName, accountData]) => {
    totalEarned += accountData.totalEarned;
    
    if (accountData.totalEarned > 0) {
      accountsWithEarnings++;
      
      // Track top earning account
      if (accountData.totalEarned > topEarningAmount) {
        topEarningAmount = accountData.totalEarned;
        topEarningAccount = accountName;
      }
    }
    
    // Calculate per-account stats
    const startTotal = (accountData.startingMoney || 0) + (accountData.startingBankMoney || 0);
    const currentTotal = accountData.currentMoney + accountData.currentBankMoney;
    const netChange = currentTotal - startTotal;
    
    // Add hourly rate if we have history
    let hourlyRate = 0;
    if (accountData.history.length > 0) {
      const oldestEntry = new Date(accountData.history[0].timestamp);
      const newestEntry = new Date(accountData.history[accountData.history.length - 1].timestamp);
      const hoursDiff = (newestEntry - oldestEntry) / (1000 * 60 * 60);
      
      if (hoursDiff > 0) {
        hourlyRate = accountData.totalEarned / hoursDiff;
      }
    }
    
    accountSummaries[accountName] = {
      totalEarned: accountData.totalEarned,
      netChange,
      hourlyRate,
      currentTotal,
      lastUpdate: accountData.lastUpdate
    };
  });
  
  return {
    totalEarned,
    accountsWithEarnings,
    topEarningAccount,
    topEarningAmount,
    accountSummaries,
    lastUpdate: data.lastUpdate
  };
}

/**
 * Resets tracking for a specific account
 * @async
 * @param {string} accountName - Account name to reset
 * @returns {Promise<boolean>} Whether reset was successful
 */
async function resetAccountTracking(accountName) {
  const data = await loadTrackingData();
  
  if (!data.accounts[accountName]) {
    return false;
  }
  
  // Reset the account data
  const currentMoney = data.accounts[accountName].currentMoney;
  const currentBankMoney = data.accounts[accountName].currentBankMoney;
  
  data.accounts[accountName] = {
    totalEarned: 0,
    startingMoney: currentMoney,
    startingBankMoney: currentBankMoney,
    currentMoney: currentMoney,
    currentBankMoney: currentBankMoney,
    history: [],
    lastUpdate: new Date().toISOString()
  };
  
  await saveTrackingData(data);
  return true;
}

module.exports = {
  initializeAccount,
  updateAccountMoney,
  getAccountTracking,
  getAllTracking,
  getEarningsSummary,
  resetAccountTracking
};