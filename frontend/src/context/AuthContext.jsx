import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial profile
    apiService.getProfile()
      .then((profile) => {
        setUser(profile);
      })
      .catch((err) => {
        console.error('Failed to load profile', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await apiService.login(username, password);
    setUser(res.data);
    return res;
  };

  const register = async (data) => {
    const res = await apiService.register(data);
    setUser(res.data);
    return res;
  };

  const logout = () => {
    if (user) {
      setUser({ ...user, isLoggedIn: false });
    }
  };

  const updateProfile = async (profileData) => {
    const res = await apiService.updateProfile(profileData);
    setUser(res.data);
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
