import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import ProcessList from './components/ProcessList';
import ScriptExecutor from './components/ScriptExecutor';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Router>
      <div className="app-container">
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h2>Roblox Panel</h2>
            <button onClick={toggleSidebar} className="toggle-btn">
              {sidebarOpen ? '×' : '≡'}
            </button>
          </div>
          <nav className="sidebar-nav">
            <ul>
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>
                <Link to="/accounts">Accounts</Link>
              </li>
              <li>
                <Link to="/script-executor">Script Executor</Link>
              </li>
              <li>
                <Link to="/processes">Processes</Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<AccountList />} />
            <Route path="/script-executor" element={<ScriptExecutor />} />
            <Route path="/processes" element={<ProcessList />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;