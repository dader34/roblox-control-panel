import React, { useState, useEffect } from 'react';
import { getProcesses, terminateProcess, getAccounts } from '../services/api';

function ProcessList() {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');


  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const processesData = await getProcesses();
      setProcesses(processesData);
      setError('');
    } catch (error) {
      console.error('Error fetching processes:', error);
      setError('Failed to load process data. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    
    // Set up polling
    const interval = setInterval(fetchProcesses, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleTerminate = async (pid) => {
    try {
      setLoading(true);
      await terminateProcess(pid);
      setSuccessMessage(`Process ${pid} terminated successfully`);
      
      // Remove the terminated process from the list
      setProcesses(processes.filter(p => p.pid !== pid));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error terminating process:', error);
      setError(`Failed to terminate process: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndicator = (process) => {
    // Default to 'running' if no explicit status
    const status = process.status || 'running';
    const statusClass = status === 'running' 
      ? 'status-running' 
      : status === 'launching' 
        ? 'status-launching' 
        : 'status-stopped';
        
    return <span className={`status-indicator ${statusClass}`}></span>;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return 'Invalid time';
    }
  };

  if (loading && processes.length === 0) {
    return <div className="processes-container">Loading process data...</div>;
  }

  return (
    <div className="processes-container">
      <h2>Roblox Processes</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      
      {processes.length === 0 ? (
        <div className="no-processes">
          <p>No Roblox instances currently running</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="processes-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>PID</th>
                  <th>Account</th>
                  <th>Place ID</th>
                  <th>Memory Usage</th>
                  <th>Launched At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((process) => (
                  <tr key={process.pid} className={process.account ? 'has-account' : ''}>
                    <td>{getStatusIndicator(process)} {process.status || 'Running'}</td>
                    <td>{process.pid}</td>
                    <td>{process.account || 'Unknown'}</td>
                    <td>{process.placeId || 'Unknown'}</td>
                    <td>{process.memoryUsage}</td>
                    <td>{formatTime(process.launchTime)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleTerminate(process.pid)}
                          disabled={loading}
                        >
                          Terminate
                        </button>
                      
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          
        </>
      )}
    </div>
  );
}

export default ProcessList;