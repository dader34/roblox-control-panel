import React, { useState, useEffect } from 'react';
import { getServers, launchAccount, launchMultipleAccounts, setServer } from '../services/api';

function ServerBrowser({ placeId, accounts, onAction, disabled }) {
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
    <div className="server-browser">
      <div className="browser-controls">
        <div className="form-group">
          <label htmlFor="pageCount">Page Count:</label>
          <select
            id="pageCount"
            className="form-control"
            value={pageCount}
            onChange={(e) => setPageCount(parseInt(e.target.value))}
            disabled={loading || disabled}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="5">5</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={sortLowest}
              onChange={() => setSortLowest(!sortLowest)}
              disabled={loading || disabled}
            />
            Show lowest populated servers first
          </label>
        </div>
        
        <button
          className="btn btn-primary"
          onClick={fetchServers}
          disabled={loading || !placeId || disabled}
        >
          {loading ? 'Loading...' : 'Find Servers'}
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {servers.length > 0 && !joinDifferentServers && (
        <div className="server-list">
          <h4>Available Servers ({servers.length})</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Players</th>
                  <th>Capacity</th>
                  <th>Ping</th>
                  <th>FPS</th>
                  <th>Server ID</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => (
                  <tr
                    key={server.id}
                    className={selectedServer?.id === server.id ? 'selected' : ''}
                    onClick={() => setSelectedServer(server)}
                  >
                    <td>
                      <input
                        type="radio"
                        name="serverSelect"
                        checked={selectedServer?.id === server.id}
                        onChange={() => setSelectedServer(server)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>{server.playing}</td>
                    <td>{server.maxPlayers}</td>
                    <td>{server.ping}</td>
                    <td>{server.fps}</td>
                    <td>{server.id.substring(0, 8)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {accounts.length > 0 && (
        <div className="account-selection">
          <h4>Select Accounts to Launch</h4>
          
          <div className="form-group join-options">
            <label>
              <input
                type="checkbox"
                checked={joinDifferentServers}
                onChange={() => setJoinDifferentServers(!joinDifferentServers)}
                disabled={loading || disabled}
              />
              Join Different Servers (each account will join a different server)
            </label>
            {joinDifferentServers && (
              <div className="different-servers-notice">
                <small>
                  <strong>Note:</strong> When enabled, accounts will be assigned to different servers automatically. 
                  You don't need to select a specific server.
                </small>
              </div>
            )}
          </div>
          
          <div className="select-controls">
            <button
              className="btn btn-sm btn-secondary"
              onClick={toggleAllAccounts}
              disabled={loading || disabled}
            >
              {selectedAccounts.length === accounts.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              className="btn btn-sm btn-primary"
              onClick={launchSelectedAccounts}
              disabled={loading || selectedAccounts.length === 0 || (!joinDifferentServers && !selectedServer) || disabled}
            >
              Launch Selected ({selectedAccounts.length})
            </button>
          </div>
          
          <div className="account-list">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account)}
                          onChange={() => toggleAccountSelection(account)}
                          disabled={loading || disabled}
                        />
                      </td>
                      <td>{account}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => launchSingleAccount(account)}
                          disabled={loading || disabled || !selectedServer}
                        >
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
}

export default ServerBrowser;