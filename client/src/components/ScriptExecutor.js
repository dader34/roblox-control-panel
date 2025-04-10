import React, { useState, useEffect } from 'react';
import apiService from '../services/api'; // Adjust the import path as needed

const ScriptExecutor = () => {
    const [accounts, setAccounts] = useState([]);
    const [allAccounts, setAllAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [executing, setExecuting] = useState(false);

    // Script saving and loading
    const [savedScripts, setSavedScripts] = useState([]);
    const [scriptName, setScriptName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Load saved scripts from localStorage on initial render
    useEffect(() => {
        const loadSavedScripts = () => {
            try {
                const saved = localStorage.getItem('savedScripts');
                if (saved) {
                    setSavedScripts(JSON.parse(saved));
                }
            } catch (error) {
                console.error('Error loading saved scripts:', error);
            }
        };

        loadSavedScripts();
    }, []);

    // Fetch all accounts and those with WebSocket connections
    useEffect(() => {
        const fetchAccountData = async () => {
            try {
                // Fetch all game data
                const gameData = await apiService.getGameData();
                console.log('Game data:', gameData); // Debugging

                // Set all accounts
                const allAccountsList = gameData.map(account => account.account);
                setAllAccounts(allAccountsList);

                // Filter accounts with active WebSocket connections
                const connectedAccounts = gameData
                    .filter(account => {
                        console.log(`Account ${account.account} hasWebSocket: ${account.hasWebSocket}`); // Debugging
                        return account.hasWebSocket;
                    })
                    .map(account => account.account);

                setAccounts(connectedAccounts);

                // Select the first account if none is selected and accounts are available
                if (!selectedAccount && connectedAccounts.length > 0 && !multiSelectMode) {
                    setSelectedAccount(connectedAccounts[0]);
                }
            } catch (error) {
                console.error('Error fetching account data:', error);
                setError('Failed to load accounts data');
            }
        };

        fetchAccountData();

        // Poll for accounts every 5 seconds
        const interval = setInterval(fetchAccountData, 5000);

        return () => clearInterval(interval);
    }, [selectedAccount, multiSelectMode]);

    const executeScript = async () => {
        if (multiSelectMode && selectedAccounts.length === 0) {
            setError('Please select at least one account');
            return;
        } else if (!multiSelectMode && !selectedAccount) {
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
            if (multiSelectMode) {
                // Execute on selected accounts
                const accountsToProcess = selectedAccounts;
                
                const result = await apiService.executeScriptOnMultipleAccounts(accountsToProcess, script);
                
                if (result.success) {
                    setSuccessMessage(`Script executed on ${result.successCount}/${result.totalCount} accounts`);
                    console.log('Execution results:', result);
                    
                    // Show more detailed results if there were failures
                    if (result.failedCount > 0 && result.details) {
                        const failedAccounts = result.details
                            .filter(detail => !detail.success)
                            .map(detail => `${detail.account}: ${detail.message || 'Failed'}`)
                            .join(', ');
                            
                        console.warn('Failed accounts:', failedAccounts);
                    }
                } else {
                    setError(result.message || 'Failed to execute script on accounts');
                }
            } else if (selectedAccount === 'all_accounts') {
                // Execute on all WebSocket-enabled accounts
                const result = await apiService.executeScriptOnMultipleAccounts(accounts, script);
                
                if (result.success) {
                    setSuccessMessage(`Script executed on ${result.successCount}/${result.totalCount} accounts`);
                    console.log('Execution results:', result);
                    
                    // Show more detailed results if there were failures
                    if (result.failedCount > 0 && result.details) {
                        const failedAccounts = result.details
                            .filter(detail => !detail.success)
                            .map(detail => `${detail.account}: ${detail.message || 'Failed'}`)
                            .join(', ');
                            
                        console.warn('Failed accounts:', failedAccounts);
                    }
                } else {
                    setError(result.message || 'Failed to execute script on accounts');
                }
            } else {
                // Execute on single account
                const result = await apiService.executeScript(selectedAccount, script);
                
                if (result.success) {
                    setSuccessMessage(`Script execution requested (ID: ${result.execId})`);
                } else {
                    setError(result.message || 'Failed to execute script');
                }
            }
        } catch (error) {
            console.error('Error executing script:', error);
            setError('Failed to send script execution request');
        } finally {
            setExecuting(false);
        }
    };

    // Toggle account selection in multi-select mode
    const toggleAccountSelection = (account) => {
        if (selectedAccounts.includes(account)) {
            setSelectedAccounts(selectedAccounts.filter(acc => acc !== account));
        } else {
            setSelectedAccounts([...selectedAccounts, account]);
        }
    };

    // Toggle multi-select mode
    const toggleMultiSelectMode = () => {
        if (multiSelectMode) {
            // Switch back to single-select mode
            setMultiSelectMode(false);
            setSelectedAccounts([]);
            // Select the first account if available
            if (accounts.length > 0) {
                setSelectedAccount(accounts[0]);
            } else {
                setSelectedAccount('');
            }
        } else {
            // Switch to multi-select mode
            setMultiSelectMode(true);
            setSelectedAccount('');
            setSelectedAccounts([]);
        }
    };

    // Select all WebSocket-enabled accounts
    const selectAllAccounts = () => {
        setSelectedAccounts([...accounts]);
    };

    // Deselect all accounts
    const deselectAllAccounts = () => {
        setSelectedAccounts([]);
    };

    // Save script to localStorage
    const saveScript = () => {
        if (!scriptName.trim()) {
            setError('Please enter a name for the script');
            return;
        }

        if (!script.trim()) {
            setError('Cannot save empty script');
            return;
        }

        try {
            const newScript = {
                id: Date.now().toString(),
                name: scriptName,
                code: script,
                timestamp: new Date().toISOString()
            };

            const updatedScripts = [...savedScripts, newScript];
            setSavedScripts(updatedScripts);

            // Save to localStorage
            localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));

            // Reset form
            setScriptName('');
            setShowSaveDialog(false);
            setSuccessMessage(`Script "${newScript.name}" saved successfully`);
        } catch (error) {
            console.error('Error saving script:', error);
            setError('Failed to save script');
        }
    };

    // Load saved script
    const loadScript = (savedScript) => {
        setScript(savedScript.code);
        setSuccessMessage(`Script "${savedScript.name}" loaded`);
    };

    // Delete saved script
    const deleteScript = (scriptId) => {
        try {
            const updatedScripts = savedScripts.filter(s => s.id !== scriptId);
            setSavedScripts(updatedScripts);

            // Update localStorage
            localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));

            setSuccessMessage('Script deleted successfully');
        } catch (error) {
            console.error('Error deleting script:', error);
            setError('Failed to delete script');
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

    return (
        <div className="script-executor">
            <h2>Remote Script Executor</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {successMessage && <div className="alert alert-success">{successMessage}</div>}

            <div className="executor-container">
                <div className="executor-panel">
                    <div className="account-selection-header">
                        <h4>Account Selection</h4>
                        <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={toggleMultiSelectMode}
                        >
                            {multiSelectMode ? 'Switch to Single Select' : 'Switch to Multi Select'}
                        </button>
                    </div>

                    {!multiSelectMode ? (
                        // Single account selection
                        <div className="form-group">
                            <label htmlFor="account">Select Account</label>
                            <select
                                id="account"
                                className="form-control"
                                value={selectedAccount}
                                onChange={(e) => setSelectedAccount(e.target.value)}
                                disabled={executing}
                            >
                                <option value="">-- Select Account --</option>
                                {accounts.length > 0 && (
                                    <option value="all_accounts">-- All WebSocket Accounts --</option>
                                )}
                                {accounts.map((account) => (
                                    <option key={account} value={account}>
                                        {account} (WebSocket)
                                    </option>
                                ))}
                                {allAccounts.filter(acc => !accounts.includes(acc)).map((account) => (
                                    <option key={account} value={account} disabled>
                                        {account} (No WebSocket)
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        // Multi-account selection
                        <div className="multi-select-container">
                            <div className="multi-select-actions">
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={selectAllAccounts}
                                    disabled={executing || accounts.length === 0}
                                >
                                    Select All
                                </button>
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={deselectAllAccounts}
                                    disabled={executing || selectedAccounts.length === 0}
                                >
                                    Deselect All
                                </button>
                                <span className="selected-count">
                                    {selectedAccounts.length} of {accounts.length} selected
                                </span>
                            </div>
                            <div className="accounts-checkboxes">
                                {accounts.length === 0 ? (
                                    <div className="no-accounts-message">
                                        No accounts with WebSocket connections available
                                    </div>
                                ) : (
                                    accounts.map(account => (
                                        <div key={account} className="account-checkbox">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAccounts.includes(account)}
                                                    onChange={() => toggleAccountSelection(account)}
                                                    disabled={executing}
                                                />
                                                {account}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {accounts.length === 0 && (
                        <div className="no-accounts-message">
                            No accounts with active WebSocket connections. Make sure your Roblox script is running with WebSocket support.
                        </div>
                    )}

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

                    <div className="script-actions">
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

                        <div className="saved-scripts">
                            <h4>
                                Saved Scripts
                                <button
                                    className="btn btn-sm btn-outline-primary save-script-btn"
                                    onClick={() => setShowSaveDialog(!showSaveDialog)}
                                    disabled={executing}
                                >
                                    {showSaveDialog ? 'Cancel' : 'Save Current'}
                                </button>
                            </h4>

                            {showSaveDialog && (
                                <div className="save-script-dialog">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter script name"
                                            value={scriptName}
                                            onChange={(e) => setScriptName(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={saveScript}
                                    >
                                        Save
                                    </button>
                                </div>
                            )}

                            <div className="saved-scripts-list">
                                {savedScripts.length === 0 ? (
                                    <p className="no-scripts-message">No saved scripts</p>
                                ) : (
                                    savedScripts.map((savedScript) => (
                                        <div key={savedScript.id} className="saved-script-item">
                                            <span className="saved-script-name">{savedScript.name}</span>
                                            <div className="saved-script-actions">
                                                <button
                                                    className="btn btn-sm btn-outline-info"
                                                    onClick={() => loadScript(savedScript)}
                                                    title="Load this script"
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => deleteScript(savedScript.id)}
                                                    title="Delete this script"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-group button-group">
                        <button
                            className="btn btn-primary"
                            onClick={executeScript}
                            disabled={(multiSelectMode && selectedAccounts.length === 0) || (!multiSelectMode && !selectedAccount) || executing}
                        >
                            {executing ? 'Executing...' : 'Execute Script'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScriptExecutor;