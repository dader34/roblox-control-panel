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
