import React, { useState } from 'react';
import { Cpu, User, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export const Register = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu và xác nhận mật khẩu không khớp');
      return;
    }

    setLoading(true);
    try {
      await register({ username, password, email });
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công');
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
        <p className="auth-subtitle">Create an Account</p>

        {error && <div className="auth-error-msg">{error}</div>}

        {/* Form matching GiaoDienDangKy.png */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* USERNAME */}
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

          {/* EMAIL */}
          <div className="form-group">
            <label className="form-label">EMAIL</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
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

          {/* CONFIRM PASSWORD */}
          <div className="form-group">
            <label className="form-label">CONFIRM PASSWORD</label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-cyan auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>CREATING ACCOUNT...</span>
              </>
            ) : (
              'REGISTER'
            )}
          </button>
        </form>

        {/* Switch Link */}
        <div className="auth-switch-text">
          <span>Already have an account? </span>
          <button type="button" className="auth-switch-btn" onClick={onSwitchToLogin}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
};
