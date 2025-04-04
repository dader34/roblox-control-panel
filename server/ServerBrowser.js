const https = require('https');
const http = require('http');
const { URL } = require('url');

// List of free proxies (you should replace these with your actual proxies)
// Format: { host: 'proxy.example.com', port: 8080, protocol: 'http' }
//  = [
//   // You'll need to add your own reliable proxies here
//   // These are just examples and will likely not work
//   { host: '43.153.103.42', port: 13001, protocol: 'http' },
//   { host: '201.174.175.179', port: 999, protocol: 'http' },
//   { host: '103.245.205.226', port: 6969, protocol: 'http' },
//   { host: '5.253.142.114', port: 1453, protocol: 'http' },
//   { host: '91.107.186.37', port: 80, protocol: 'http' },
//   { host: '139.9.116.150', port: 8520, protocol: 'http' },
// ];

const proxies = [
  {
      host: "157.15.82.184",
      port: "2134",
      protocol: "http"
  },
  {
      host: "47.123.4.107",
      port: "9100",
      protocol: "http"
  },
  {
      host: "117.2.236.253",
      port: "5401",
      protocol: "http"
  },
  {
      host: "170.80.78.217",
      port: "8088",
      protocol: "http"
  },
  {
      host: "43.153.14.194",
      port: "13001",
      protocol: "http"
  },
  {
      host: "201.186.41.98",
      port: "999",
      protocol: "http"
  },
  {
      host: "43.153.11.118",
      port: "13001",
      protocol: "http"
  },
  {
      host: "106.225.164.39",
      port: "655",
      protocol: "http"
  },
  {
      host: "162.223.90.130",
      port: "80",
      protocol: "http"
  },
  {
      host: "49.4.117.146",
      port: "3128",
      protocol: "http"
  },
  {
      host: "38.152.72.220",
      port: "2335",
      protocol: "http"
  },
  {
      host: "35.209.198.222",
      port: "80",
      protocol: "http"
  },
  {
      host: "69.49.228.101",
      port: "3128",
      protocol: "http"
  },
  {
      host: "94.249.220.135",
      port: "49200",
      protocol: "http"
  },
  {
      host: "160.20.165.229",
      port: "8587",
      protocol: "http"
  },
  {
      host: "45.249.77.145",
      port: "83",
      protocol: "http"
  },
  {
      host: "160.25.48.33",
      port: "9090",
      protocol: "http"
  },
  {
      host: "62.213.23.99",
      port: "8080",
      protocol: "http"
  },
  {
      host: "180.94.80.18",
      port: "8080",
      protocol: "http"
  },
  {
      host: "165.16.58.124",
      port: "8080",
      protocol: "http"
  },
  {
      host: "103.243.177.129",
      port: "8080",
      protocol: "http"
  },
  {
      host: "47.251.122.81",
      port: "8888",
      protocol: "http"
  },
  {
      host: "111.72.193.66",
      port: "2324",
      protocol: "http"
  },
  {
      host: "116.105.23.20",
      port: "10001",
      protocol: "http"
  },
  {
      host: "44.215.100.135",
      port: "8118",
      protocol: "http"
  },
  {
      host: "38.54.9.151",
      port: "3128",
      protocol: "http"
  },
  {
      host: "190.85.141.170",
      port: "9090",
      protocol: "http"
  },
  {
      host: "186.215.43.224",
      port: "3128",
      protocol: "http"
  },
  {
      host: "193.30.13.231",
      port: "999",
      protocol: "http"
  },
  {
      host: "193.38.224.169",
      port: "8081",
      protocol: "http"
  },
  {
      host: "80.80.163.194",
      port: "46276",
      protocol: "http"
  },
  {
      host: "43.153.103.58",
      port: "13001",
      protocol: "http"
  },
  {
      host: "120.28.168.252",
      port: "5050",
      protocol: "http"
  },
  {
      host: "27.79.248.34",
      port: "16000",
      protocol: "http"
  },
  {
      host: "103.24.215.126",
      port: "8080",
      protocol: "http"
  },
  {
      host: "125.87.85.199",
      port: "2324",
      protocol: "http"
  },
  {
      host: "222.74.73.202",
      port: "42055",
      protocol: "http"
  },
  {
      host: "45.166.93.29",
      port: "999",
      protocol: "http"
  },
  {
      host: "27.189.130.121",
      port: "8089",
      protocol: "http"
  },
  {
      host: "116.169.61.56",
      port: "10990",
      protocol: "http"
  },
  {
      host: "36.50.112.145",
      port: "8080",
      protocol: "http"
  },
  {
      host: "23.82.137.159",
      port: "80",
      protocol: "http"
  },
  {
      host: "34.122.187.196",
      port: "80",
      protocol: "http"
  },
  {
      host: "36.93.73.154",
      port: "8080",
      protocol: "http"
  },
  {
      host: "59.53.80.122",
      port: "10024",
      protocol: "http"
  },
  {
      host: "157.10.97.107",
      port: "8383",
      protocol: "http"
  },
  {
      host: "43.153.92.75",
      port: "13001",
      protocol: "http"
  },
  {
      host: "103.59.213.29",
      port: "8080",
      protocol: "http"
  },
  {
      host: "145.239.196.123",
      port: "80",
      protocol: "http"
  },
  {
      host: "126.209.9.30",
      port: "8080",
      protocol: "http"
  },
  {
      host: "206.189.140.195",
      port: "3128",
      protocol: "http"
  },
  {
      host: "98.64.128.182",
      port: "3128",
      protocol: "http"
  },
  {
      host: "47.238.225.138",
      port: "9000",
      protocol: "http"
  },
  {
      host: "118.70.13.38",
      port: "41857",
      protocol: "http"
  },
  {
      host: "49.146.197.234",
      port: "8082",
      protocol: "http"
  },
  {
      host: "81.169.213.169",
      port: "8888",
      protocol: "http"
  },
  {
      host: "14.204.5.187",
      port: "8085",
      protocol: "http"
  },
  {
      host: "112.201.183.19",
      port: "8085",
      protocol: "http"
  },
  {
      host: "119.3.113.151",
      port: "9094",
      protocol: "http"
  },
  {
      host: "120.28.168.238",
      port: "5050",
      protocol: "http"
  },
  {
      host: "43.153.2.82",
      port: "13001",
      protocol: "http"
  },
  {
      host: "37.211.38.208",
      port: "8080",
      protocol: "http"
  },
  {
      host: "121.232.178.25",
      port: "8089",
      protocol: "http"
  },
  {
      host: "213.239.221.24",
      port: "8888",
      protocol: "http"
  },
  {
      host: "112.198.239.81",
      port: "8082",
      protocol: "http"
  },
  {
      host: "200.10.30.129",
      port: "999",
      protocol: "http"
  },
  {
      host: "171.237.122.135",
      port: "1001",
      protocol: "http"
  },
  {
      host: "80.249.112.166",
      port: "80",
      protocol: "http"
  },
  {
      host: "49.146.204.232",
      port: "8080",
      protocol: "http"
  },
  {
      host: "45.233.169.9",
      port: "999",
      protocol: "http"
  },
  {
      host: "193.124.225.217",
      port: "3128",
      protocol: "http"
  },
  {
      host: "103.242.105.177",
      port: "8181",
      protocol: "http"
  },
  {
      host: "190.94.213.4",
      port: "999",
      protocol: "http"
  },
  {
      host: "43.153.103.42",
      port: "13001",
      protocol: "http"
  },
  {
      host: "202.154.18.168",
      port: "8088",
      protocol: "http"
  },
  {
      host: "138.68.60.8",
      port: "80",
      protocol: "http"
  },
  {
      host: "103.132.52.117",
      port: "8080",
      protocol: "http"
  },
  {
      host: "202.165.47.90",
      port: "55443",
      protocol: "http"
  },
  {
      host: "43.153.69.25",
      port: "13001",
      protocol: "http"
  },
  {
      host: "190.60.44.234",
      port: "999",
      protocol: "http"
  },
  {
      host: "114.219.174.47",
      port: "8089",
      protocol: "http"
  },
  {
      host: "152.228.154.20",
      port: "80",
      protocol: "http"
  },
  {
      host: "93.127.163.52",
      port: "80",
      protocol: "http"
  },
  {
      host: "31.44.91.218",
      port: "8080",
      protocol: "http"
  },
  {
      host: "110.76.145.22",
      port: "92",
      protocol: "http"
  },
  {
      host: "47.56.110.204",
      port: "8989",
      protocol: "http"
  },
  {
      host: "77.239.115.23",
      port: "3128",
      protocol: "http"
  },
  {
      host: "43.153.32.146",
      port: "13001",
      protocol: "http"
  },
  {
      host: "193.123.244.193",
      port: "8080",
      protocol: "http"
  },
  {
      host: "36.136.27.2",
      port: "4999",
      protocol: "http"
  },
  {
      host: "179.48.251.190",
      port: "8081",
      protocol: "http"
  },
  {
      host: "2.179.193.146",
      port: "80",
      protocol: "http"
  },
  {
      host: "14.143.130.210",
      port: "80",
      protocol: "http"
  },
  {
      host: "51.158.105.94",
      port: "31826",
      protocol: "http"
  },
  {
      host: "190.108.95.104",
      port: "999",
      protocol: "http"
  },
  {
      host: "221.121.149.35",
      port: "8080",
      protocol: "http"
  },
  {
      host: "121.229.203.61",
      port: "8088",
      protocol: "http"
  },
  {
      host: "106.38.26.22",
      port: "2080",
      protocol: "http"
  },
  {
      host: "23.82.137.161",
      port: "80",
      protocol: "http"
  },
  {
      host: "190.95.132.189",
      port: "999",
      protocol: "http"
  }
]

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