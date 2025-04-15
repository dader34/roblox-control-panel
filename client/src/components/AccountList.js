import React, { useState, useEffect } from 'react';
import { getAccountsDetailed, getAlias, getDescription, launchAccount } from '../services/api';
import { 
  Users, 
  User, 
  Calendar, 
  Tag, 
  Info, 
  Play, 
  Search,
  Clipboard,
  Clock,
  List,
  AlertCircle,
  Check
} from 'react-feather';

const AccountList = ({ darkMode }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await getAccountsDetailed();
        
        if (Array.isArray(accountsData) && accountsData.length > 0) {
          // Process accounts data
          const processedAccounts = accountsData.map(account => ({
            Username: account.Username,
            UserId: account.UserID || account.UserId, // Handle both capitalizations
            Alias: account.Alias || '',
            Description: account.Description || '',
            Group: account.Group || 'Default',
            LastUsed: account.LastUsed || 0,
            Fields: account.Fields || {}
          }));
          
          setAccounts(processedAccounts);
          
          // Select the first account by default
          if (processedAccounts.length > 0 && !selectedAccount) {
            setSelectedAccount(processedAccounts[0]);
          }
          
          setError('');
        } else {
          setAccounts([]);
          setError('No accounts found. Add accounts to Roblox Account Manager.');
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        setError('Failed to load accounts. Make sure Roblox Account Manager is running.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchAccounts();
  }, [selectedAccount]);

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
  };
  
  const handleLaunchGame = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setError('No account selected');
      return;
    }
    
    if (!placeId) {
      setError('Please enter a Place ID');
      return;
    }
    
    setError('');
    setSuccessMessage('');
    
    try {
      setLoading(true);
      const result = await launchAccount(selectedAccount.Username, placeId);
      setSuccessMessage(`Successfully launched: ${result.account}`);
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error launching account:', error);
      setError(`Failed to launch: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp <= 0) return 'Never';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Extract unique groups for the filter
  const uniqueGroups = ['All', ...new Set(accounts.map(account => account.Group || 'Default'))];
  
  // Filter accounts based on search term and selected group
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.Alias && account.Alias.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGroup = selectedGroup === 'All' || account.Group === selectedGroup;
    
    return matchesSearch && matchesGroup;
  });

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-xl">Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-full ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Users className="text-purple-500 mr-2" size={24} />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Account Manager
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search accounts..."
              className={`pl-10 pr-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white'} border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-64`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white'} border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            {uniqueGroups.map(group => (
              <option key={group} value={group}>
                {group === 'All' ? 'All Groups' : group}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 flex items-center" role="alert">
          <AlertCircle className="mr-2" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 flex items-center" role="alert">
          <Check className="mr-2" size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts List Card */}
        <div className={`lg:col-span-2 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center mb-4">
            <List className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Accounts</h2>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {filteredAccounts.length}
            </span>
          </div>
          
          {filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users size={48} className="text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium mb-2">No accounts found</p>
              <p className="text-gray-400 text-sm">Try changing your search term or filter</p>
            </div>
          ) : (
            <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Username</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Alias</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Group</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Used</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAccounts.map((account) => (
                      <tr 
                        key={account.Username} 
                        className={`cursor-pointer transition-colors ${selectedAccount?.Username === account.Username 
                          ? (darkMode ? 'bg-purple-900 bg-opacity-30' : 'bg-purple-100') 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleAccountSelect(account)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="ml-3">
                              <div className="font-medium">{account.Username}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {account.UserId || 'Unknown'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{account.Alias || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {account.Group || 'Default'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm">{formatDate(account.LastUsed)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className={`inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                              darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccountSelect(account);
                            }}
                          >
                            <Info size={12} className="mr-1" />
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Account Details Card */}
        {selectedAccount ? (
          <div className={`lg:col-span-1 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center mb-4">
              <User className="text-purple-500 mr-2" size={20} />
              <h2 className="text-xl font-bold">Account Details</h2>
            </div>
            
            <div className="mb-6">
              <div className="flex flex-col items-center mb-4">
                <div className="h-20 w-20 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-3">
                  <User className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold">{selectedAccount.Username}</h3>
                {selectedAccount.Alias && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({selectedAccount.Alias})
                  </span>
                )}
              </div>
              
              <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User ID</p>
                    <p className="font-medium">{selectedAccount.UserId || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Group</p>
                    <p className="font-medium">{selectedAccount.Group || 'Default'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Used</p>
                    <p className="font-medium">{formatDate(selectedAccount.LastUsed)}</p>
                  </div>
                </div>
              </div>
              
              {selectedAccount.Description && (
                <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Description</p>
                  <p className="text-sm">{selectedAccount.Description}</p>
                </div>
              )}
              
              {/* Launch Game Form */}
              <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'}`}>
                <div className="flex items-center mb-3">
                  <Play className="text-purple-500 mr-2" size={16} />
                  <h4 className="font-bold">Launch Game</h4>
                </div>
                
                <form onSubmit={handleLaunchGame}>
                  <div className="mb-3">
                    <label htmlFor="placeId" className="block text-sm font-medium mb-1">
                      Place ID
                    </label>
                    <input
                      type="text"
                      id="placeId"
                      className={`w-full p-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      value={placeId}
                      onChange={(e) => setPlaceId(e.target.value)}
                      placeholder="Enter Roblox Place ID"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                      loading || !placeId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                    }`}
                    disabled={loading || !placeId}
                  >
                    <div className="flex items-center justify-center">
                      <Play size={16} className="mr-2" />
                      {loading ? 'Launching...' : 'Launch Game'}
                    </div>
                  </button>
                </form>
              </div>
              
              {/* Custom Fields */}
              {Object.keys(selectedAccount.Fields || {}).length > 0 && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'}`}>
                  <div className="flex items-center mb-3">
                    <Tag className="text-purple-500 mr-2" size={16} />
                    <h4 className="font-bold">Custom Fields</h4>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(selectedAccount.Fields || {}).map(([key, value]) => (
                      <div key={key} className={`p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex justify-between`}>
                        <span className="font-medium">{key}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium border transition-colors ${
                darkMode ? 'border-gray-600 hover:bg-gray-700 text-white' : 'border-purple-300 hover:bg-purple-50 text-purple-700'
              }`}
              onClick={() => {
                navigator.clipboard.writeText(selectedAccount.Username);
                setSuccessMessage('Username copied to clipboard!');
                setTimeout(() => setSuccessMessage(''), 3000);
              }}
            >
              <Clipboard size={16} className="mr-2" />
              Copy Username
            </button>
          </div>
        ) : (
          <div className={`lg:col-span-1 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center`}>
            <User size={48} className="text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium mb-2">No account selected</p>
            <p className="text-gray-400 text-sm text-center">Select an account from the list to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountList;