import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // When a worker is pending, poll for status updates so they see approval/payment prompt immediately
  useEffect(() => {
    let interval;
    if (isAuthenticated && user?.role === 'worker' && user.applicationStatus === 'pending') {
      interval = setInterval(async () => {
        try {
          await refreshUser();
        } catch (err) {
          console.error('Polling refresh failed:', err);
        }
      }, 10000); // every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, user?.role, user?.applicationStatus]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        const user = response.data.user;
        // Ensure worker user has status fields
        if (user.role === 'worker' && !user.applicationStatus) {
          user.applicationStatus = 'not_started';
          user.paymentStatus = 'unpaid';
        }
        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('token', response.data.token);
    const userData = response.data.user;
    // Ensure user object has worker status if applicable
    if (userData.role === 'worker' && !userData.applicationStatus) {
      userData.applicationStatus = 'not_started';
      userData.paymentStatus = 'unpaid';
    }
    setUser(userData);
    setIsAuthenticated(true);
    return response.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    localStorage.setItem('token', response.data.token);
    const user = response.data.user;
    // Ensure user object has worker status if applicable
    if (user.role === 'worker' && !user.applicationStatus) {
      user.applicationStatus = 'not_started';
      user.paymentStatus = 'unpaid';
    }
    setUser(user);
    setIsAuthenticated(true);
    return response.data;
  };

  // Allow components to update local user state without calling the API
  const updateLocalUser = (patch) => {
    setUser((prev) => ({ ...(prev || {}), ...patch }));
  };

  const adminLogin = async (email, password) => {
    const response = await authAPI.adminLogin({ email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token && isAuthenticated) {
      try {
        const response = await authAPI.getCurrentUser();
        const user = response.data.user;
        if (user.role === 'worker' && !user.applicationStatus) {
          user.applicationStatus = 'not_started';
          user.paymentStatus = 'unpaid';
        }
        setUser(user);
        return user;
      } catch (error) {
        console.error('Failed to refresh user:', error);
        throw error;
      }
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    adminLogin,
    logout,
    checkAuth,
    refreshUser,
    updateLocalUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
