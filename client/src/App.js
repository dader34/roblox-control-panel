import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import ProcessList from './components/ProcessList';
import ScriptExecutor from './components/ScriptExecutor';
import MoneyTracking from './components/MoneyTracking';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Terminal, 
  Play, 
  Moon, 
  Sun, 
  DollarSign, 
  ChevronLeft, 
  Settings,
  User,
  HelpCircle,
  Info
} from 'react-feather';
import './styles/App.css';
import './styles/Sidebar.css';

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
      <div className="nav-section">
        <ul>
          <NavLink to="/" icon={<Home size={20} />}>Dashboard</NavLink>
          <NavLink to="/accounts" icon={<Users size={20} />}>Accounts</NavLink>
          <NavLink to="/script-executor" icon={<Terminal size={20} />}>Script Executor</NavLink>
          <NavLink to="/processes" icon={<Play size={20} />}>Processes</NavLink>
          <NavLink to="/money-tracking" icon={<DollarSign size={20} />}>Money Tracking</NavLink>
        </ul>
      </div>

      <div className="nav-section">
        <div className="nav-section-title">Support</div>
        <ul>
          <NavLink to="/settings" icon={<Settings size={20} />}>Settings</NavLink>
          <NavLink to="/help" icon={<HelpCircle size={20} />}>Help & Support</NavLink>
          <NavLink to="/about" icon={<Info size={20} />}>About</NavLink>
        </ul>
      </div>
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
            <div className="app-logo">
              <div className="logo-icon">R</div>
              <span className="app-logo-text">Roblox Panel</span>
            </div>
            <button onClick={toggleSidebar} className="toggle-btn">
              <ChevronLeft size={18} />
            </button>
          </div>
          
          <Routes>
            <Route path="*" element={<Navigation sidebarOpen={sidebarOpen} />} />
          </Routes>
          
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">A</div>
              <div className="user-details">
                <div className="user-name">Admin</div>
                <div className="user-role">Control Panel</div>
              </div>
            </div>
            
            <button onClick={toggleTheme} className="theme-toggle-btn">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
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
            <Route path="/money-tracking" element={<MoneyTracking darkMode={darkMode} />} />
            <Route path="/settings" element={<ComingSoon title="Settings" darkMode={darkMode} />} />
            <Route path="/help" element={<ComingSoon title="Help & Support" darkMode={darkMode} />} />
            <Route path="/about" element={<ComingSoon title="About" darkMode={darkMode} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

// Simple placeholder for routes still under development
const ComingSoon = ({ title, darkMode }) => (
  <div className={`p-6 flex flex-col items-center justify-center min-h-[80vh] ${darkMode ? 'text-white' : 'text-gray-800'}`}>
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-xl mb-8">This feature is coming soon!</p>
    <Link to="/" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity">
      Return to Dashboard
    </Link>
  </div>
);

export default App;