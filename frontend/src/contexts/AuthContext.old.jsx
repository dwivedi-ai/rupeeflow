import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        loading: false 
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, loading: false, error: null };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (emailOrToken, password, rememberMe = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      let data;
      
      // If only one parameter is passed, it's a token (from OAuth callback)
      if (password === undefined) {
        // Token-based login (from OAuth)
        const token = emailOrToken;
        localStorage.setItem('authToken', token);
        // Fetch user data with the token
        const userData = await authAPI.getMe();
        data = { token, user: userData };
      } else {
        // Email/password login
        data = await authAPI.login(emailOrToken, password);
      }
      
      if (rememberMe || password === undefined) {
        // Store with longer expiration (for "remember me" or OAuth)
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('loginExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 days
      } else {
        // Store for session only
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('loginExpiry');
      }
      
      dispatch({ type: 'SET_USER', payload: data.user });
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (email, password, fullName) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.register(email, password, fullName);
      
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      dispatch({ type: 'SET_USER', payload: data.user });
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('loginExpiry');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      
      // Check if remember me is enabled and if login has expired
      if (rememberMe) {
        const loginExpiry = localStorage.getItem('loginExpiry');
        if (loginExpiry && new Date() > new Date(loginExpiry)) {
          // Login expired, clear all data
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('loginExpiry');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
      }
      
      if (!token || !savedUser) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Parse saved user
      const parsedUser = JSON.parse(savedUser);
      
      // Set user immediately from saved data
      dispatch({ type: 'SET_USER', payload: parsedUser });
      
      // Optionally verify token is still valid in background (don't block UI)
      authAPI.getMe()
        .then((data) => {
          // Update with fresh user data if different
          dispatch({ type: 'SET_USER', payload: data.user });
        })
        .catch((error) => {
          console.warn('Token verification failed:', error);
          // Only logout if it's a 401 error (unauthorized)
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('loginExpiry');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            dispatch({ type: 'LOGOUT' });
          }
        });
        
    } catch (error) {
      console.error('Auth check error:', error);
      // Don't clear auth data on network errors, just set loading to false
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
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
