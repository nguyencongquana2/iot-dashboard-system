import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IoTProvider } from './context/IoTContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DataSensor } from './components/DataSensor';
import { ActionHistory } from './components/ActionHistory';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { Register } from './components/Register';
import './App.css';

const MainAppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="spinner-glow pulse" />
        <span className="loading-text">Đang khởi tạo hệ thống IoT...</span>
      </div>
    );
  }

  // Not logged in -> Show Auth Screens matching mockups
  if (!user || !user.isLoggedIn) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  // Logged in -> Show Full IoT Dashboard Layout
  return (
    <div className="app-container">
      {/* Persistent Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className={`main-content ${activeTab === 'dashboard' ? 'main-content-dashboard' : ''}`}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'data-sensor' && <DataSensor />}
        {activeTab === 'action-history' && <ActionHistory />}
        {activeTab === 'profile' && <Profile />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <IoTProvider>
        <MainAppContent />
      </IoTProvider>
    </AuthProvider>
  );
}
