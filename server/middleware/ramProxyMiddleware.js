/**
 * RAM Proxy Middleware
 * Middleware for proxying requests to Roblox Account Manager (RAM)
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Creates proxy middleware for Roblox Account Manager
 * @param {object} config - Configuration with RAM API settings
 * @returns {function} Express middleware
 */
function createRamProxyMiddleware(config) {
  const ramProxyOptions = {
    target: `http://${config.RAM_API.HOST}:${config.RAM_API.PORT}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/' // Rewrite path from /api/whatever to /whatever
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add password to query parameters if configured
      if (config.RAM_API.PASSWORD) {
        const url = new URL(proxyReq.path, `http://${config.RAM_API.HOST}`);
        url.searchParams.append('Password', config.RAM_API.PASSWORD);
        proxyReq.path = url.pathname + url.search;
      }
      
      // Log the request for debugging
      console.log(`Proxying request: ${req.method} ${req.path} -> ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error connecting to Roblox Account Manager');
    }
  };

  return createProxyMiddleware(ramProxyOptions);
}

module.exports = createRamProxyMiddleware;