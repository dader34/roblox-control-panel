/**
 * Platform Service
 * Handles platform-specific operations and detections
 */

// Constants for platform detection
const PLATFORM_MODE = {
    IS_MAC: process.platform === 'darwin',
    IS_WINDOWS: process.platform === 'win32',
    IS_LINUX: process.platform === 'linux'
  };
  
  /**
   * Gets the process name for Roblox based on the current platform
   * @returns {string} Process name for the current platform
   */
  function getRobloxProcessName() {
    return PLATFORM_MODE.IS_WINDOWS 
      ? 'RobloxPlayerBeta.exe' 
      : 'RobloxPlayer';
  }
  
  /**
   * Gets the installer process names for Roblox based on the current platform
   * @returns {string[]} List of possible installer process names
   */
  function getRobloxInstallerNames() {
    return PLATFORM_MODE.IS_WINDOWS 
      ? ['RobloxPlayerInstaller.exe', 'RobloxInstaller.exe']
      : ['RobloxInstaller', 'RobloxPlayerInstaller', 'Roblox Installer'];
  }
  
  /**
   * Gets the command to list processes based on the current platform
   * @param {string} processName - Name of the process to list
   * @returns {string} Platform-specific command to list processes
   */
  function getProcessListCommand(processName) {
    if (PLATFORM_MODE.IS_WINDOWS) {
      return `tasklist /fi "imagename eq ${processName}" /fo csv /nh`;
    } else if (PLATFORM_MODE.IS_MAC || PLATFORM_MODE.IS_LINUX) {
      return `pgrep -x "${processName}"`;
    } else {
      throw new Error('Unsupported platform');
    }
  }
  
  /**
   * Gets the command to terminate a process based on the current platform
   * @param {number} pid - Process ID to terminate
   * @returns {string} Platform-specific command to terminate the process
   */
  function getTerminateProcessCommand(pid) {
    if (PLATFORM_MODE.IS_WINDOWS) {
      return `taskkill /F /PID ${pid}`;
    } else if (PLATFORM_MODE.IS_MAC || PLATFORM_MODE.IS_LINUX) {
      return `kill -9 ${pid}`;
    } else {
      throw new Error('Unsupported platform');
    }
  }
  
  module.exports = {
    PLATFORM_MODE,
    getRobloxProcessName,
    getRobloxInstallerNames,
    getProcessListCommand,
    getTerminateProcessCommand
  };