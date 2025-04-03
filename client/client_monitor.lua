--Run this to monitor your players stats in block spin
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

-- Track last health to detect changes
local lastHealth = 0

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
    
    -- Update last health after sending data
    lastHealth = otherData.health
end

-- Function to handle health change
local function setupHealthMonitoring()
    -- Wait for character to load
    if not player.Character then
        player.CharacterAdded:Wait()
    end
    
    -- Get the Humanoid
    local humanoid = player.Character:WaitForChild("Humanoid")
    lastHealth = humanoid.Health
    
    -- Connect to health changed event
    humanoid.HealthChanged:Connect(function(newHealth)
        -- Only send update if health decreased by more than 1% of max health
        local healthDecrease = lastHealth - newHealth
        local significantChange = healthDecrease > (humanoid.MaxHealth * 0.01)
        
        if significantChange and healthDecrease > 0 then
            print("Health dropped from " .. lastHealth .. " to " .. newHealth .. ", sending update")
            makeRequest()
        end
    end)
    
    -- Set up monitoring again when character respawns
    player.CharacterAdded:Connect(function(newCharacter)
        -- Wait for new humanoid to load
        local newHumanoid = newCharacter:WaitForChild("Humanoid")
        lastHealth = newHumanoid.Health
        
        -- Connect to health changed event for new character
        newHumanoid.HealthChanged:Connect(function(newHealth)
            -- Only send update if health decreased by more than 1% of max health
            local healthDecrease = lastHealth - newHealth
            local significantChange = healthDecrease > (newHumanoid.MaxHealth * 0.01)
            
            if significantChange and healthDecrease > 0 then
                print("Health dropped from " .. lastHealth .. " to " .. newHealth .. ", sending update")
                makeRequest()
            end
        end)
    end)
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

-- Start health monitoring
setupHealthMonitoring()

-- Regular updates
spawn(function()
    makeRequest()
    while wait(10) do
        makeRequest()
    end
end)