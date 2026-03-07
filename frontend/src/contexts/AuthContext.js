import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessibleDashboards, setAccessibleDashboards] = useState(['general']);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          setAuthToken(token); // Ensure token is set in axios defaults
          const response = await authService.getCurrentUser();
          setUser(response.data.user);
          await fetchAccessibleDashboards();
        } catch (error) {
          console.error('Init auth error:', error);
          setAuthToken(null); // Clear invalid token
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const fetchAccessibleDashboards = async () => {
    try {
      const response = await authService.getAccessibleDashboards();
      setAccessibleDashboards(response.data.dashboards);
    } catch (error) {
      console.error('Error fetching accessible dashboards:', error);
    }
  };

  const login = async (username, password) => {
    const response = await authService.login(username, password);
    const { access_token, user: userData } = response.data;
    console.log('Login response:', { access_token, userData });
    setAuthToken(access_token); // This sets both localStorage and axios defaults
    console.log('Token set via setAuthToken');
    setUser(userData);
    await fetchAccessibleDashboards();
    return userData;
  };

  const register = async (username, email, password, category) => {
    const response = await authService.register(username, email, password, category);
    return response.data;
  };

  const logout = () => {
    setAuthToken(null); // This removes token from both localStorage and axios defaults
    setUser(null);
    setAccessibleDashboards(['general']);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    accessibleDashboards,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
