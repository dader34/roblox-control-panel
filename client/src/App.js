import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import ProcessList from './components/ProcessList';
import ScriptExecutor from './components/ScriptExecutor';
import { Menu, X, Home, Users, Terminal, Play, Moon, Sun } from 'react-feather';
import './styles/App.css';

// NavLink component to handle active states
const NavLink = ({ to, icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <li>
      <Link 
        to={to} 
        className={`nav-link ${isActive ? 'active' : ''}`}
      >
        {icon}
        <span>{children}</span>
      </Link>
    </li>
  );
};

// Navigation wrapper to provide useLocation hook context
const Navigation = ({ sidebarOpen }) => {
  return (
    <nav className="sidebar-nav">
      <ul>
        <NavLink to="/" icon={<Home size={18} />}>Dashboard</NavLink>
        <NavLink to="/accounts" icon={<Users size={18} />}>Accounts</NavLink>
        <NavLink to="/script-executor" icon={<Terminal size={18} />}>Script Executor</NavLink>
        <NavLink to="/processes" icon={<Play size={18} />}>Processes</NavLink>
      </ul>
    </nav>
  );
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <Router>
      <div className={`app-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <h2 className="app-logo">
              <span className="app-logo-text">Roblox Panel</span>
            </h2>
            <button onClick={toggleSidebar} className="toggle-btn">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          
          <Routes>
            <Route path="*" element={<Navigation sidebarOpen={sidebarOpen} />} />
          </Routes>
          
          <div className="sidebar-footer">
            {/* <button onClick={toggleTheme} className="theme-toggle-btn">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button> */}
          </div>
        </div>

        <div className={`main-content ${!sidebarOpen ? 'shifted' : ''}`}>
          <div className="mobile-header">
            <button onClick={toggleSidebar} className="mobile-toggle-btn">
              <Menu size={24} />
            </button>
            <h2>Roblox Panel</h2>
          </div>
          
          <Routes>
            <Route path="/" element={<Dashboard darkMode={darkMode} setDarkMode={setDarkMode} />} />
            <Route path="/accounts" element={<AccountList darkMode={darkMode} />} />
            <Route path="/script-executor" element={<ScriptExecutor darkMode={darkMode} />} />
            <Route path="/processes" element={<ProcessList darkMode={darkMode} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;