import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import './styles/App.css';
import './styles/Sidebar.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log('Roblox Control Panel initialized')
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);