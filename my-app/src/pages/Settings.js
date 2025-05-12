import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Settings.css';

const Settings = () => {
  const { currentUser } = useAuth();

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      <div className="settings-content">
        {/* Settings options will be displayed here */}
        <p>Settings content coming soon</p>
      </div>
    </div>
  );
};

export default Settings; 