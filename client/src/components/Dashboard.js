import React, { useState, useEffect } from 'react';
import { getAccounts, getProcesses, launchAccount, setRecommendedServer, getGameData } from '../services/api';
import ServerBrowser from './ServerBrowser';

// SVG icons as components
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6"></path>
    <path d="M1 20v-6h6"></path>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

const TerminalIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const CommandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
  </svg>
);

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
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [totalMoney, setTotalMoney] = useState(0);
  const [totalBankMoney, setTotalBankMoney] = useState(0);
  const [showMonitoringScript, setShowMonitoringScript] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState(0);

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

        // Filter game data to only show accounts with WebSocket connections
        const filteredGameData = gameDataResponse.filter(account => account.hasWebSocket === true);
        setGameData(filteredGameData);
        setConnectedAccounts(filteredGameData.length);

        // Calculate total money and bank money
        calculateTotals(filteredGameData);

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

        // Filter game data to only show accounts with WebSocket connections
        const filteredGameData = gameDataResponse.filter(account => account.hasWebSocket === true);
        setGameData(filteredGameData);
        setConnectedAccounts(filteredGameData.length);

        // Update totals when game data refreshes
        calculateTotals(filteredGameData);
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

      // Then launch the game
      const result = await launchAccount(selectedAccount, placeId);
      setSuccessMessage(`Successfully launched: ${result.account}`);

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
      // Filter to only show accounts with WebSocket connections
      const filteredData = data.filter(account => account.hasWebSocket === true);
      setGameData(filteredData);
      setConnectedAccounts(filteredData.length);
      calculateTotals(filteredData);
    } catch (error) {
      console.error('Error refreshing game data:', error);
    }
  };

  // Helper function to get health bar color based on percentage
  const getHealthColor = (health, maxHealth) => {
    const percentage = (health / maxHealth) * 100;

    if (percentage > 66) {
      return '#34c759'; // iOS green
    } else if (percentage > 33) {
      return '#ff9500'; // iOS orange
    } else {
      return '#ff3b30'; // iOS red
    }
  };

  // Function to determine status color based on account status
  const getStatusColor = (data) => {
    // If the account has a status property set to warning or inactive
    if (data.status === 'warning') {
      return 'var(--warning-color, #ff9500)'; // Yellow/orange for warning status
    } else if (data.status === 'inactive') {
      return 'var(--danger-color, #ff3b30)'; // Red for inactive status
    } else {
      return 'var(--success-color, #34c759)'; // Green for connected/active status
    }
  };

  // Function to get a user-friendly status label
  const getStatusLabel = (data) => {
    if (data.status === 'warning') {
      return 'Idle';
    } else if (data.status === 'inactive') {
      return 'Inactive';
    } else {
      return 'Active';
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

  const monitoringScript = `
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
local PING_INTERVAL = 15 -- seconds (reduced from 30 for faster connection detection)
local HEALTH_CHANGE_THRESHOLD = 0.01 -- 1% of max health
local MAX_RECONNECT_ATTEMPTS = 15 -- increased from 10
local RECONNECT_DELAY = 3 -- seconds (reduced from 5 for quicker reconnection)
local UPDATE_INTERVAL = 10 -- seconds
local INITIAL_CONNECT_DELAY = 5 -- seconds to wait before first connection attempt

-- State tracking
local bankMoneyLocation = nil
local lastHealth = 0
local ws = nil
local connected = false
local reconnectAttempts = 0
local lastPingTime = 0
local lastServerResponse = 0
local connectionActive = false -- Tracks if we have an active server connection
local wasEverConnected = false -- Tracks if we've ever had a successful connection

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
        position = tostring(player.Character and player.Character:GetPrimaryPartCFrame().Position or
                                Vector3.new(0, 0, 0))
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
        print('Bank money location not found')
        return "0"
    end

    local bankMoney = "0"
    pcall(function()
        local unformattedBankMoney = bankMoneyLocation:FindFirstChildOfClass('Frame'):FindFirstChildOfClass('Frame')
                                         :FindFirstChild('Options'):FindFirstChildOfClass('TextLabel').text
        bankMoney = string.sub(unformattedBankMoney, 16)
    end)
    return bankMoney
end

print("Player name: " .. player.Name)

-- Get pocket money amount
local function getPocketMoney()
    local money = "0"
    pcall(function()
        money = player.PlayerGui.TopRightHud.Holder.Frame.MoneyTextLabel.text
    end)
    return money
end

-- Send game data to server
-- Only send meaningful updates if WebSocket is connected
function sendGameData()
    local otherData = getPlayerStats()

    local data = {
        accountName = player.Name,
        money = getPocketMoney(),
        bankMoney = getBankMoney(),
        placeId = game.PlaceId,
        otherData = otherData,
        hasWebSocket = connected -- Send current WebSocket status
    }

    -- Create and send HTTP request
    local encodedData = HttpService:JSONEncode(data)
    local request = {
        Url = serverUrl .. '/api/gameData',
        Method = 'POST',
        Headers = {
            ['Content-Type'] = 'application/json'
        },
        Body = encodedData
    }

    local success = pcall(function()
        http_request(request)
    end)

    if success then
        print("Sent game data with WebSocket status: " .. tostring(connected))
    else
        warn("Failed to send game data")
    end

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
        Headers = {
            ['Content-Type'] = 'application/json'
        },
        Body = encodedData
    }

    pcall(function()
        http_request(request)
        print("Sent leave notification")
    end)
end

-- Check if the server is available
local function isServerAvailable()
    local success = pcall(function()
        local request = {
            Url = serverUrl .. '/health',
            Method = 'GET'
        }
        http_request(request)
    end)

    return success
end

-- WebSocket Functions
local function setupWebSocket()
    if not WebSocket then
        warn("WebSocket is not available in this Roblox environment")
        return false
    end

    -- First check if the server is available before attempting to connect
    if not isServerAvailable() then
        warn("Server not available. Will retry later.")
        return false
    end

    print("Attempting to connect to WebSocket server at " .. wsUrl)

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

            -- Update last server response time
            lastServerResponse = tick()

            -- Handle message types
            if data.type == "init_ack" then
                print("WebSocket connection initialized and acknowledged by server")
                connected = true
                wasEverConnected = true
                reconnectAttempts = 0

                -- Immediately send a game data update to ensure server has latest info
                sendGameData()

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

            -- Send update to server to indicate lost connection
            pcall(function()
                local data = {
                    accountName = player.Name,
                    hasWebSocket = false
                }

                local request = {
                    Url = serverUrl .. '/api/gameData',
                    Method = 'POST',
                    Headers = {
                        ['Content-Type'] = 'application/json'
                    },
                    Body = HttpService:JSONEncode(data)
                }

                http_request(request)
                print("Notified server of disconnection")
            end)

            -- Try to reconnect with exponential backoff
            if reconnectAttempts < MAX_RECONNECT_ATTEMPTS then
                reconnectAttempts = reconnectAttempts + 1
                local delay = RECONNECT_DELAY * math.min(reconnectAttempts, 5) -- Cap the delay growth

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

-- Send ping to keep WebSocket alive and check server connection status
local function pingWebSocket()
    if ws and connected then
        local currentTime = tick()

        -- Check if we've received a response recently
        if currentTime - lastServerResponse > PING_INTERVAL * 2 then
            print("No response from server for too long. Closing connection to force reconnect.")
            pcall(function()
                ws:Close()
            end)
            connected = false
            return
        end

        -- Send regular ping
        if currentTime - lastPingTime > PING_INTERVAL then
            local pingSuccess = pcall(function()
                ws:Send(HttpService:JSONEncode({
                    type = "ping",
                    timestamp = currentTime
                }))
            end)

            if pingSuccess then
                lastPingTime = currentTime
            else
                warn("Failed to send ping, connection may be lost")
                -- Force reconnection if ping fails
                pcall(function()
                    ws:Close()
                end)
                connected = false
            end
        end
    elseif not ws or not connected then
        -- If we're not connected, try to connect periodically
        if not wasEverConnected or tick() % 30 < 1 then -- Try every 30 seconds if never connected
            print("Not connected to WebSocket, attempting to connect...")
            setupWebSocket()
        end
    end
end

-- Handle health changes
local function monitorHealth(humanoid)
    humanoid.HealthChanged:Connect(function(newHealth)
        local healthDecrease = lastHealth - newHealth
        local significantChange = healthDecrease > (humanoid.MaxHealth * HEALTH_CHANGE_THRESHOLD)

        if significantChange and healthDecrease > 0 and connected then
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
    -- Instead of BindToClose, use the CoreGui error prompt detection
    if game:GetService("CoreGui"):FindFirstChild("RobloxPromptGui") then
        game:GetService("CoreGui").RobloxPromptGui.promptOverlay.ChildAdded:Connect(function(child)
            if child.Name == "ErrorPrompt" or child.Name == "LeavePrompt" then
                print("Error/Leave prompt detected, sending leave notification")
                if ws and connected then
                    pcall(function()
                        ws:Close()
                    end)
                end
                sendLeaveNotification()
            end
        end)
    end

    -- Also detect player removal
    player.AncestryChanged:Connect(function(_, newParent)
        if newParent == nil then
            print("Player being removed from game, sending leave notification")
            if ws and connected then
                pcall(function()
                    ws:Close()
                end)
            end
            sendLeaveNotification()
        end
    end)

    -- Detect when player is about to remove from game
    game.Players.PlayerRemoving:Connect(function(plr)
        if plr == player then
            print("Player leaving game, sending leave notification")
            if ws and connected then
                pcall(function()
                    ws:Close()
                end)
            end
            sendLeaveNotification()
        end
    end)
end

-- Main initialization
spawn(function()
    -- Wait a moment for the game to fully load
    wait(INITIAL_CONNECT_DELAY)
    if game.placeId == 104715542330896 then

        -- Find bank money UI elements if needed for this game
        bankMoneyLocation = findBankMoneyLocation()

        -- Setup health monitoring
        setupHealthMonitoring()

        -- Setup game closing detection
        setupGameClosingDetection()

        ---- Initial WebSocket setup
        setupWebSocket()

        -- Periodic updates loop
        while wait(1) do
            -- Check WebSocket connection frequently
            pingWebSocket()

            -- Send periodic updates if connected
            if connected and tick() % UPDATE_INTERVAL < 1 then
                sendGameData()
            end
        end
    end
end)`;

  if (loading && accounts.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Quick Launch Card */}
      <div className="dashboard-card glass-card">
        <h3>Quick Launch</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        <form onSubmit={handleLaunch}>
          <div className="form-group">
            <label htmlFor="account">Account</label>
            <div className="select-wrapper">
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

      {/* Server Browser Card */}
      {showServerBrowser && (
        <div className="dashboard-card glass-card server-browser-card">
          <h3>Server Browser</h3>
          <ServerBrowser
            placeId={placeId}
            accounts={accounts}
            onAction={handleServerBrowserAction}
            disabled={loading}
          />
        </div>
      )}

      {/* Monitoring Script Card */}
      <div className="dashboard-card glass-card script-card">
        <div className="card-header">
          <h3>Monitoring Script</h3>
          <button
            className="btn btn-sm btn-glass"
            onClick={() => setShowMonitoringScript(!showMonitoringScript)}
          >
            {showMonitoringScript ? 'Hide Script ' : 'Show Script '}
            {showMonitoringScript ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>

        {showMonitoringScript && (
          <div className="script-container">
            <p className="script-instructions">
              Run this script in your Roblox game to enable monitoring and data collection:
            </p>
            <div className="script-actions">
              <button
                className="btn btn-sm btn-glass-primary"
                onClick={() => {
                  navigator.clipboard.writeText(monitoringScript);
                  setSuccessMessage("Script copied to clipboard!");
                  setTimeout(() => setSuccessMessage(""), 3000);
                }}
              >
                <CommandIcon />
                Copy to Clipboard
              </button>
            </div>
            <div className="lua-code-container">
              <pre className="lua-code">
                {monitoringScript}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Game Data Card with Money Stats */}
      <div className="dashboard-card glass-card game-data-card">
        <div className="card-header">
          <h3>
            Game Data
            <span className="connected-count">{connectedAccounts} connected</span>
          </h3>
          <button
            className="btn btn-sm btn-glass"
            onClick={refreshGameData}
            disabled={loading}
          >
            <RefreshIcon />
            Refresh
          </button>
        </div>

        {gameData.length === 0 ? (
          <div className="no-data-message">
            <TerminalIcon className="no-data-icon" />
            <p>No accounts with active WebSocket connections</p>
            <p className="no-data-hint">Run the monitoring script in your Roblox game to see data here</p>
          </div>
        ) : (
          <div>
            {/* Money Stats Display */}
            <div className="money-stats-container">
              <div className="money-stats-grid">
                {/* Pocket Money Card */}
                <div className="money-stats-card">
                  <div className="money-stats-icon pocket-icon">
                    💰
                  </div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Pocket Money</div>
                    <div className="money-stats-value">${formatMoney(totalMoney)}</div>
                  </div>
                </div>

                {/* Bank Money Card */}
                <div className="money-stats-card">
                  <div className="money-stats-icon bank-icon">
                    🏦
                  </div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Bank Money</div>
                    <div className="money-stats-value">${formatMoney(totalBankMoney)}</div>
                  </div>
                </div>

                {/* Total Money Card */}
                <div className="money-stats-card total-card">
                  <div className="money-stats-icon total-icon">
                    💎
                  </div>
                  <div className="money-stats-content">
                    <div className="money-stats-label">Grand Total</div>
                    <div className="money-stats-value grand-total">${formatMoney(grandTotal)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="table-container game-data-table-container">
              <table className="game-data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Pocket</th>
                    <th>Bank</th>
                    <th>Level</th>
                    <th>Health</th>
                    <th>Status</th>
                    <th>Place ID</th>
                    <th>Last Update</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gameData.map((data) => (
                    <React.Fragment key={data.account}>
                      <tr className={data.status === 'warning' ? 'warning-row' : data.status === 'inactive' ? 'inactive-row' : ''}>
                        <td>
                          <div className="account-cell">
                            {data.account}
                            {data.hasWebSocket && (
                              <span
                                className="websocket-badge"
                                title={`Status: ${getStatusLabel(data)}`}
                                style={{ backgroundColor: getStatusColor(data) }}
                              ></span>
                            )}
                          </div>
                        </td>
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
                          <span className="level-badge">{data.otherData?.level || '0'}</span>
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
                        <td>
                          <span className={`status-badge ${data.status === 'warning' ? 'warning' :
                            data.status === 'inactive' ? 'inactive' : 'connected'}`}>
                            {getStatusLabel(data)}
                            {data.inactiveCount > 0 && data.inactiveCount < 10 && (
                              <span className="inactive-counter" title={`${data.inactiveCount}/10 updates without balance changes`}>
                                {data.inactiveCount}/10
                              </span>
                            )}
                          </span>
                        </td>
                        <td>{data.placeId}</td>
                        <td>{formatDate(data.lastUpdate)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-glass toggle-details-btn"
                            onClick={() => toggleDetails(data.account)}
                          >
                            {expandedDetails === data.account ? (
                              <>Hide <ChevronUpIcon /></>
                            ) : (
                              <>Details <ChevronDownIcon /></>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedDetails === data.account && data.otherData && (
                        <tr className="details-row">
                          <td colSpan="9">
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
                                {data.status === 'warning' || data.status === 'inactive' ? (
                                  <div className="stat-row">
                                    <div className="stat-label">Inactivity:</div>
                                    <div className="stat-value">
                                      {data.inactiveCount}/10 updates without balance changes
                                    </div>
                                  </div>
                                ) : null}
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

      {/* Processes Card */}
      <div className="dashboard-card glass-card processes-card">
        <div className="card-header">
          <h3>Active Instances <span className="count-badge">{processes.length}</span></h3>
        </div>
        {processes.length === 0 ? (
          <div className="no-data-message">
            <p>No Roblox instances currently running</p>
          </div>
        ) : (
          <div className="table-container processes-table-container">
            <table className="processes-table">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Account</th>
                  <th>Memory</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => {
                  // Find if this process has an account with a WebSocket connection
                  const accountData = gameData.find(data => data.account === process.account);
                  const hasWebSocket = accountData?.hasWebSocket || false;

                  return (
                    <tr key={process.pid} className={`${process.account ? 'has-account' : ''} 
                                                     ${accountData?.status === 'warning' ? 'warning-row' :
                        accountData?.status === 'inactive' ? 'inactive-row' : ''}`}>
                      <td>{process.pid}</td>
                      <td>{process.account || 'Unknown'}</td>
                      <td>{process.memoryUsage}</td>
                      <td>
                        {process.account ? (
                          hasWebSocket ? (
                            // Find matching game data to get status
                            (() => {
                              if (accountData) {
                                return (
                                  <span
                                    className={`status-badge ${accountData.status === 'warning' ? 'warning' :
                                      accountData.status === 'inactive' ? 'inactive' : 'connected'}`}
                                    title={`Status: ${getStatusLabel(accountData)}`}
                                  >
                                    {getStatusLabel(accountData)}
                                  </span>
                                );
                              } else {
                                return <span className="status-badge connected" title="WebSocket Connected">Connected</span>;
                              }
                            })()
                          ) : (
                            <span className="status-badge disconnected" title="WebSocket Not Connected">Disconnected</span>
                          )
                        ) : (
                          <span className="status-badge unknown" title="WebSocket Status Unknown">Unknown</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add CSS for the status indicators */}
      <style>{`
        /* Status badges */
        .status-badge.warning {
          background-color: var(--warning-color, #ff9500);
        }
        
        .status-badge.inactive {
          background-color: var(--danger-color, #ff3b30);
        }
        
        /* Row highlighting */
        .warning-row {
          background-color: rgba(255, 149, 0, 0.1);
        }
        
        .inactive-row {
          background-color: rgba(255, 59, 48, 0.1);
        }
        
        /* Tooltip for websocket badge */
        .account-cell {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .account-cell .websocket-badge {
          position: relative;
          margin-left: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          transition: all 0.3s ease;
        }
        
        .account-cell .websocket-badge:hover::after {
          content: attr(title);
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
        }
        
        /* Inactive counter */
        .inactive-counter {
          font-size: 0.8rem;
          margin-left: 6px;
          padding: 2px 6px;
          background-color: rgba(255, 149, 0, 0.2);
          color: var(--warning-color, #ff9500);
          border-radius: 4px;
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;