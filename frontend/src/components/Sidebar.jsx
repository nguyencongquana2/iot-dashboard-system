import React from 'react';
import { 
  Cpu, 
  Gauge, 
  Database, 
  History, 
  User, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'data-sensor', label: 'Data Sensor', icon: Database },
    { id: 'action-history', label: 'Action History', icon: History },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Cpu className="brand-icon" size={20} />
        </div>
        <span className="brand-title">IoT System</span>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="nav-item-left">
                <Icon size={19} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </div>
              {isActive && <div className="nav-active-dot" />}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout at bottom */}
      <div className="sidebar-footer">
        <div className="user-profile-summary">
          <div className="online-indicator">
            <span className="online-dot pulse" />
          </div>
          <span className="user-name" title={user?.fullName || user?.username || 'User'}>
            {user?.fullName || user?.username || 'Nguyen Van A'}
          </span>
        </div>
        <button 
          className="logout-btn" 
          onClick={logout}
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
