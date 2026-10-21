import React, { useState } from 'react';
import { Cpu, User, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export const Login = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('nguyencongquan');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công, vui lòng kiểm tra lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Brand Icon */}
        <div className="auth-icon-box">
          <Cpu className="auth-brand-icon" size={28} />
        </div>

        {/* Title & Subtitle */}
        <h1 className="auth-title">IoT System</h1>
        <p className="auth-subtitle">Login to your account</p>

        {error && <div className="auth-error-msg">{error}</div>}

        {/* Form matching GiaoDienDangNhap.png */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">USERNAME / ID</label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">PASSWORD</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-cyan auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>

        {/* Switch Link */}
        <div className="auth-switch-text">
          <span>Don't have an account? </span>
          <button type="button" className="auth-switch-btn" onClick={onSwitchToRegister}>
            Register
          </button>
        </div>
      </div>
    </div>
  );
};
