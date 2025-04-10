/**
 * API service for communicating with the backend server
 * Place this file in the client/src/services directory
 */

const API_BASE_URL = '/api';  // This will be proxied to the RAM API

/**
 * Helper function to make API requests
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<any>} - Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      } catch (e) {
        throw new Error(`API request failed with status ${response.status}`);
      }
    }
    
    // Check if response is expected to be JSON or text
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Account-related API calls

/**
 * Get all accounts
 * @returns {Promise<string[]>} List of account names
 */
export const getAccounts = async () => {
  const response = await apiRequest('/GetAccounts');
  // The response is a comma-separated string of account names
  return response.split(',');
};

/**
 * Get detailed account information
 * @param {string} [group=null] - Optional group filter
 * @returns {Promise<Object[]>} List of account objects
 */
export const getAccountsDetailed = async (group = null) => {
    try {
      let endpoint = '/GetAccountsJson';
      if (group) {
        endpoint += `?Group=${encodeURIComponent(group)}`;
      }
      
      const response = await apiRequest(endpoint);
      console.log('API response for accounts:', response);
      
      return JSON.parse(response)
    } catch (error) {
      console.error('Error in getAccountsDetailed:', error);
      return [];
    }
  };

/**
 * Launch Roblox with a specific account
 * @param {string} account - Account name
 * @param {number} placeId - Roblox place ID
 * @param {string} [jobId=null] - Optional job ID (server instance)
 * @returns {Promise<string>} Result message
 */
export const launchAccount = async (account, placeId, jobId = null) => {
  let endpoint = `/LaunchAccount?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
  if (jobId) {
    endpoint += `&JobId=${encodeURIComponent(jobId)}`;
  }
  return await apiRequest(endpoint);
};

/**
 * Follow a user into their game
 * @param {string} account - Account name
 * @param {string} username - Username to follow
 * @returns {Promise<string>} Result message
 */
export const followUser = async (account, username) => {
  const endpoint = `/FollowUser?Account=${encodeURIComponent(account)}&Username=${encodeURIComponent(username)}`;
  return await apiRequest(endpoint);
};

/**
 * Set a specific server to join
 * @param {string} account - Account name
 * @param {number} placeId - Roblox place ID
 * @param {string} jobId - Server job ID
 * @returns {Promise<string>} Result message
 */
export const setServer = async (account, placeId, jobId) => {
  const endpoint = `/SetServer?Account=${encodeURIComponent(account)}&PlaceId=${placeId}&JobId=${encodeURIComponent(jobId)}`;
  return await apiRequest(endpoint);
};

/**
 * Set a recommended server to join
 * @param {string} account - Account name
 * @param {number} placeId - Roblox place ID
 * @returns {Promise<string>} Result message
 */
export const setRecommendedServer = async (account, placeId) => {
  const endpoint = `/SetRecommendedServer?Account=${encodeURIComponent(account)}&PlaceId=${placeId}`;
  return await apiRequest(endpoint);
};

// Process management API calls (our custom additions)

/**
 * Get all running Roblox processes
 * @returns {Promise<Object[]>} List of process objects
 */
export const getProcesses = async () => {
  return await apiRequest('/processes');
};

/**
 * Get all tracked launched processes
 * @returns {Promise<Object[]>} List of launched process info
 */
export const getLaunchedProcesses = async () => {
  return await apiRequest('/launched');
};

/**
 * Terminate a process
 * @param {number} pid - Process ID
 * @returns {Promise<Object>} Result object
 */
export const terminateProcess = async (pid) => {
  return await apiRequest('/terminate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pid })
  });
};

/**
 * Get account alias
 * @param {string} account - Account name
 * @returns {Promise<string>} Alias
 */
export const getAlias = async (account) => {
  const endpoint = `/GetAlias?Account=${encodeURIComponent(account)}`;
  return await apiRequest(endpoint);
};

/**
 * Get account description
 * @param {string} account - Account name
 * @returns {Promise<string>} Description
 */
export const getDescription = async (account) => {
  const endpoint = `/GetDescription?Account=${encodeURIComponent(account)}`;
  return await apiRequest(endpoint);
};

/**
 * Get available servers for a place
 * @param {number} placeId - Roblox place ID
 * @param {number} [pageCount=1] - Number of pages to fetch
 * @param {boolean} [sortLowest=false] - Sort by lowest player count
 * @returns {Promise<Array>} List of servers
 */
export const getServers = async (placeId, pageCount = 1, sortLowest = false) => {
  const endpoint = `/servers?placeId=${placeId}&pageCount=${pageCount}&sortLowest=${sortLowest}`;
  return await apiRequest(endpoint);
};

/**
 * Get a random job ID for a place
 * @param {number} placeId - Roblox place ID
 * @param {boolean} [chooseLowestServer=false] - Choose server with least players
 * @returns {Promise<string>} Job ID
 */
export const getRandomJobId = async (placeId, chooseLowestServer = false) => {
  const endpoint = `/randomJobId?placeId=${placeId}&chooseLowestServer=${chooseLowestServer}`;
  const response = await apiRequest(endpoint);
  return response.jobId;
};


/**
 * Get multiple different job IDs for a place
 * @param {number} placeId - Roblox place ID
 * @param {number} count - Number of different servers needed
 * @param {boolean} [chooseLowestServers=false] - Choose servers with lowest player counts
 * @returns {Promise<string[]>} Array of job IDs
 */
export const getMultipleDifferentJobIds = async (placeId, count, chooseLowestServers = false) => {
  const endpoint = `/multipleDifferentJobIds?placeId=${placeId}&count=${count}&chooseLowestServers=${chooseLowestServers}`;
  const response = await apiRequest(endpoint);
  return response.jobIds;
};

/**
 * Launch multiple accounts to the same or different servers
 * @param {string[]} accounts - List of account names
 * @param {number} placeId - Roblox place ID
 * @param {string} [jobId=null] - Optional job ID (server) - used only if joinDifferentServers is false
 * @param {boolean} [joinDifferentServers=false] - Whether to join different servers for each account
 * @returns {Promise<Object[]>} Launch results
 */
export const launchMultipleAccounts = async (accounts, placeId, jobId = null, joinDifferentServers = false) => {
  return await apiRequest('/launchMultiple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accounts,
      placeId,
      jobId,
      joinDifferentServers
    })
  });
};

/**
 * Reset the process-to-account mapping
 * @returns {Promise<Object>} Result message
 */
export const resetProcessMapping = async () => {
  return await apiRequest('/resetProcessMapping', {
    method: 'POST'
  });
};

/**
 * Manually associate a process with an account
 * @param {number} pid - Process ID
 * @param {string} account - Account name
 * @returns {Promise<Object>} Result message
 */
export const associateProcess = async (pid, account) => {
  return await apiRequest('/associateProcess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pid, account })
  });
};


/**
 * Get game data for all accounts
 * @returns {Promise<Array>} Game data for accounts
 */
export const getGameData = async () => {
  return await apiRequest('/gameData');
};

/**
 * Execute a Lua script on a specific account
 * @param {string} accountName - Account name to execute script on
 * @param {string} script - Lua script to execute
 * @returns {Promise<Object>} Result of script execution
 */
export const executeScript = async (accountName, script) => {
  return await apiRequest('/executeScript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountName,
      script
    })
  });
};

/**
 * Execute a Lua script on multiple accounts
 * @param {string[]} accountNames - Array of account names to execute script on
 * @param {string} script - Lua script to execute
 * @returns {Promise<Object>} Result of script execution
 */
export const executeScriptOnMultipleAccounts = async (accountNames, script) => {
  return await apiRequest('/executeScriptMultiple', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      accountNames,
      script
    })
  });
};

/**
 * Get execution history for a specific account
 * @param {string} accountName - Account name
 * @returns {Promise<Object>} Execution history
 */
export const getExecutionHistory = async (accountName) => {
  return await apiRequest(`/executionHistory/${accountName}`);
};


export default {
  resetProcessMapping,
  associateProcess,
  getAccounts,
  getServers,
  getRandomJobId,
  launchMultipleAccounts,
  getAccountsDetailed,
  getGameData,
  launchAccount,
  followUser,
  setServer,
  setRecommendedServer,
  getProcesses,
  getLaunchedProcesses,
  terminateProcess,
  getAlias,
  getDescription,
  getMultipleDifferentJobIds,
  launchMultipleAccounts,
  executeScript,
  executeScriptOnMultipleAccounts,
  getExecutionHistory
};