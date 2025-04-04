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
  const [showMonitoringScript, setShowMonitoringScript] = useState(true); // Control script visibility

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

  // The monitoring script content
  const monitoringScript = `
-- Put this in your autoexecute
-- Roblox Player Monitoring and Remote Script Execution
-- This script monitors player stats and enables remote script execution via WebSocket

wait(10)
print('Starting load')

-- Initialize variables
local player = game.Players.LocalPlayer
local playerGui = player.PlayerGui
local HttpService = game:GetService("HttpService")
local serverUrl = "http://localhost:3000"
local wsUrl = "ws://localhost:3000"

-- Configuration
local PING_INTERVAL = 30 -- seconds
local HEALTH_CHANGE_THRESHOLD = 0.01 -- 1% of max health
local MAX_RECONNECT_ATTEMPTS = 10
local RECONNECT_DELAY = 5 -- seconds
local UPDATE_INTERVAL = 10 -- seconds

-- State tracking
local bankMoneyLocation = nil
local lastHealth = 0
local ws = nil
local connected = false
local reconnectAttempts = 0
local lastPingTime = 0

-- Find the bank money UI element (specific to Block Spin)
local function findBankMoneyLocation()
    for _, v in pairs(playerGui:GetChildren()) do
        local firstLetter = string.sub(v.Name, 0, 1)
        if tonumber(firstLetter) then
            print("Found bank money location: " .. v.Name)
            return v
        end
    end
    warn("Could not find bank money location")
    return nil
end

-- Extract player stats
local function getPlayerStats()
    -- Get health data
    local health = 0
    local maxHealth = 0
    if player.Character and player.Character:FindFirstChild("Humanoid") then
        health = player.Character.Humanoid.Health
        maxHealth = player.Character.Humanoid.MaxHealth
    end
    
    -- Get level data
    local level = "0"
    pcall(function()
        level = player.PlayerGui.LevelUp.Frame.LevelCardHolder.LevelCard.TextLabel.text
    end)
    
    -- Get position
    local position = "0, 0, 0"
    pcall(function()
        position = tostring(player.Character and player.Character:GetPrimaryPartCFrame().Position or Vector3.new(0,0,0))
    end)
    
    return {
        playerName = player.Name,
        displayName = player.DisplayName,
        position = position,
        health = health,
        maxHealth = maxHealth,
        level = level
    }
end

-- Get bank money amount
local function getBankMoney()
    if not bankMoneyLocation then 
        print('Not found')
        return "0" 
    end
    
    local bankMoney = "0"
    pcall(function()
        local unformattedBankMoney = bankMoneyLocation:FindFirstChildOfClass('Frame')
            :FindFirstChildOfClass('Frame')
            :FindFirstChild('Options')
            :FindFirstChildOfClass('TextLabel').text
        bankMoney = string.sub(unformattedBankMoney, 16)
    end)
    print(bankMoney)
    return bankMoney
end

print(player.Name)

-- Get pocket money amount
local function getPocketMoney()
    local money = "0"
    pcall(function()
        money = player.PlayerGui.TopRightHud.Holder.Frame.MoneyTextLabel.text
    end)
    return money
end

-- Send game data to server
function sendGameData(isReconnect)
    local otherData = getPlayerStats()
    
    local data = {
        accountName = player.Name,
        money = getPocketMoney(),
        bankMoney = getBankMoney(),
        placeId = game.PlaceId,
        otherData = otherData,
        hasWebSocket = connected -- Always send current WebSocket status
    }

    print(data.bankMoney)
    
    -- Create and send HTTP request
    local encodedData = HttpService:JSONEncode(data)
    local request = {
        Url = serverUrl .. '/api/gameData',
        Method = 'POST',
        Headers = {['Content-Type'] = 'application/json'},
        Body = encodedData
    }
    
    pcall(function()
        http_request(request)
        
        if isReconnect then
            print("Sent game data after reconnection with WebSocket status: " .. tostring(connected))
        end
    end)
    
    -- Update last health
    lastHealth = otherData.health
end

-- Send leave notification to server
local function sendLeaveNotification()
    local leaveData = {
        accountName = player.Name
    }
    
    local encodedData = HttpService:JSONEncode(leaveData)
    local request = {
        Url = serverUrl .. '/api/leaveGame',
        Method = 'POST',
        Headers = {['Content-Type'] = 'application/json'},
        Body = encodedData
    }
    
    pcall(function()
        http_request(request)
    end)
end

-- WebSocket Functions
local function setupWebSocket()
    if not WebSocket then
        warn("WebSocket is not available in this Roblox environment")
        return false
    end
    
    local success = pcall(function()
        -- Connect to WebSocket server
        ws = WebSocket.connect(wsUrl)
        
        -- Handle received messages
        ws.OnMessage:Connect(function(message)
            local success, data = pcall(function()
                return HttpService:JSONDecode(message)
            end)
            
            if not success then
                warn("Failed to decode WebSocket message")
                return
            end
            
            -- Handle message types
            if data.type == "init_ack" then
                print("WebSocket connection initialized and acknowledged by server")
                connected = true
                reconnectAttempts = 0
                
                -- Immediately send a game data update to ensure server has latest info
                sendGameData(true) -- Pass true to indicate this is after reconnection
                
            elseif data.type == "execute" then
                print("Executing script: " .. data.execId)
                
                -- Execute the script and capture result
                local execSuccess, execResult = pcall(function()
                    return loadstring(data.script)()
                end)
                
                -- Send result back to server
                ws:Send(HttpService:JSONEncode({
                    type = "exec_result",
                    execId = data.execId,
                    success = execSuccess,
                    result = execSuccess and (tostring(execResult) or "Script executed successfully") or nil,
                    error = not execSuccess and tostring(execResult) or nil,
                    script = data.script:sub(1, 100) .. (data.script:len() > 100 and "..." or "")
                }))
                
                if execSuccess then
                    print("Script executed successfully")
                else
                    warn("Script execution failed:", execResult)
                end
            elseif data.type == "pong" then
                -- Heartbeat response received, reset the ping timer
                lastPingTime = tick()
            elseif data.type == "error" then
                warn("Server reported error:", data.message)
            end
        end)
        
        -- Handle connection close
        ws.OnClose:Connect(function()
            print("WebSocket connection closed")
            connected = false
            
            -- Try to reconnect with exponential backoff
            if reconnectAttempts < MAX_RECONNECT_ATTEMPTS then
                reconnectAttempts = reconnectAttempts + 1
                local delay = RECONNECT_DELAY * reconnectAttempts
                
                print("WebSocket closed. Reconnecting in " .. delay .. " seconds (attempt " .. reconnectAttempts .. ")")
                wait(delay)
                setupWebSocket()
            else
                warn("Failed to reconnect WebSocket after " .. MAX_RECONNECT_ATTEMPTS .. " attempts")
                
                -- Reset reconnect attempts after waiting a longer period
                wait(60)
                reconnectAttempts = 0
                print("Resetting reconnect attempts and trying again")
                setupWebSocket()
            end
        end)
        
        -- Send initialization message
        local initMessage = HttpService:JSONEncode({
            type = "init",
            accountName = player.Name,
            placeId = game.PlaceId
        })
        ws:Send(initMessage)
        
        print("Sent WebSocket initialization message")
    end)
    
    if not success then
        warn("Failed to setup WebSocket")
        return false
    end
    
    return true
end

-- Send ping to keep WebSocket alive
local function pingWebSocket()
    if ws and connected then
        local currentTime = tick()
        
        if currentTime - lastPingTime > PING_INTERVAL then
            pcall(function()
                ws:Send(HttpService:JSONEncode({
                    type = "ping",
                    timestamp = currentTime
                }))
            end)
            lastPingTime = currentTime
        end
    end
end


-- Handle health changes
local function monitorHealth(humanoid)
    humanoid.HealthChanged:Connect(function(newHealth)
        local healthDecrease = lastHealth - newHealth
        local significantChange = healthDecrease > (humanoid.MaxHealth * HEALTH_CHANGE_THRESHOLD)
        
        if significantChange and healthDecrease > 0 then
            print("Health dropped by " .. healthDecrease .. ", sending update")
            sendGameData()
        end
    end)
end

-- Setup health monitoring
local function setupHealthMonitoring()
    -- Monitor current character
    if player.Character and player.Character:FindFirstChild("Humanoid") then
        lastHealth = player.Character.Humanoid.Health
        monitorHealth(player.Character.Humanoid)
    end
    
    -- Monitor future characters (respawns)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        lastHealth = humanoid.Health
        monitorHealth(humanoid)
    end)
end

-- Setup game closing detection
local function setupGameClosingDetection()
    -- Player leaving
    player.PlayerRemoving:Connect(function(leavingPlayer)
        if leavingPlayer == player then
            if ws and connected then
                pcall(function() ws:Close() end)
            end
            sendLeaveNotification()
        end
    end)
    
    -- Game crashing/closing
    if game:GetService("CoreGui"):FindFirstChild("RobloxPromptGui") then
        game:GetService("CoreGui").RobloxPromptGui.promptOverlay.ChildAdded:Connect(function(child)
            if child.Name == "ErrorPrompt" then
                if ws and connected then
                    pcall(function() ws:Close() end)
                end
                sendLeaveNotification()
            end
        end)
    end
end

-- Main initialization
spawn(function()
if game.placeId == 104715542330896 then

    bankMoneyLocation = findBankMoneyLocation()

    -- Send initial game data
    sendGameData()
    
    -- Initial WebSocket setup
    setupWebSocket()
    
    while wait(5) do
    print(1)
        -- Check WebSocket more frequently
        pingWebSocket()
        
        -- Send periodic updates less frequently
        if tick() % UPDATE_INTERVAL < 5 then
            sendGameData()
        end
    end
end
end)

`;

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
      
      <div className="dashboard-card">
        <div className="script-header">
          <h3>Monitoring Script</h3>
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowMonitoringScript(!showMonitoringScript)}
          >
            {showMonitoringScript ? 'Hide Script' : 'Show Script'}
          </button>
        </div>
        
        {showMonitoringScript && (
          <div className="script-container">
            <p className="script-instructions">
              Run this script in your Roblox game to enable monitoring and data collection:
            </p>
            <div className="script-actions">
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  navigator.clipboard.writeText(monitoringScript);
                  setSuccessMessage("Script copied to clipboard!");
                  setTimeout(() => setSuccessMessage(""), 3000);
                }}
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="lua-code">
              {monitoringScript}
            </pre>
          </div>
        )}
      </div>
      
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
            <p>No game data available. Please run the monitoring script in your Roblox game.</p>
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