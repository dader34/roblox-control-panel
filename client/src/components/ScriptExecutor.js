import React, { useState, useEffect } from 'react';

const ScriptExecutor = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch accounts that have active WebSocket connections
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        // Fetch all game data
        const response = await fetch('/api/gameData');
        if (!response.ok) {
          throw new Error('Failed to fetch game data');
        }
        
        const gameData = await response.json();
        
        // Filter accounts with active WebSocket connections
        const connectedAccounts = gameData
          .filter(account => account.hasWebSocket)
          .map(account => account.account);
        
        setAccounts(connectedAccounts);
        
        // Select the first account if none is selected and accounts are available
        if (!selectedAccount && connectedAccounts.length > 0) {
          setSelectedAccount(connectedAccounts[0]);
        }
      } catch (error) {
        console.error('Error fetching connected accounts:', error);
        setError('Failed to load accounts with WebSocket connections');
      }
    };

    fetchConnectedAccounts();
    
    // Poll for connected accounts every 5 seconds
    const interval = setInterval(fetchConnectedAccounts, 5000);
    
    return () => clearInterval(interval);
  }, [selectedAccount]);

  // Fetch execution history for the selected account
  useEffect(() => {
    if (!selectedAccount) return;
    
    const fetchExecutionHistory = async () => {
      try {
        const response = await fetch(`/api/executionHistory/${selectedAccount}`);
        if (!response.ok) {
          console.error('Failed to fetch execution history');
          return;
        }
        
        const data = await response.json();
        if (data.success && data.history) {
          setExecutionHistory(data.history);
        }
      } catch (error) {
        console.error('Error fetching execution history:', error);
      }
    };
    
    fetchExecutionHistory();
    
    // Poll for execution history every 3 seconds
    const interval = setInterval(fetchExecutionHistory, 3000);
    
    return () => clearInterval(interval);
  }, [selectedAccount]);

  const executeScript = async () => {
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }
    
    if (!script.trim()) {
      setError('Please enter a script to execute');
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setExecuting(true);
    
    try {
      const response = await fetch('/api/executeScript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountName: selectedAccount,
          script: script,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Script execution requested (ID: ${data.execId})`);
        // We don't clear the script - user might want to modify and run again
      } else {
        setError(data.message || 'Failed to execute script');
      }
    } catch (error) {
      console.error('Error executing script:', error);
      setError('Failed to send script execution request');
    } finally {
      setExecuting(false);
    }
  };
  
  // Sample scripts for quick execution
  const sampleScripts = [
    {
      name: 'Print Player Position',
      code: `local player = game.Players.LocalPlayer
local position = player.Character and player.Character:GetPrimaryPartCFrame().Position
return "Position: " .. tostring(position)`
    },
    {
      name: 'List All Players',
      code: `local players = game.Players:GetPlayers()
local result = "Players in game: " .. #players .. "\\n"
for i, player in ipairs(players) do
  result = result .. i .. ". " .. player.Name .. " (Display: " .. player.DisplayName .. ")\\n"
end
return result`
    },
    {
      name: 'Get Game Info',
      code: `local result = {}
result.gameId = game.GameId
result.placeId = game.PlaceId
result.placeVersion = game.PlaceVersion
result.jobId = game.JobId
return game:GetService("HttpService"):JSONEncode(result)`
    }
  ];

  const loadSampleScript = (scriptCode) => {
    setScript(scriptCode);
  };
  
  // Format execution timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Format script code for display (truncate if too long)
  const formatScript = (script) => {
    if (!script) return '';
    
    if (script.length > 100) {
      return script.substring(0, 100) + '...';
    }
    
    return script;
  };

  return (
    <div className="script-executor">
      <h2>Remote Script Executor</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      
      <div className="executor-container">
        <div className="executor-panel">
          <div className="form-group">
            <label htmlFor="account">Select Account with WebSocket Connection</label>
            <select
              id="account"
              className="form-control"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={executing}
            >
              <option value="">-- Select Account --</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <div className="no-accounts-message">
                No accounts with active WebSocket connections. Make sure your Roblox script is running with WebSocket support.
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="script">Lua Script</label>
            <textarea
              id="script"
              className="form-control script-textarea"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter Lua script to execute on the selected Roblox client..."
              rows="12"
              disabled={executing}
            ></textarea>
          </div>
          
          <div className="sample-scripts">
            <h4>Sample Scripts</h4>
            <div className="sample-scripts-container">
              {sampleScripts.map((sample, index) => (
                <button
                  key={index}
                  className="btn btn-outline-secondary sample-script-btn"
                  onClick={() => loadSampleScript(sample.code)}
                  disabled={executing}
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group button-group">
            <button
              className="btn btn-primary"
              onClick={executeScript}
              disabled={!selectedAccount || executing}
            >
              {executing ? 'Executing...' : 'Execute Script'}
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={() => setShowHistory(!showHistory)}
              disabled={!selectedAccount}
            >
              {showHistory ? 'Hide Execution History' : 'Show Execution History'}
            </button>
          </div>
        </div>
        
        {showHistory && (
          <div className="history-panel">
            <h3>Execution History</h3>
            {executionHistory.length === 0 ? (
              <p>No execution history available for this account.</p>
            ) : (
              <div className="execution-history">
                {executionHistory.map((entry, index) => (
                  <div key={index} className={`execution-entry ${entry.success ? 'success' : 'error'}`}>
                    <div className="execution-timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                    <div className="execution-script">
                      <code>{formatScript(entry.script)}</code>
                    </div>
                    <div className="execution-result">
                      {entry.success ? (
                        <div className="success-result">{entry.result || 'Executed successfully'}</div>
                      ) : (
                        <div className="error-result">{entry.error || 'Execution failed'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptExecutor;