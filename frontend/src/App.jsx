import React, { useState, useEffect } from 'react';
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

const VALID_TABS = ['dashboard', 'data-sensor', 'action-history', 'profile'];

const getInitialTab = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (VALID_TABS.includes(hash)) {
    return hash;
  }
  try {
    const saved = localStorage.getItem('iot_active_tab');
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  } catch {}
  return 'dashboard';
};

const MainAppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('iot_active_tab', tab);
    } catch {}
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('iot_active_tab', hash);
        } catch {}
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
