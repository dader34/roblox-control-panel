/**
 * Proxy Service
 * Handles proxy-related operations for making requests to Roblox APIs
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// List of free proxies
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
  // ... other proxies omitted for brevity
  {
    host: "190.95.132.189",
    port: "999",
    protocol: "http"
  }
];

/**
 * Gets a random proxy from the list
 * @returns {object|null} A random proxy or null if no proxies are available
 */
function getRandomProxy() {
  if (proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

/**
 * Makes an HTTP request with optional proxy
 * @param {string} url - URL to request
 * @param {boolean} useProxy - Whether to use a proxy
 * @returns {Promise<object>} Parsed JSON response
 */
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

module.exports = {
  makeRequest,
  getRandomProxy
};