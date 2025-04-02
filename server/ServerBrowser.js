const https = require('https');
const http = require('http');
const { URL } = require('url');

// List of free proxies (you should replace these with your actual proxies)
// Format: { host: 'proxy.example.com', port: 8080, protocol: 'http' }
const proxies = [
  // You'll need to add your own reliable proxies here
  // These are just examples and will likely not work
  { host: '43.153.103.42', port: 13001, protocol: 'http' },
  { host: '201.174.175.179', port: 999, protocol: 'http' },
  { host: '103.245.205.226', port: 6969, protocol: 'http' },
  { host: '5.253.142.114', port: 1453, protocol: 'http' },
  { host: '91.107.186.37', port: 80, protocol: 'http' },
  { host: '139.9.116.150', port: 8520, protocol: 'http' },
];

// Helper function to get a random proxy from the list
function getRandomProxy() {
  if (proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

// Function to make an HTTP request with optional proxy
function makeRequest(url, useProxy = true) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Decide whether to use a proxy or direct connection
    let options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.roblox.com/'
      }
    };
    
    let proxy = null;
    if (useProxy) {
      proxy = getRandomProxy();
    }
    
    let reqHandler;
    
    if (proxy) {
      // Configure request to use proxy
      options = {
        hostname: proxy.host,
        port: proxy.port,
        path: url,
        method: 'GET',
        headers: {
          ...options.headers,
          'Host': urlObj.hostname
        }
      };
      
      console.log(`Using proxy: ${proxy.host}:${proxy.port}`);
      reqHandler = proxy.protocol === 'https' ? https : http;
    } else {
      // Direct connection (fallback)
      console.log('Using direct connection (no proxy)');
      reqHandler = urlObj.protocol === 'https:' ? https : http;
    }
    
    const req = reqHandler.request(options, (res) => {
      let data = '';
      
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirects
        const redirectUrl = res.headers.location;
        console.log(`Redirecting to: ${redirectUrl}`);
        return makeRequest(redirectUrl, useProxy).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        return reject(new Error(`Request failed with status code ${res.statusCode}`));
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      // If proxy fails, retry with direct connection
      if (proxy && useProxy) {
        console.log('Proxy failed, retrying with direct connection');
        makeRequest(url, false).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });
    
    // Set timeout to prevent hanging requests
    req.setTimeout(10000, () => {
      req.abort();
      if (proxy && useProxy) {
        console.log('Proxy request timed out, retrying with direct connection');
        makeRequest(url, false).then(resolve).catch(reject);
      } else {
        reject(new Error('Request timed out'));
      }
    });
    
    req.end();
  });
}

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
      const data = await makeRequest(url);
      
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