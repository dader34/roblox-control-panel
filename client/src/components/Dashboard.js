import React, { useState, useEffect } from 'react';
import { getAccounts, getProcesses, launchAccount, setRecommendedServer, getGameData } from '../services/api';
import ServerBrowser from './ServerBrowser';

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [gameData, setGameData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [placeId, setPlaceId] = useState('104715542330896');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showServerBrowser, setShowServerBrowser] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(null); // Track which account has expanded details
  const [totalMoney, setTotalMoney] = useState(0); // Track total money across all accounts
  const [totalBankMoney, setTotalBankMoney] = useState(0); // Track total bank money across all accounts

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsData, processesData, gameDataResponse] = await Promise.all([
          getAccounts(),
          getProcesses(),
          getGameData()
        ]);
        
        setAccounts(accountsData);
        setProcesses(processesData);
        setGameData(gameDataResponse);
        
        // Calculate total money and bank money
        calculateTotals(gameDataResponse);
        
        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0]);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Make sure Roblox Account Manager is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling for process and game data
    const interval = setInterval(async () => {
      try {
        const [processesData, gameDataResponse] = await Promise.all([
          getProcesses(),
          getGameData()
        ]);
        setProcesses(processesData);
        setGameData(gameDataResponse);
        
        // Update totals when game data refreshes
        calculateTotals(gameDataResponse);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate totals across all accounts
  const calculateTotals = (data) => {
    let moneyTotal = 0;
    let bankMoneyTotal = 0;
    
    data.forEach(account => {
      // Handle money (on hand)
      if (typeof account.money === 'number') {
        moneyTotal += account.money;
      } else if (typeof account.money === 'string') {
        // Remove currency symbols and commas, then parse as number
        const cleanedMoney = account.money.replace(/[$,£€]/g, '');
        const moneyValue = parseFloat(cleanedMoney);
        if (!isNaN(moneyValue)) {
          moneyTotal += moneyValue;
        }
      }
      
      // Handle bank money
      if (account.bankMoney) {
        if (typeof account.bankMoney === 'number') {
          bankMoneyTotal += account.bankMoney;
        } else if (typeof account.bankMoney === 'string') {
          // Remove currency symbols and commas, then parse as number
          const cleanedBankMoney = account.bankMoney.replace(/[$,£€]/g, '');
          const bankMoneyValue = parseFloat(cleanedBankMoney);
          if (!isNaN(bankMoneyValue)) {
            bankMoneyTotal += bankMoneyValue;
          }
        }
      }
    });
    
    setTotalMoney(moneyTotal);
    setTotalBankMoney(bankMoneyTotal);
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount) {
      setError('Please select an account');
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
      
      // First set recommended server
      try {
        await setRecommendedServer(selectedAccount, placeId);
        console.log('Successfully set recommended server');
      } catch (serverError) {
        console.error('Warning: Could not set recommended server:', serverError);
        // Continue with launch even if server setting fails
      }
      
      // Then launch the game
      const result = await launchAccount(selectedAccount, placeId);
      setSuccessMessage(`Successfully launched: ${result}`);
      
      // Refresh process list after launch
      setTimeout(async () => {
        const processesData = await getProcesses();
        setProcesses(processesData);
      }, 5000);
    } catch (error) {
      console.error('Error launching account:', error);
      setError(`Failed to launch: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleServerBrowserAction = (action) => {
    if (action.success) {
      if (action.type === 'launch_multiple') {
        const successCount = action.results.filter(r => r.success).length;
        setSuccessMessage(`Successfully launched ${successCount}/${action.results.length} accounts`);
      } else if (action.type === 'launch_single') {
        setSuccessMessage(`Successfully launched ${action.account}`);
      }
      
      // Refresh process list after launch
      setTimeout(async () => {
        const processesData = await getProcesses();
        setProcesses(processesData);
      }, 5000);
    } else {
      setError(action.error || 'An error occurred during the operation');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  const refreshGameData = async () => {
    try {
      const data = await getGameData();
      setGameData(data);
      calculateTotals(data);
    } catch (error) {
      console.error('Error refreshing game data:', error);
    }
  };

  // Helper function to get health bar color based on percentage
  const getHealthColor = (health, maxHealth) => {
    const percentage = (health / maxHealth) * 100;
    
    if (percentage > 66) {
      return '#4CAF50'; // Green
    } else if (percentage > 33) {
      return '#FFC107'; // Yellow/Orange
    } else {
      return '#F44336'; // Red
    }
  };

  // Format money value with commas
  const formatMoney = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value || '0';
  };

  // Toggle expanded details for a specific account
  const toggleDetails = (account) => {
    if (expandedDetails === account) {
      setExpandedDetails(null); // Collapse if already expanded
    } else {
      setExpandedDetails(account); // Expand this account
    }
  };

  // Calculate grand total (pocket + bank)
  const grandTotal = totalMoney + totalBankMoney;

  if (loading && accounts.length === 0) {
    return <div className="dashboard">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-card">
        <h3>Quick Launch</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        <form onSubmit={handleLaunch}>
          <div className="form-group">
            <label htmlFor="account">Account</label>
            <select
              id="account"
              className="form-control"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              disabled={loading}
            >
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="placeId">Place ID</label>
            <input
              type="text"
              id="placeId"
              className="form-control"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              placeholder="Enter Roblox Place ID"
              disabled={loading}
            />
          </div>
          <div className="form-group button-group">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedAccount || !placeId}
            >
              {loading ? 'Launching...' : 'Launch Game'}
            </button>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowServerBrowser(!showServerBrowser)}
              disabled={!placeId}
            >
              {showServerBrowser ? 'Hide Server Browser' : 'Show Server Browser'}
            </button>
          </div>
        </form>
      </div>
      
      {showServerBrowser && (
        <div className="dashboard-card">
          <h3>Server Browser</h3>
          <ServerBrowser
            placeId={placeId}
            accounts={accounts}
            onAction={handleServerBrowserAction}
            disabled={loading}
          />
        </div>
      )}
      
      <div className="dashboard-card game-data-container">
        <h3>
          Game Data
          <button 
            className="btn btn-sm btn-secondary refresh-btn"
            onClick={refreshGameData}
            disabled={loading}
          >
            Refresh
          </button>
        </h3>
        
        {gameData.length === 0 ? (
          <div className="no-data-message">
            <p>No game data available. Run the Roblox script in your game:</p>
            <pre className="lua-code">
{`--Run this to monitor your players stats in block spin
local player = game.Players.LocalPlayer 
local bankMoneyLocation = nil
local playerGui = game.Players.LocalPlayer.PlayerGui
for i,v in pairs(playerGui:children()) do
    local firstLetter = string.sub(v.Name,0,1)
    if(tonumber(firstLetter)) then
        bankMoneyLocation = v
        break
    end
end


function makeRequest()

    local unformattedBankMoney = bankMoneyLocation:FindFirstChildOfClass('Frame'):FindFirstChildOfClass('Frame'):FindFirstChild('Options'):FindFirstChildOfClass('TextLabel').text
    local bankMoney = string.sub(unformattedBankMoney,16)

    local otherData = {
        playerName = player.Name,
        displayName = player.DisplayName,
        position = tostring(player.Character and player.Character:GetPrimaryPartCFrame().Position or Vector3.new(0,0,0)),
        health = player.Character and player.Character:FindFirstChild("Humanoid") and player.Character.Humanoid.Health or 0,
        maxHealth = player.Character and player.Character:FindFirstChild("Humanoid") and player.Character.Humanoid.MaxHealth or 0,
        level = player.PlayerGui.LevelUp.Frame.LevelCardHolder.LevelCard.TextLabel.text
    }
    
    local JSON = {
        accountName = player.Name,
        money = player.PlayerGui.TopRightHud.Holder.Frame.MoneyTextLabel.text,
        bankMoney = bankMoney,
        placeId = game.PlaceId,
        otherData = otherData
    }
    
    local encodedData = game:GetService("HttpService"):JSONEncode(JSON)
    
    local r_t = {
        Url = 'http://localhost:3000/api/gameData',
        Method = 'POST',
        Headers = {['Content-Type'] = 'application/json'},
        Body = encodedData
    }

    http_request(r_t)
    
end

-- Get the Players service
local Players = game:GetService("Players")

-- Function to detect when the local player is leaving
local function onPlayerLeaving(leavingPlayer)

    local leaveJSON = {
        accountName = player.Name
    }

    local leaveGameData = game:GetService("HttpService"):JSONEncode(leaveJSON)

    local r_s = {
        Url = 'http://localhost:3000/api/leaveGame',
        Method = 'POST',
        Headers = {['Content-Type'] = 'application/json'},
        Body = leaveGameData
    }

    -- Check if it's the local player who's leaving
    if leavingPlayer == player then
        -- Send leave notification to server
        pcall(function()
            http_request(r_s)
        end)
    end
end

-- Connect to the PlayerRemoving event
Players.PlayerRemoving:Connect(onPlayerLeaving)

-- Also detect game closing if possible
if game:GetService("CoreGui"):FindFirstChild("RobloxPromptGui") then
    game:GetService("CoreGui").RobloxPromptGui.promptOverlay.ChildAdded:Connect(function(child)
        if child.Name == "ErrorPrompt" then
            pcall(function()
                onPlayerLeaving(player.Name)
            end)
        end
    end)
end

spawn(function()
    makeRequest()
    while wait(10) do
        makeRequest()
    end
end)`}
            </pre>
          </div>
        ) : (
          <div>
            {/* Money Stats Display */}
            <div className="money-stats-container">
              <div className="money-stats-grid">
                {/* Pocket Money Card */}
                <div className="money-stats-card">
                  <div className="money-stats-icon pocket-icon">💰</div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Pocket Money</div>
                    <div className="money-stats-value">${formatMoney(totalMoney)}</div>
                  </div>
                </div>
                
                {/* Bank Money Card */}
                <div className="money-stats-card">
                  <div className="money-stats-icon bank-icon">🏦</div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Bank Money</div>
                    <div className="money-stats-value">${formatMoney(totalBankMoney)}</div>
                  </div>
                </div>
                
                {/* Total Money Card */}
                <div className="money-stats-card total-card">
                  <div className="money-stats-icon total-icon">💎</div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Grand Total</div>
                    <div className="money-stats-value grand-total">${formatMoney(grandTotal)}</div>
                  </div>
                </div>
              </div>
              <div className="money-stats-footer">
                Combined from {gameData.length} active accounts
              </div>
            </div>

            <div className="table-container">
              <table className="game-data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Pocket</th>
                    <th>Bank</th>
                    <th>Level</th>
                    <th>Health</th>
                    <th>Place ID</th>
                    <th>Last Update</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gameData.map((data) => (
                    <React.Fragment key={data.account}>
                      <tr>
                        <td>{data.account}</td>
                        <td className="money-cell">
                          {typeof data.money === 'number' 
                            ? data.money.toLocaleString() 
                            : data.money || '0'}
                        </td>
                        <td className="money-cell">
                          ${typeof data.bankMoney === 'number' 
                            ? data.bankMoney.toLocaleString() 
                            : data.bankMoney || '0'}
                        </td>
                        <td>
                          {data.otherData?.level || '0'}
                        </td>
                        <td className="health-cell">
                          {data.otherData ? (
                            <>
                              <span>{data.otherData.health} / {data.otherData.maxHealth}</span>
                              <div className="health-bar-container">
                                <div 
                                  className="health-bar" 
                                  style={{ 
                                    width: `${(data.otherData.health / data.otherData.maxHealth) * 100}%`,
                                    backgroundColor: getHealthColor(data.otherData.health, data.otherData.maxHealth)
                                  }} 
                                />
                              </div>
                            </>
                          ) : '0 / 0'}
                        </td>
                        <td>{data.placeId}</td>
                        <td>{formatDate(data.lastUpdate)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-info toggle-details-btn"
                            onClick={() => toggleDetails(data.account)}
                          >
                            {expandedDetails === data.account ? 'Hide Details' : 'Show Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedDetails === data.account && data.otherData && (
                        <tr className="details-row">
                          <td colSpan="8">
                            <div className="player-detail-card">
                              <div className="player-stats">
                                <div className="stat-row">
                                  <div className="stat-label">Player Name:</div>
                                  <div className="stat-value">{data.otherData.playerName}</div>
                                </div>
                                <div className="stat-row">
                                  <div className="stat-label">Display Name:</div>
                                  <div className="stat-value">{data.otherData.displayName}</div>
                                </div>
                                <div className="stat-row">
                                  <div className="stat-label">Position:</div>
                                  <div className="stat-value">{data.otherData.position}</div>
                                </div>
                              </div>
                            </div>
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
      
      <div className="dashboard-card">
        <h3>Active Instances ({processes.length})</h3>
        {processes.length === 0 ? (
          <p>No Roblox instances currently running</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Account</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.pid} className={process.account ? 'has-account' : ''}>
                    <td>{process.pid}</td>
                    <td>{process.account || 'Unknown'}</td>
                    <td>{process.memoryUsage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;