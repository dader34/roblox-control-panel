import React, { useState, useEffect } from 'react';
import { getAccountsDetailed, getAlias, getDescription, launchAccount } from '../services/api';

const AccountList = ()  => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await getAccountsDetailed();
        console.log('Accounts data:', accountsData);
        console.log(Array.isArray(accountsData))
        console.log(accountsData)
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
      setPlaceId('');
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

  if (loading && accounts.length === 0) {
    return <div>Loading accounts...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="accounts-container">
      <h2>Roblox Accounts</h2>
      
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}
      
      <div className="accounts-grid">
        <div className="accounts-list">
          <div className="table-container">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Alias</th>
                  <th>Group</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr 
                    key={account.Username} 
                    className={selectedAccount?.Username === account.Username ? 'selected' : ''}
                    onClick={() => handleAccountSelect(account)}
                  >
                    <td>{account.Username}</td>
                    <td>{account.Alias || '-'}</td>
                    <td>{account.Group || 'Default'}</td>
                    <td>{formatDate(account.LastUsed)}</td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccountSelect(account);
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {selectedAccount && (
          <div className="account-details">
            <div className="dashboard-card">
              <h3>Account Details</h3>
              <div className="account-info">
                <p><strong>Username:</strong> {selectedAccount.Username}</p>
                <p><strong>User ID:</strong> {selectedAccount.UserId || 'Unknown'}</p>
                <p><strong>Alias:</strong> {selectedAccount.Alias || 'None'}</p>
                <p><strong>Group:</strong> {selectedAccount.Group || 'Default'}</p>
                <p><strong>Last Used:</strong> {formatDate(selectedAccount.LastUsed)}</p>
                
                {selectedAccount.Description && (
                  <div className="description-box">
                    <strong>Description:</strong>
                    <p>{selectedAccount.Description}</p>
                  </div>
                )}
                
                <div className="launch-form">
                  <h4>Launch Game</h4>
                  <form onSubmit={handleLaunchGame}>
                    <div className="form-group">
                      <label htmlFor="placeId">Place ID:</label>
                      <input
                        type="text"
                        id="placeId"
                        className="form-control"
                        value={placeId}
                        onChange={(e) => setPlaceId(e.target.value)}
                        placeholder="Enter Roblox Place ID"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !placeId}
                    >
                      Launch Game
                    </button>
                  </form>
                </div>
                
                {Object.keys(selectedAccount.Fields || {}).length > 0 && (
                  <div className="fields-container">
                    <h4>Custom Fields</h4>
                    <table className="fields-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedAccount.Fields || {}).map(([key, value]) => (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountList;