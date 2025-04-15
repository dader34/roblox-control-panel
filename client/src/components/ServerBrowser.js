import React, { useState, useEffect } from 'react';
import { getServers, launchAccount, launchMultipleAccounts, setServer } from '../services/api';
import { 
  Search, 
  Server, 
  Users, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  Play, 
  Zap, 
  Clock, 
  Radio,
  CheckSquare,
  Square,
  Sliders,
  Terminal
} from 'react-feather';

const ServerBrowser = ({ placeId, accounts, onAction, disabled, darkMode }) => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [sortLowest, setSortLowest] = useState(false);
  const [joinDifferentServers, setJoinDifferentServers] = useState(false);

  const fetchServers = async () => {
    if (!placeId) {
      setError('Please enter a Place ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const serverData = await getServers(placeId, pageCount, sortLowest);
      setServers(serverData);
      
      if (serverData.length === 0) {
        setError('No available servers found for this Place ID');
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      setError('Failed to fetch servers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle account selection
  const toggleAccountSelection = (account) => {
    setSelectedAccounts(prev => {
      if (prev.includes(account)) {
        return prev.filter(a => a !== account);
      } else {
        return [...prev, account];
      }
    });
  };

  // Select/deselect all accounts
  const toggleAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts([...accounts]);
    }
  };

  // Launch selected accounts to the selected server
  const launchSelectedAccounts = async () => {
    if (!selectedAccounts.length) {
      setError('Please select at least one account');
      return;
    }

    // Only require server selection if not using different servers mode
    if (!joinDifferentServers && !selectedServer) {
      setError('Please select a server or enable "Join Different Servers"');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const results = await launchMultipleAccounts(
        selectedAccounts, 
        placeId, 
        joinDifferentServers ? null : selectedServer.id,
        joinDifferentServers
      );
      
      if (onAction) {
        onAction({
          type: 'launch_multiple',
          success: true,
          results
        });
      }
    } catch (error) {
      console.error('Error launching accounts:', error);
      setError('Failed to launch accounts. Please try again.');
      
      if (onAction) {
        onAction({
          type: 'launch_multiple',
          success: false,
          error: error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Launch a single account to the selected server
  const launchSingleAccount = async (account) => {
    if (!selectedServer) {
      setError('Please select a server first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await setServer(account, placeId, selectedServer.id);
      const result = await launchAccount(account, placeId);
      
      if (onAction) {
        onAction({
          type: 'launch_single',
          success: true,
          account,
          result
        });
      }
    } catch (error) {
      console.error(`Error launching account ${account}:`, error);
      setError(`Failed to launch ${account}. Please try again.`);
      
      if (onAction) {
        onAction({
          type: 'launch_single',
          success: false,
          account,
          error: error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Search Controls */}
      <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center mb-4">
          <Search className="text-purple-500 mr-2" size={20} />
          <h2 className="text-xl font-bold">Server Finder</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="pageCount" className="block text-sm font-medium mb-1">Page Count</label>
            <select
              id="pageCount"
              className={`w-full p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-50'} backdrop-blur-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none`}
              value={pageCount}
              onChange={(e) => setPageCount(parseInt(e.target.value))}
              disabled={loading || disabled}
            >
              <option value="1">1 Page</option>
              <option value="2">2 Pages</option>
              <option value="3">3 Pages</option>
              <option value="5">5 Pages</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="flex items-center space-x-2 select-none h-full pt-6">
              <div className={`w-5 h-5 flex items-center justify-center rounded ${darkMode ? 'border border-gray-500' : 'border border-gray-400'}`}>
                <input
                  type="checkbox"
                  className="opacity-0 absolute"
                  checked={sortLowest}
                  onChange={() => setSortLowest(!sortLowest)}
                  disabled={loading || disabled}
                />
                {sortLowest && <Check size={16} className="text-purple-500" />}
              </div>
              <span className="text-sm">Show lowest populated servers first</span>
            </label>
          </div>
          
          <div className="flex items-end">
            <button
              className={`w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center ${
                loading || !placeId || disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
              }`}
              onClick={fetchServers}
              disabled={loading || !placeId || disabled}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search size={16} className="mr-2" />
                  Find Servers
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-3 rounded-lg bg-red-100 border border-red-400 text-red-700 flex items-start">
            <AlertTriangle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
      
      {/* Server List */}
      {servers.length > 0 && !joinDifferentServers && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Server className="text-purple-500 mr-2" size={20} />
              <h2 className="text-xl font-bold">Available Servers</h2>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {servers.length}
              </span>
            </div>
          </div>
          
          <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider w-10"></th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Players</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Capacity</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Ping</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">FPS</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider">Server ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {servers.map((server) => (
                    <tr
                      key={server.id}
                      className={`cursor-pointer transition-colors ${
                        selectedServer?.id === server.id 
                          ? (darkMode ? 'bg-purple-900 bg-opacity-30' : 'bg-purple-100') 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setSelectedServer(server)}
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex justify-center">
                          <div className={`w-5 h-5 rounded-full border ${selectedServer?.id === server.id ? 'border-purple-500' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                            {selectedServer?.id === server.id && (
                              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users size={14} className="mr-2 text-blue-500" />
                          <span>{server.playing}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              server.playing / server.maxPlayers > 0.8 
                                ? 'bg-red-500' 
                                : server.playing / server.maxPlayers > 0.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${(server.playing / server.maxPlayers) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs mt-1 text-center">
                          {server.playing}/{server.maxPlayers}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock size={14} className="mr-2 text-green-500" />
                          <span>{server.ping}ms</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <Zap size={14} className="mr-2 text-yellow-500" />
                          <span>{server.fps}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">
                        {server.id.substring(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Account Selection */}
      {accounts.length > 0 && (
        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="text-purple-500 mr-2" size={20} />
              <h2 className="text-xl font-bold">Account Selection</h2>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {selectedAccounts.length}/{accounts.length}
              </span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2 p-3 rounded-lg">
              <div className={`w-5 h-5 flex items-center justify-center rounded ${darkMode ? 'border border-yellow-500' : 'border border-yellow-400'}`}>
                <input
                  type="checkbox"
                  className="opacity-0 absolute"
                  checked={joinDifferentServers}
                  onChange={() => setJoinDifferentServers(!joinDifferentServers)}
                  disabled={loading || disabled}
                />
                {joinDifferentServers && <Check size={16} className="text-yellow-500" />}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">Join Different Servers</span>
                <span className="text-xs text-yellow-700 dark:text-yellow-300">
                  Each account will join a different server automatically - no need to select a specific server
                </span>
              </div>
            </label>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <button
              className={`flex items-center px-4 py-2 rounded-lg text-sm border ${
                darkMode 
                  ? 'border-gray-600 hover:bg-gray-700 text-white' 
                  : 'border-purple-300 hover:bg-purple-50 text-purple-700'
              }`}
              onClick={toggleAllAccounts}
              disabled={loading || disabled}
            >
              {selectedAccounts.length === accounts.length ? (
                <>
                  <Square size={16} className="mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare size={16} className="mr-2" />
                  Select All
                </>
              )}
            </button>
            
            <button
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                loading || selectedAccounts.length === 0 || (!joinDifferentServers && !selectedServer) || disabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
              }`}
              onClick={launchSelectedAccounts}
              disabled={loading || selectedAccounts.length === 0 || (!joinDifferentServers && !selectedServer) || disabled}
            >
              <Play size={16} className="mr-2" />
              Launch Selected ({selectedAccounts.length})
            </button>
          </div>
          
          <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider w-10"></th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {accounts.map((account) => (
                    <tr 
                      key={account} 
                      className={`transition-colors ${
                        selectedAccounts.includes(account)
                          ? (darkMode ? 'bg-purple-900 bg-opacity-20' : 'bg-purple-50')
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div 
                          className={`w-5 h-5 flex items-center justify-center rounded ${
                            darkMode 
                              ? 'border border-gray-500' 
                              : 'border border-gray-400'
                          } cursor-pointer`}
                          onClick={() => toggleAccountSelection(account)}
                        >
                          {/* <input
                            type="checkbox"
                            className="opacity-0 absolute"
                            checked={selectedAccounts.includes(account)}
                            onChange={() => toggleAccountSelection(account)}
                            disabled={loading || disabled}
                          /> */}
                          {selectedAccounts.includes(account) && (
                            <Check size={16} className="text-purple-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                            <Terminal className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="font-medium">{account}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          className={`inline-flex items-center px-3 py-1 rounded text-xs ${
                            loading || disabled || !selectedServer
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800'
                          }`}
                          onClick={() => launchSingleAccount(account)}
                          disabled={loading || disabled || !selectedServer}
                        >
                          <Play size={12} className="mr-1" />
                          Launch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerBrowser;