/**
 * Server Browser Service
 * Handles fetching and managing Roblox game servers
 */

const proxyService = require('./proxyService');

/**
 * Gets a list of available servers for a Roblox place
 * @param {number} placeId - The Roblox place ID
 * @param {number} [pageCount=1] - Number of pages to fetch (each page has up to 100 servers)
 * @param {boolean} [sortLowest=false] - Sort by lowest player count when true
 * @returns {Promise<Array>} List of server objects
 */
async function getServers(placeId, pageCount = 1, sortLowest = false) {
  if (!placeId) throw new Error('Place ID is required');
  
  let validServers = [];
  let cursor = '';
  
  for (let currentPage = 0; currentPage < pageCount; currentPage++) {
    try {
      // Add some randomization to avoid obvious patterns
      const delay = 500 + Math.floor(Math.random() * 1000); // 500-1500ms delay
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const url = `https://games.roblox.com/v1/games/${placeId}/servers/public?sortOrder=Asc&limit=100${cursor ? `&cursor=${cursor}` : ''}`;
      const data = await proxyService.makeRequest(url);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error('Invalid server response format');
        break;
      }
      
      // Filter valid servers (not full, has players, more than 1 max player)
      const servers = data.data.filter(server => 
        server.playing < server.maxPlayers && 
        server.playing > 0 && 
        server.maxPlayers > 1
      );
      
      validServers = [...validServers, ...servers];
      
      // Get cursor for next page
      cursor = data.nextPageCursor || '';
      
      // If no more pages or we're looking for lowest servers only, stop here
      if (!cursor || sortLowest) break;
      
    } catch (error) {
      console.error('Error fetching servers:', error);
      break;
    }
  }
  
  // Sort servers by player count if requested
  if (sortLowest) {
    validServers.sort((a, b) => a.playing - b.playing);
  }
  
  return validServers;
}

/**
 * Gets a random job ID from available servers
 * @param {number} placeId - The Roblox place ID
 * @param {boolean} [chooseLowestServer=false] - Choose the server with the least players when true
 * @returns {Promise<string>} A job ID or empty string if no servers available
 */
async function getRandomJobId(placeId, chooseLowestServer = false) {
  try {
    // Get the servers with the configured page count
    const pageCount = 1; // Default to 1 page, can be made configurable
    const servers = await getServers(placeId, pageCount, chooseLowestServer);
    
    if (servers.length === 0) return '';
    
    if (chooseLowestServer) {
      return servers[0].id;
    } else {
      // Choose a random server
      const randomIndex = Math.floor(Math.random() * servers.length);
      return servers[randomIndex].id;
    }
  } catch (error) {
    console.error('Error getting random job ID:', error);
    return '';
  }
}

/**
 * Gets multiple different job IDs for multiple accounts
 * @param {number} placeId - The Roblox place ID
 * @param {number} count - Number of different servers needed
 * @param {boolean} [chooseLowestServers=false] - Choose servers with lowest player counts when true
 * @returns {Promise<string[]>} Array of job IDs, may be fewer than requested if not enough servers available
 */
async function getMultipleDifferentJobIds(placeId, count, chooseLowestServers = false) {
  try {
    // Get a larger page count to ensure we have enough servers
    const pageCount = Math.max(Math.ceil(count / 50), 2); // Get at least 2 pages to have enough variety
    const servers = await getServers(placeId, pageCount, chooseLowestServers);
    
    if (servers.length === 0) return [];
    
    // If we need to choose lowest servers, we already have them sorted
    if (chooseLowestServers) {
      // Take as many as we need (or as many as available)
      return servers.slice(0, count).map(server => server.id);
    } else {
      // For random selection, shuffle the array
      const shuffledServers = [...servers].sort(() => Math.random() - 0.5);
      return shuffledServers.slice(0, count).map(server => server.id);
    }
  } catch (error) {
    console.error('Error getting multiple job IDs:', error);
    return [];
  }
}

module.exports = {
  getServers,
  getRandomJobId,
  getMultipleDifferentJobIds
};