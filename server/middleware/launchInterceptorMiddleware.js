/**
 * Launch Interceptor Middleware
 * Middleware to intercept and track Roblox game launches
 */

const processService = require('../services/processService');
const config = require('../../config');

/**
 * Creates middleware to intercept account launch requests
 * @returns {object} Express middleware functions for pre and post launch
 */
function createLaunchInterceptorMiddleware() {
  /**
   * Pre-launch middleware to capture PIDs before launch
   */
  const preLaunchMiddleware = (req, res, next) => {
    // Capture current PIDs before the launch
    processService.getRobloxProcesses()
      .then(beforeProcesses => {
        // Store the PIDs of existing processes
        const beforePids = new Set(beforeProcesses.map(p => p.pid));
        
        // Store this in the request object for later use
        req.beforeProcessPids = beforePids;
        
        // Continue with the request
        next();
      })
      .catch(error => {
        console.error('Error getting processes before launch:', error);
        next();
      });
  };
  
  /**
   * Post-launch middleware to track new processes after launch
   */
  const postLaunchMiddleware = (req, res, next) => {
    // Only process if the request was successful
    if (res.statusCode === 200) {
      const account = req.query.Account;
      const placeId = req.query.PlaceId;
      const jobId = req.query.JobId || '';
      const beforePids = req.beforeProcessPids || new Set();
      
      console.log(`Account ${account} launched successfully. Tracking process...`);
      
      // Store initial launch info
      processService.updateGameData(account, {
        placeId,
        jobId,
        status: 'launching'
      });
      
      // Start polling for the new process
      let pollCount = 0;
      const maxPolls = config.PROCESS.MAX_POLLS;
      const pollInterval = config.PROCESS.POLL_INTERVAL;
      
      const pollForProcess = () => {
        pollCount++;
        
        if (pollCount > maxPolls) {
          console.log(`Gave up looking for process for account ${account} after ${maxPolls} attempts`);
          return;
        }
        
        processService.getRobloxProcesses()
          .then(currentProcesses => {
            // Find processes that weren't running before
            const newProcesses = currentProcesses.filter(p => !beforePids.has(p.pid));
            
            if (newProcesses.length > 0) {
              // Take the newest process (highest PID usually)
              const process = newProcesses.sort((a, b) => b.pid - a.pid)[0];
              
              console.log(`Found new process with PID ${process.pid} for account ${account}`);
              
              // Update process mapping
              processService.associateProcess(process.pid, account, {
                placeId,
                jobId,
                status: 'running',
                memoryUsage: process.memoryUsage
              });
            } else {
              // Try again after a delay
              setTimeout(pollForProcess, pollInterval);
            }
          })
          .catch(error => {
            console.error('Error polling for new process:', error);
            setTimeout(pollForProcess, pollInterval);
          });
      };
      
      // Start polling after a short delay
      setTimeout(pollForProcess, config.PROCESS.INITIAL_DELAY);
    }
    
    next();
  };
  
  return {
    preLaunchMiddleware,
    postLaunchMiddleware
  };
}

module.exports = createLaunchInterceptorMiddleware;