import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';
import { 
  Terminal, 
  Play, 
  Code,
  Save,
  Trash2,
  Clipboard,
  Check,
  AlertTriangle,
  RefreshCw,
  User,
  Users,
  CheckCircle,
  XCircle,
  X,
  Download,
  Upload,
  BookOpen,
  Edit
} from 'react-feather';
import Prism from 'prismjs';
import 'prismjs/components/prism-lua'; // Import Lua syntax
import 'prismjs/themes/prism-tomorrow.css'; // Import a theme for dark mode (we'll conditionally apply it)

const ScriptExecutor = ({ darkMode }) => {
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

    // Refs for the editor elements
    const editorRef = useRef(null);
    const preRef = useRef(null);
    const textareaRef = useRef(null);

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

    // Apply syntax highlighting when script changes
    useEffect(() => {
        if (preRef.current) {
            preRef.current.textContent = script;
            Prism.highlightElement(preRef.current);
        }
    }, [script, darkMode]);

    // Sync scroll between textarea and pre elements
    useEffect(() => {
        const textarea = textareaRef.current;
        const pre = preRef.current;
        
        if (!textarea || !pre) return;
        
        const syncScroll = () => {
            pre.scrollTop = textarea.scrollTop;
            pre.scrollLeft = textarea.scrollLeft;
        };
        
        textarea.addEventListener('scroll', syncScroll);
        return () => textarea.removeEventListener('scroll', syncScroll);
    }, []);

    // Fetch all accounts and those with WebSocket connections
    useEffect(() => {
        const fetchAccountData = async () => {
            try {
                // Fetch all game data
                const gameData = await apiService.getGameData();

                // Set all accounts
                const allAccountsList = gameData.map(account => account.account);
                setAllAccounts(allAccountsList);

                // Filter accounts with active WebSocket connections
                const connectedAccounts = gameData
                    .filter(account => account.hasWebSocket)
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

    // Handle editor input, syncing textarea with highlighted pre
    const handleEditorInput = (e) => {
        const value = e.target.value;
        setScript(value);
    };

    // Handle tab key in editor
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            
            // Insert 2 spaces for indentation
            const newValue = script.substring(0, start) + '  ' + script.substring(end);
            setScript(newValue);
            
            // Set cursor position after the inserted tab
            setTimeout(() => {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
            }, 0);
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
        <div className={`p-6 max-w-full ${darkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="flex items-center mb-6">
                <Terminal className="text-purple-500 mr-2" size={24} />
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                    Remote Script Executor
                </h1>
            </div>

            {error && (
                <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 flex items-center" role="alert">
                    <XCircle className="mr-2" size={18} />
                    <span>{error}</span>
                </div>
            )}
            
            {successMessage && (
                <div className="mb-4 p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 flex items-center" role="alert">
                    <CheckCircle className="mr-2" size={18} />
                    <span>{successMessage}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Account Selection Panel */}
                <div className={`lg:col-span-2 rounded-xl ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                {multiSelectMode ? (
                                    <Users className="text-purple-500 mr-2" size={20} />
                                ) : (
                                    <User className="text-purple-500 mr-2" size={20} />
                                )}
                                <h2 className="text-xl font-bold">Account Selection</h2>
                            </div>
                            <button
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                    darkMode 
                                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                        : 'bg-white hover:bg-gray-100 text-gray-700'
                                } border border-gray-300 dark:border-gray-600`}
                                onClick={toggleMultiSelectMode}
                            >
                                {multiSelectMode ? 'Single Mode' : 'Multi Mode'}
                            </button>
                        </div>

                        {!multiSelectMode ? (
                            <div className="mb-4">
                                <label htmlFor="account" className="block text-sm font-medium mb-2">
                                    Select Account
                                </label>
                                <div className="relative">
                                    <select
                                        id="account"
                                        className={`w-full p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white bg-opacity-50'} backdrop-blur-sm border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none`}
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
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium">Select Accounts</div>
                                    <div className="flex gap-2">
                                        <button
                                            className={`px-2 py-1 rounded text-xs ${
                                                darkMode 
                                                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                    : 'bg-white hover:bg-gray-100 text-gray-700'
                                            } border border-gray-300 dark:border-gray-600`}
                                            onClick={selectAllAccounts}
                                            disabled={executing || accounts.length === 0}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            className={`px-2 py-1 rounded text-xs ${
                                                darkMode 
                                                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                    : 'bg-white hover:bg-gray-100 text-gray-700'
                                            } border border-gray-300 dark:border-gray-600`}
                                            onClick={deselectAllAccounts}
                                            disabled={executing || selectedAccounts.length === 0}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} border border-gray-300 dark:border-gray-600 max-h-80 overflow-y-auto`}>
                                    {accounts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-center">
                                            <AlertTriangle className="text-amber-500 mb-2" size={24} />
                                            <p className="text-gray-500 dark:text-gray-400">No WebSocket connections available</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {accounts.map(account => (
                                                <div 
                                                    key={account} 
                                                    className={`p-2 rounded flex items-center ${
                                                        selectedAccounts.includes(account)
                                                            ? darkMode 
                                                                ? 'bg-purple-900 bg-opacity-30 text-white' 
                                                                : 'bg-purple-100 text-purple-800'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    } cursor-pointer`}
                                                    onClick={() => toggleAccountSelection(account)}
                                                >
                                                    <div className={`w-4 h-4 rounded border ${
                                                        selectedAccounts.includes(account)
                                                            ? 'bg-purple-500 border-purple-500'
                                                            : 'border-gray-400 dark:border-gray-500'
                                                    } mr-2 flex items-center justify-center`}>
                                                        {selectedAccounts.includes(account) && (
                                                            <Check size={12} className="text-white" />
                                                        )}
                                                    </div>
                                                    <span className="flex-grow truncate">{account}</span>
                                                    <div className="flex-shrink-0 h-2 w-2 rounded-full bg-green-500 ml-2"></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
                                    {selectedAccounts.length} of {accounts.length} selected
                                </div>
                            </div>
                        )}

                        {accounts.length === 0 && (
                            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} mb-4`}>
                                <div className="flex items-start text-amber-500">
                                    <AlertTriangle className="flex-shrink-0 mr-2" size={16} />
                                    <p className="text-sm">
                                        No accounts with active WebSocket connections. Make sure your Roblox script is running with WebSocket support.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Sample Scripts */}
                        <div className="mb-6">
                            <div className="flex items-center mb-3">
                                <BookOpen className="text-purple-500 mr-2" size={16} />
                                <h3 className="text-base font-bold">Sample Scripts</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {sampleScripts.map((sample, index) => (
                                    <button
                                        key={index}
                                        className={`p-2 text-left rounded-lg text-sm transition-colors ${
                                            darkMode 
                                                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                                : 'bg-white hover:bg-gray-100 text-gray-700'
                                        } border border-gray-300 dark:border-gray-600 truncate`}
                                        onClick={() => loadSampleScript(sample.code)}
                                        disabled={executing}
                                    >
                                        <div className="flex items-center">
                                            <Code size={14} className="mr-2 text-purple-500" />
                                            {sample.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Saved Scripts */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <Save className="text-purple-500 mr-2" size={16} />
                                    <h3 className="text-base font-bold">Saved Scripts</h3>
                                </div>
                                <button
                                    className={`px-2 py-1 rounded text-xs ${
                                        darkMode 
                                            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                                            : 'bg-white hover:bg-gray-100 text-gray-700'
                                    } border border-gray-300 dark:border-gray-600`}
                                    onClick={() => setShowSaveDialog(!showSaveDialog)}
                                    disabled={executing}
                                >
                                    {showSaveDialog ? 'Cancel' : 'Save Current'}
                                </button>
                            </div>

                            {showSaveDialog && (
                                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} mb-3 border border-gray-300 dark:border-gray-600`}>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            className={`flex-grow p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-300 dark:border-gray-600`}
                                            placeholder="Script name"
                                            value={scriptName}
                                            onChange={(e) => setScriptName(e.target.value)}
                                        />
                                        <button
                                            className="px-3 py-2 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                                            onClick={saveScript}
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={`rounded-lg ${darkMode ? 'bg-gray-700 bg-opacity-50' : 'bg-white bg-opacity-50'} border border-gray-300 dark:border-gray-600 max-h-60 overflow-y-auto`}>
                                {savedScripts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 text-center">
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">No saved scripts</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {savedScripts.map((savedScript) => (
                                            <div key={savedScript.id} className="p-2 hover:bg-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="truncate flex-grow mr-2">{savedScript.name}</div>
                                                    <div className="flex-shrink-0 flex space-x-1">
                                                        <button
                                                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400`}
                                                            onClick={() => loadScript(savedScript)}
                                                            title="Load this script"
                                                        >
                                                            <Upload size={14} />
                                                        </button>
                                                        <button
                                                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600 dark:text-red-400`}
                                                            onClick={() => deleteScript(savedScript.id)}
                                                            title="Delete this script"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Script Editor Panel with Syntax Highlighting */}
                <div className={`lg:col-span-5 rounded-xl ${darkMode ? 'bg-gray-800 bg-opacity-70' : 'bg-white bg-opacity-30'} backdrop-blur-md shadow-lg border border-gray-200 dark:border-gray-700`}>
                    <div className="p-6">
                        <div className="flex items-center mb-4">
                            <Code className="text-purple-500 mr-2" size={20} />
                            <h2 className="text-xl font-bold">Lua Script</h2>
                        </div>

                        <div className="mb-6">
                            <div className={`relative rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'} overflow-hidden`}>
                                <div className={`flex items-center justify-between px-4 py-2 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                                    <div className="flex items-center">
                                        <Terminal size={14} className="mr-2 text-gray-500" />
                                        <span className="text-sm font-medium">Lua Editor</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            className={`p-1 rounded text-xs ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                            onClick={() => setScript('')}
                                            title="Clear editor"
                                            disabled={executing || !script}
                                        >
                                            <X size={14} />
                                        </button>
                                        <button
                                            className={`p-1 rounded text-xs ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                            onClick={() => {
                                                navigator.clipboard.writeText(script);
                                                setSuccessMessage('Script copied to clipboard');
                                                setTimeout(() => setSuccessMessage(''), 3000);
                                            }}
                                            title="Copy to clipboard"
                                            disabled={executing || !script}
                                        >
                                            <Clipboard size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Code editor with syntax highlighting */}
                                <div className="relative" ref={editorRef} style={{ height: '300px' }}>
                                    {/* Syntax highlighted code */}
                                    <pre
                                        ref={preRef}
                                        className="language-lua font-mono text-sm overflow-auto"
                                        style={{ 
                                            position: 'absolute', 
                                            top: 0, 
                                            left: 0, 
                                            right: 0, 
                                            bottom: 0, 
                                            margin: 0, 
                                            padding: '16px',
                                            pointerEvents: 'none',
                                            backgroundColor: darkMode ? '#1e1e2e' : '#ffffff',
                                            color: darkMode ? '#f8f8f2' : '#24292e',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            fontFamily: 'monospace'
                                        }}
                                    >{script}</pre>
                                    
                                    {/* Actual input textarea (visible caret but transparent background) */}
                                    <textarea
                                        ref={textareaRef}
                                        className="font-mono text-sm focus:outline-none resize-none overflow-auto"
                                        value={script}
                                        onChange={handleEditorInput}
                                        onKeyDown={handleKeyDown}
                                        placeholder="-- Enter Lua script to execute on the selected Roblox client..."
                                        spellCheck="false"
                                        disabled={executing}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            padding: '16px',
                                            color: 'rgba(0,0,0,0.05)',
                                            caretColor: darkMode ? 'white' : 'black',
                                            backgroundColor: 'transparent',
                                            whiteSpace: 'pre-wrap',
                                            wordWrap: 'break-word',
                                            fontFamily: 'monospace'
                                        }}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                className={`inline-flex items-center px-6 py-3 rounded-lg font-medium text-white ${
                                    (multiSelectMode && selectedAccounts.length === 0) || (!multiSelectMode && !selectedAccount) || executing || !script
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90'
                                }`}
                                onClick={executeScript}
                                disabled={(multiSelectMode && selectedAccounts.length === 0) || (!multiSelectMode && !selectedAccount) || executing || !script}
                            >
                                {executing ? (
                                    <>
                                        <RefreshCw size={18} className="mr-2 animate-spin" />
                                        Executing...
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} className="mr-2" />
                                        Execute Script
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Custom styling for Prism themes based on dark mode */}
            <style jsx global>{`
                /* Syntax highlighting colors */
                .token.comment,
                .token.prolog,
                .token.doctype,
                .token.cdata {
                    color: #6272a4;
                }

                .token.punctuation {
                    color: #f8f8f2;
                }

                .token.namespace {
                    opacity: 0.7;
                }

                .token.property,
                .token.tag,
                .token.constant,
                .token.symbol,
                .token.deleted {
                    color: #ff79c6;
                }

                .token.boolean,
                .token.number {
                    color: #bd93f9;
                }

                .token.selector,
                .token.attr-name,
                .token.string,
                .token.char,
                .token.builtin,
                .token.inserted {
                    color: #50fa7b;
                }

                .token.operator,
                .token.entity,
                .token.url,
                .language-css .token.string,
                .style .token.string {
                    color: #50fa7b;
                }

                .token.atrule,
                .token.attr-value,
                .token.keyword {
                    color: #ff79c6;
                }

                .token.function,
                .token.class-name {
                    color: #8be9fd;
                }

                .token.regex,
                .token.important,
                .token.variable {
                    color: #f1fa8c;
                }

                /* Make sure the textarea selection is visible and matches theme */
                textarea::selection {
                    background-color: rgba(73, 66, 228, 0.3) !important; /* Blueish highlight */
                    color: inherit !important;
                }
                
                /* Firefox-specific selection styling */
                textarea::-moz-selection {
                    background-color: rgba(73, 66, 228, 0.3) !important;
                    color: inherit !important;
                }
                
                /* Dark mode selection adjustments */
                .dark-mode textarea::selection {
                    background-color: rgba(97, 175, 239, 0.3) !important; /* Lighter blue for dark mode */
                }
                
                .dark-mode textarea::-moz-selection {
                    background-color: rgba(97, 175, 239, 0.3) !important;
                }
                
                /* Fix cursor visibility issues */
                textarea {
                    caret-color: currentColor !important;
                    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace !important;
                    line-height: 1.5 !important;
                    tab-size: 4 !important;
                }
                
                .dark-mode textarea {
                    caret-color: white !important;
                }
                
                .light-mode textarea {
                    caret-color: black !important;
                }
                
                /* Ensure pre and textarea use the same font properties */
                pre, textarea {
                    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    tab-size: 4 !important;
                }
            `}</style>
        </div>
    );
};

export default ScriptExecutor;