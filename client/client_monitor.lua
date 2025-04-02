--Run this to monitor your players stats in block spin
local player = game.Players.LocalPlayer 

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
    placeId = game.PlaceId,
    otherData = otherData
}

local leaveJSON = {
    accountName = player.Name
}

local encodedData = game:GetService("HttpService"):JSONEncode(JSON)
local leaveGameData = game:GetService("HttpService"):JSONEncode(leaveJSON)

local r_t = {
    Url = 'http://localhost:3000/api/gameData',
    Method = 'POST',
    Headers = {['Content-Type'] = 'application/json'},
    Body = encodedData
}

-- Updated URL from "leftGame" to "leaveGame" to match server endpoint
local r_s = {
    Url = 'http://localhost:3000/api/leaveGame',
    Method = 'POST',
    Headers = {['Content-Type'] = 'application/json'},
    Body = leaveGameData
}

-- Get the Players service
local Players = game:GetService("Players")

-- Function to detect when the local player is leaving
local function onPlayerLeaving(leavingPlayer)
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
                http_request(r_s)
            end)
        end
    end)
end

spawn(function()
    http_request(r_t)
    while wait(10) do
        http_request(r_t)
    end
end)