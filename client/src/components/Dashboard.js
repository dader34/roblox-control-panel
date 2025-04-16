import React, { useState, useEffect } from 'react';
import { getAccounts, getProcesses, launchAccount, setRecommendedServer, getGameData, getMoneyTracking} from '../services/api';
import ServerBrowser from './ServerBrowser';
import '../styles/Dashboard.css'
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clipboard,
  Award,
  Zap,
  Activity,
  Server,
  Users,
  Database,
  Eye,
  EyeOff,
  Play
} from 'react-feather';

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
  const [darkMode, setDarkMode] = useState(false);
  const [moneyTrackingData, setMoneyTrackingData] = useState(null);

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
        const [processesData, gameDataResponse, moneyTrackingSummary] = await Promise.all([
          getProcesses(),
          getGameData(),
          getMoneyTracking()
        ]);
        setProcesses(processesData);
        setMoneyTrackingData(moneyTrackingSummary);

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
      return '#10b981'; // emerald-500
    } else if (percentage > 33) {
      return '#f59e0b'; // amber-500
    } else {
      return '#ef4444'; // red-500
    }
  };

  // Function to determine status color based on account status
  const getStatusColor = (data) => {
    // If the account has a status property set to warning or inactive
    if (data.status === 'warning') {
      return '#f59e0b'; // amber-500
    } else if (data.status === 'inactive') {
      return '#ef4444'; // red-500
    } else {
      return '#10b981'; // emerald-500
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

  const fetchMoneyTracking = async () => {
    try {
      const data = await getMoneyTracking();
      setMoneyTrackingData(data);
    } catch (error) {
      console.error('Error fetching money tracking data:', error);
    }
  };

  const monitoringScript = `-- Roblox Player Monitoring and Remote Script Execution
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
        bankMoney = string.sub(unformattedBankMoney, 15)
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

        -- Initial WebSocket setup
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
end)
`;

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-xl">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'dark-mode bg-gray-900 text-white' : 'light-mode bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-gray-800'}`}>
      {/* Header with Theme Toggle */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          Roblox Manager Dashboard
        </h1>
        {/* <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {darkMode ? (
            <span role="img" aria-label="Light Mode" className="text-xl">🌞</span>
          ) : (
            <span role="img" aria-label="Dark Mode" className="text-xl">🌙</span>
          )}
        </button> */}
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 relative" role="alert">
          <strong className="font-bold">Success! </strong>
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Overview */}
        <div className={`col-span-1 lg:col-span-3 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pocket Money */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm shadow-md flex items-center`}>
              <div className="rounded-full p-3 bg-purple-100 text-purple-600 mr-4">
                <Database size={24} />
              </div>
              <div>
                <p className="text-sm opacity-70">Pocket Money</p>
                <h3 className="text-2xl font-bold">${formatMoney(totalMoney)}</h3>
              </div>
            </div>

            {/* Bank Money */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm shadow-md flex items-center`}>
              <div className="rounded-full p-3 bg-blue-100 text-blue-600 mr-4">
                <Server size={24} />
              </div>
              <div>
                <p className="text-sm opacity-70">Bank Money</p>
                <h3 className="text-2xl font-bold">${formatMoney(totalBankMoney)}</h3>
              </div>
            </div>

            {/* Grand Total */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm shadow-md flex items-center`}>
              <div className="rounded-full p-3 bg-green-100 text-green-600 mr-4">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm opacity-70">Grand Total</p>
                <h3 className="text-2xl font-bold">${formatMoney(grandTotal)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Card */}
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center mb-4">
            <Play className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Quick Launch</h2>
          </div>

          <form onSubmit={handleLaunch} className="space-y-4">
            <div>
              <label htmlFor="account" className="block text-sm font-medium mb-1">Account</label>
              <div className="relative">
                <select
                  id="account"
                  className={`w-full p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-50'} backdrop-blur-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none`}
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  disabled={loading}
                >
                  {accounts.map((account) => (
                    <option key={account} value={account}>{account}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>
            </div>
            <div>
              <label htmlFor="placeId" className="block text-sm font-medium mb-1">Place ID</label>
              <input
                type="text"
                id="placeId"
                className={`w-full p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-50'} backdrop-blur-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                placeholder="Enter Roblox Place ID"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                type="submit"
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${loading || !selectedAccount || !placeId ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'}`}
                disabled={loading || !selectedAccount || !placeId}
              >
                {loading ? 'Launching...' : 'Launch Game'}
              </button>
              <button
                type="button"
                className={`flex-1 px-4 py-2 rounded-lg font-medium border transition-colors ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-purple-300 hover:bg-purple-50'}`}
                onClick={() => setShowServerBrowser(!showServerBrowser)}
                disabled={!placeId}
              >
                {showServerBrowser ? 'Hide Server Browser' : 'Show Server Browser'}
              </button>
            </div>
          </form>
        </div>

        {/* Monitoring Script Card */}
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Terminal className="text-purple-500 mr-2" size={20} />
              <h2 className="text-xl font-bold">Monitoring Script</h2>
            </div>
            <button
              className={`flex items-center px-3 py-1 rounded-lg text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'} transition-colors`}
              onClick={() => setShowMonitoringScript(!showMonitoringScript)}
            >
              {showMonitoringScript ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
              {showMonitoringScript ? 'Hide Script' : 'Show Script'}
            </button>
          </div>

          {showMonitoringScript && (
            <div className="mt-4">
              <div className="mb-4">
                <p className="text-sm opacity-70">
                  Run this script in your Roblox game to enable monitoring and data collection:
                </p>
              </div>

              <div className="flex justify-end mb-2">
                <button
                  className="flex items-center px-3 py-1 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                  onClick={() => {
                    navigator.clipboard.writeText(monitoringScript);
                    setSuccessMessage("Script copied to clipboard!");
                    setTimeout(() => setSuccessMessage(""), 3000);
                  }}
                >
                  <Clipboard size={14} className="mr-1" />
                  Copy to Clipboard
                </button>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-800'} overflow-auto`}>
                <pre className="text-green-400 text-sm">
                  {monitoringScript}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Active Instances */}
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="text-purple-500 mr-2" size={20} />
              <h2 className="text-xl font-bold">Active Instances</h2>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                {processes.length}
              </span>
            </div>
          </div>

          {processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Server size={48} className="text-gray-400 mb-3" />
              <p className="text-gray-500">No Roblox instances currently running</p>
            </div>
          ) : (
            <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">PID</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Memory</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {processes.map((process) => {
                      // Find if this process has an account with a WebSocket connection
                      const accountData = gameData.find(data => data.account === process.account);
                      const hasWebSocket = accountData?.hasWebSocket || false;

                      return (
                        <tr key={process.pid} className={`
                          ${accountData?.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20' :
                            accountData?.status === 'inactive' ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20' : ''}
                        `}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{process.pid}</td>
                          {/* <td className="px-4 py-3 whitespace-nowrap text-sm">{process.account || 'Unknown'}</td> */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{process.memoryUsage}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {process.account ? (
                              hasWebSocket ? (
                                (() => {
                                  if (accountData) {
                                    const statusColor = accountData.status === 'warning' ? 'bg-amber-500' :
                                      accountData.status === 'inactive' ? 'bg-red-500' : 'bg-emerald-500';
                                    return (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} text-white`}>
                                        {getStatusLabel(accountData)}
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500 text-white">
                                        Connected
                                      </span>
                                    );
                                  }
                                })()
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                                  Disconnected
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-800">
                                Unknown
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Server Browser Card */}
      {showServerBrowser && (
        <div className={`mt-6 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center mb-4">
            <Users className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Server Browser</h2>
          </div>
          <ServerBrowser
            placeId={placeId}
            accounts={accounts}
            onAction={handleServerBrowserAction}
            disabled={loading}
          />
        </div>
      )}

      {/* Game Data Card */}
      <div className={`mt-6 rounded-xl p-6 ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Zap className="text-purple-500 mr-2" size={20} />
            <h2 className="text-xl font-bold">Game Data</h2>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {connectedAccounts} connected
            </span>
          </div>
          <button
            className={`flex items-center px-3 py-1 rounded-lg text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'} transition-colors`}
            onClick={refreshGameData}
            disabled={loading}
          >
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </button>
        </div>

        {gameData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Terminal size={64} className="text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium mb-2">No accounts with active WebSocket connections</p>
            <p className="text-gray-400 text-sm">Run the monitoring script in your Roblox game to see data here</p>
          </div>
        ) : (
          <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} backdrop-blur-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-gray-50 bg-opacity-50'}>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Pocket</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Bank</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Level</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Health</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Place ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Update</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {gameData.map((data) => (
                    <React.Fragment key={data.account}>
                      <tr className={`
                        ${data.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20' :
                          data.status === 'inactive' ? 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20' : ''}
                      `}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {/* <span className="font-medium">{data.account}</span> */}
                            {data.hasWebSocket && (
                              <span
                                className="ml-2 w-3 h-3 rounded-full"
                                style={{ backgroundColor: getStatusColor(data) }}
                                title={`Status: ${getStatusLabel(data)}`}
                              ></span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          ${typeof data.money === 'number'
                            ? data.money.toLocaleString()
                            : data.money || '0'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          ${typeof data.bankMoney === 'number'
                            ? data.bankMoney.toLocaleString()
                            : data.bankMoney || '0'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                            {data.otherData?.level || '0'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {data.otherData ? (
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs">{data.otherData.health} / {data.otherData.maxHealth}</span>
                              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(data.otherData.health / data.otherData.maxHealth) * 100}%`,
                                    backgroundColor: getHealthColor(data.otherData.health, data.otherData.maxHealth)
                                  }}
                                ></div>
                              </div>
                            </div>
                          ) : '0 / 0'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.status === 'warning' ? 'bg-amber-500 text-white' :
                              data.status === 'inactive' ? 'bg-red-500 text-white' :
                                'bg-emerald-500 text-white'
                            }`}>
                            {getStatusLabel(data)}
                            {data.inactiveCount > 0 && data.inactiveCount < 10 && (
                              <span className="ml-1 px-1 text-xs bg-white bg-opacity-30 rounded">
                                {data.inactiveCount}/10
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{data.placeId}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(data.lastUpdate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            className={`flex items-center px-2 py-1 rounded text-xs ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'} transition-colors`}
                            onClick={() => toggleDetails(data.account)}
                          >
                            {expandedDetails === data.account ? (
                              <>Hide <ChevronUp size={12} className="ml-1" /></>
                            ) : (
                              <>Details <ChevronDown size={12} className="ml-1" /></>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedDetails === data.account && data.otherData && (
                        <tr className={`${darkMode ? 'bg-gray-700 bg-opacity-30' : 'bg-purple-50 bg-opacity-50'}`}>
                          <td colSpan="9" className="px-8 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                <p className="text-xs uppercase opacity-70 mb-1">Player Name</p>
                                <p className="font-medium">{data.otherData.playerName}</p>
                              </div>
                              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                <p className="text-xs uppercase opacity-70 mb-1">Display Name</p>
                                <p className="font-medium">{data.otherData.displayName}</p>
                              </div>
                              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                <p className="text-xs uppercase opacity-70 mb-1">Position</p>
                                <p className="font-medium">{data.otherData.position}</p>
                              </div>
                              {(data.status === 'warning' || data.status === 'inactive') && (
                                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-70'}`}>
                                  <p className="text-xs uppercase opacity-70 mb-1">Inactivity</p>
                                  <p className="font-medium">{data.inactiveCount}/10 updates without balance changes</p>
                                </div>
                              )}
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

      {/* Custom CSS - Global Styles */}
      <style jsx global>{`
        /* Glassmorphism and other global styles */
        body {
          transition: background-color 0.3s ease;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: ${darkMode ? '#2d3748' : '#f7fafc'};
          border-radius: 8px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#4a5568' : '#cbd5e0'};
          border-radius: 8px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#718096' : '#a0aec0'};
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .dashboard {
          animation: fadeIn 0.5s ease-in;
        }

        /* Custom scrollbar for code block */
        .lua-code-container::-webkit-scrollbar {
          height: 6px;
        }

        /* Transitions */
        .card-transition {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .card-transition:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        /* Table row hover effects */
        tbody tr {
          transition: background-color 0.2s ease;
        }

        tbody tr:hover {
          background-color: ${darkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(237, 233, 254, 0.3)'};
        }

        /* Specific text glow effect for headings */
        h1, h2, h3 {
          text-shadow: ${darkMode ? 'none' : '0 0 20px rgba(139, 92, 246, 0.15)'};
        }

        /* Button glow effect */
        .btn-glow:hover {
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
        }

        /* Custom animations for loading spinner */
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;