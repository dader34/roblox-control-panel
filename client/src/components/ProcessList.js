import React, { useState, useEffect } from 'react';
import { getProcesses, terminateProcess, getAccounts } from '../services/api';
import { 
  RefreshCw, 
  Activity, 
  X, 
  Server, 
  // Memory, 
  Clock, 
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardDrive
} from 'react-feather';

const ProcessList = ({ darkMode }) => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProcesses = async () => {
    try {
      setRefreshing(true);
      const processesData = await getProcesses();
      setProcesses(processesData);
      setError('');
    } catch (error) {
      console.error('Error fetching processes:', error);
      setError('Failed to load process data. Make sure the server is running.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    
    // Set up polling
    const interval = setInterval(fetchProcesses, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleTerminate = async (pid) => {
    try {
      setLoading(true);
      await terminateProcess(pid);
      setSuccessMessage(`Process ${pid} terminated successfully`);
      
      // Remove the terminated process from the list
      setProcesses(processes.filter(p => p.pid !== pid));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error terminating process:', error);
      setError(`Failed to terminate process: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (process) => {
    // Default to 'running' if no explicit status
    const status = process.status || 'running';
    
    if (status === 'running') {
      return (
        <span className="inline-flex items-center" title="Running">
          <Activity size={14} className="text-emerald-500 mr-1.5" />
          <span>Running</span>
        </span>
      );
    } else if (status === 'launching') {
      return (
        <span className="inline-flex items-center" title="Launching">
          <AlertTriangle size={14} className="text-amber-500 mr-1.5" />
          <span>Launching</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center" title="Stopped">
          <XCircle size={14} className="text-red-500 mr-1.5" />
          <span>Stopped</span>
        </span>
      );
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return 'Invalid time';
    }
  };

  const handleManualRefresh = () => {
    fetchProcesses();
  };

  if (loading && processes.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-xl">Loading process data...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-full ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <HardDrive className="text-purple-500 mr-2" size={24} />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Process Manager
          </h1>
        </div>
        
        <button
          className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
            darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
          } border border-gray-300 dark:border-gray-600`}
          onClick={handleManualRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 flex items-center" role="alert">
          <XCircle className="mr-2" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 flex items-center" role="alert">
          <CheckCircle className="mr-2" size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      
      <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Roblox Processes</h2>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {processes.length}
            </span>
          </div>
        </div>
        
        {processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Server size={48} className="text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium mb-2">No Roblox instances currently running</p>
            <p className="text-gray-400 text-sm">Launch a game to see processes here</p>
          </div>
        ) : (
          <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Place ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Memory</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Launched At</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {processes.map((process) => (
                    <tr key={process.pid} className={`${process.account ? 'border-l-4 border-purple-500' : ''} transition-colors`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusIcon(process)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">
                        {process.pid}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {process.account ? (
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="ml-2 font-medium">{process.account}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">
                        {process.placeId || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* <Memory className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" /> */}
                          <span>{process.memoryUsage}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                          <span>{formatTime(process.launchTime)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button 
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          onClick={() => handleTerminate(process.pid)}
                          disabled={loading}
                        >
                          <X size={14} className="mr-1" />
                          Terminate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <RefreshCw size={14} className="mr-2" />
                <span>Processes auto-refresh every 5 seconds</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessList;