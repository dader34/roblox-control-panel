import React, { useState, useEffect } from 'react';
import { getMoneyTracking, getAccountMoneyTracking, resetMoneyTracking } from '../services/api';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  Award, 
  AlertTriangle,
  CheckCircle,
  BarChart2,
  PieChart,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'react-feather';

const MoneyTracking = ({ darkMode }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [accountDetails, setAccountDetails] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  
  // Fetch money tracking data
  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const data = await getMoneyTracking();
      setTrackingData(data);
      setError('');
    } catch (error) {
      console.error('Error fetching money tracking data:', error);
      setError('Failed to load money tracking data');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch detailed data for an account
  const fetchAccountDetails = async (accountName) => {
    try {
      const data = await getAccountMoneyTracking(accountName);
      setAccountDetails(prev => ({
        ...prev,
        [accountName]: data
      }));
    } catch (error) {
      console.error(`Error fetching details for ${accountName}:`, error);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchTrackingData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchTrackingData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Toggle expanded state for an account
  const toggleAccountExpand = (accountName) => {
    if (expandedAccounts.includes(accountName)) {
      setExpandedAccounts(expandedAccounts.filter(acc => acc !== accountName));
    } else {
      setExpandedAccounts([...expandedAccounts, accountName]);
      
      // Fetch detailed data if not already loaded
      if (!accountDetails[accountName]) {
        fetchAccountDetails(accountName);
      }
    }
  };
  
  // Format money value
  const formatMoney = (value) => {
    if (value === undefined || value === null) return '$0';
    return '$' + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Calculate time difference in readable format
  const getTimeDiff = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      
      // Convert to minutes, hours, days
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return 'Unknown';
    }
  };
  
  // Reset tracking for an account
  const handleResetTracking = async (accountName) => {
    if (window.confirm(`Are you sure you want to reset money tracking for ${accountName}? This cannot be undone.`)) {
      try {
        setLoading(true);
        const result = await resetMoneyTracking(accountName);
        
        setSuccessMessage(`Money tracking reset for ${accountName}`);
        
        // Refresh data
        await fetchTrackingData();
        
        // Clear account details from cache
        setAccountDetails(prev => {
          const newDetails = {...prev};
          delete newDetails[accountName];
          return newDetails;
        });
        
        // Auto-dismiss message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } catch (error) {
        console.error('Error resetting tracking:', error);
        setError(`Failed to reset tracking for ${accountName}`);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Filter accounts based on selected timeframe
  const filterAccountsByTimeframe = () => {
    if (!trackingData || !trackingData.accountSummaries) return [];
    
    const accounts = Object.entries(trackingData.accountSummaries);
    
    if (selectedTimeframe === 'all') {
      return accounts;
    }
    
    // Filter based on last update time
    const now = new Date();
    return accounts.filter(([_, accountData]) => {
      if (!accountData.lastUpdate) return false;
      
      const lastUpdate = new Date(accountData.lastUpdate);
      const diffMs = now - lastUpdate;
      
      if (selectedTimeframe === 'today') {
        // Last 24 hours
        return diffMs < 24 * 60 * 60 * 1000;
      } else if (selectedTimeframe === 'week') {
        // Last 7 days
        return diffMs < 7 * 24 * 60 * 60 * 1000;
      } else if (selectedTimeframe === 'month') {
        // Last 30 days
        return diffMs < 30 * 24 * 60 * 60 * 1000;
      }
      
      return true;
    });
  };
  
  // Sort accounts based on total earned
  const getSortedAccounts = () => {
    const filteredAccounts = filterAccountsByTimeframe();
    return filteredAccounts.sort((a, b) => b[1].totalEarned - a[1].totalEarned);
  };
  
  if (loading && !trackingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-xl">Loading money tracking data...</p>
      </div>
    );
  }
  
  return (
    <div className={`p-6 max-w-full ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <DollarSign className="text-purple-500 mr-2" size={24} />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Money Tracking System
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Timeframe filter */}
          <select
            className={`px-3 py-2 rounded-lg text-sm ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-700'
            } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          <button
            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
            } border border-gray-300 dark:border-gray-600`}
            onClick={fetchTrackingData}
            disabled={loading}
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 flex items-center" role="alert">
          <AlertTriangle className="mr-2" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 flex items-center" role="alert">
          <CheckCircle className="mr-2" size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      
      {/* Summary Cards */}
      {trackingData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Total Earned */}
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex items-center`}>
            <div className="rounded-full p-3 bg-green-100 text-green-600 mr-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm opacity-70">Total Money Earned</p>
              <h3 className="text-2xl font-bold">{formatMoney(trackingData.totalEarned)}</h3>
            </div>
          </div>
          
          {/* Top Earning Account */}
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex items-center`}>
            <div className="rounded-full p-3 bg-purple-100 text-purple-600 mr-4">
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm opacity-70">Top Earning Account</p>
              <h3 className="text-xl font-bold truncate">{trackingData.topEarningAccount || 'None'}</h3>
              {trackingData.topEarningAmount > 0 && (
                <p className="text-sm opacity-70">{formatMoney(trackingData.topEarningAmount)}</p>
              )}
            </div>
          </div>
          
          {/* Active Accounts */}
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex items-center`}>
            <div className="rounded-full p-3 bg-blue-100 text-blue-600 mr-4">
              <BarChart2 size={24} />
            </div>
            <div>
              <p className="text-sm opacity-70">Active Earning Accounts</p>
              <h3 className="text-2xl font-bold">{trackingData.accountsWithEarnings || 0}</h3>
              <p className="text-sm opacity-70">of {Object.keys(trackingData.accountSummaries || {}).length} total</p>
            </div>
          </div>
          
          {/* Last Update */}
          <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex items-center`}>
            <div className="rounded-full p-3 bg-orange-100 text-orange-600 mr-4">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm opacity-70">Data Last Updated</p>
              <h3 className="text-lg font-bold">{getTimeDiff(trackingData.lastUpdate)}</h3>
              <p className="text-xs opacity-70">{formatDate(trackingData.lastUpdate)}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Account List */}
      {trackingData && trackingData.accountSummaries && (
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center mb-4">
            <PieChart className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Account Earnings</h2>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {getSortedAccounts().length}
            </span>
          </div>
          
          {getSortedAccounts().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign size={48} className="text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium mb-2">No earning accounts found</p>
              <p className="text-gray-400 text-sm">Start earning to see tracking data</p>
            </div>
          ) : (
            <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Earned</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Current Balance</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Net Change</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Hourly Rate</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Activity</th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {getSortedAccounts().map(([accountName, accountData]) => (
                      <React.Fragment key={accountName}>
                        <tr className={`transition-colors ${
                          accountData.totalEarned > 0 
                            ? (darkMode ? 'hover:bg-green-900 hover:bg-opacity-20' : 'hover:bg-green-50') 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        } cursor-pointer`} onClick={() => toggleAccountExpand(accountName)}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                accountData.totalEarned > 0 
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' 
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                              }`}>
                                <DollarSign className="h-4 w-4" />
                              </div>
                              <div className="ml-3">
                                <div className="font-medium">{accountName}</div>
                              </div>
                              <div className="ml-2">
                                {expandedAccounts.includes(accountName) 
                                  ? <ChevronUp size={16} className="text-gray-500" /> 
                                  : <ChevronDown size={16} className="text-gray-500" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">
                            {formatMoney(accountData.totalEarned)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {formatMoney(accountData.currentTotal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              accountData.netChange > 0 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : accountData.netChange < 0 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}>
                              {accountData.netChange > 0 ? '+' : ''}{formatMoney(accountData.netChange)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {accountData.hourlyRate > 0 
                              ? formatMoney(accountData.hourlyRate) + '/hr' 
                              : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {getTimeDiff(accountData.lastUpdate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900 dark:hover:bg-red-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResetTracking(accountName);
                              }}
                              title="Reset tracking for this account"
                            >
                              <Trash2 size={14} className="mr-1" />
                              Reset
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded details row */}
                        {expandedAccounts.includes(accountName) && (
                          <tr className={darkMode ? 'bg-gray-700 bg-opacity-30' : 'bg-purple-50 bg-opacity-50'}>
                            <td colSpan="7" className="px-8 py-4">
                              {accountDetails[accountName] ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                      <p className="text-xs uppercase opacity-70 mb-1">Starting Balance</p>
                                      <p className="font-medium">
                                        Pocket: {formatMoney(accountDetails[accountName].startingMoney || 0)}
                                      </p>
                                      <p className="font-medium">
                                        Bank: {formatMoney(accountDetails[accountName].startingBankMoney || 0)}
                                      </p>
                                      <p className="font-medium mt-1">
                                        Total: {formatMoney((accountDetails[accountName].startingMoney || 0) + 
                                                          (accountDetails[accountName].startingBankMoney || 0))}
                                      </p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                      <p className="text-xs uppercase opacity-70 mb-1">Current Balance</p>
                                      <p className="font-medium">
                                        Pocket: {formatMoney(accountDetails[accountName].currentMoney || 0)}
                                      </p>
                                      <p className="font-medium">
                                        Bank: {formatMoney(accountDetails[accountName].currentBankMoney || 0)}
                                      </p>
                                      <p className="font-medium mt-1">
                                        Total: {formatMoney(accountDetails[accountName].currentMoney + 
                                                          accountDetails[accountName].currentBankMoney)}
                                      </p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                      <p className="text-xs uppercase opacity-70 mb-1">Tracking Stats</p>
                                      <p className="font-medium">
                                        Total Earned: {formatMoney(accountDetails[accountName].totalEarned)}
                                      </p>
                                      <p className="font-medium">
                                        History Entries: {accountDetails[accountName].history?.length || 0}
                                      </p>
                                      <p className="font-medium">
                                        Last Updated: {formatDate(accountDetails[accountName].lastUpdate)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Earnings History */}
                                  {accountDetails[accountName].history && accountDetails[accountName].history.length > 0 && (
                                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                      <p className="text-sm font-medium mb-2">Recent Earnings History</p>
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                          <thead>
                                            <tr>
                                              <th className="px-3 py-2 text-left text-xs font-medium">Time</th>
                                              <th className="px-3 py-2 text-left text-xs font-medium">Amount Earned</th>
                                              <th className="px-3 py-2 text-left text-xs font-medium">New Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {accountDetails[accountName].history.slice().reverse().slice(0, 10).map((entry, index) => (
                                              <tr key={index} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                                                <td className="px-3 py-2 text-xs">{formatDate(entry.timestamp)}</td>
                                                <td className="px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400">
                                                  +{formatMoney(entry.earned)}
                                                </td>
                                                <td className="px-3 py-2 text-xs">{formatMoney(entry.newTotal)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      {accountDetails[accountName].history.length > 10 && (
                                        <p className="text-xs text-right mt-2 text-gray-500">
                                          Showing 10 of {accountDetails[accountName].history.length} entries
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex justify-center items-center h-24">
                                  <RefreshCw size={24} className="animate-spin text-purple-500 mr-3" />
                                  <p>Loading account details...</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoneyTracking;