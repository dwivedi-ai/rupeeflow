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

  const login = async (email, password, rememberMe = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.login(email, password);
      
      if (rememberMe) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
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

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await authAPI.register(userData);
      
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
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const loginWithToken = async (token) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('AuthContext - loginWithToken called with token:', token);
      
      // Store token first
      localStorage.setItem('authToken', token);
      
      // Get user data with the token
      console.log('AuthContext - Fetching user data...');
      const userData = await authAPI.getMe();
      console.log('AuthContext - User data received:', userData);
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      dispatch({ type: 'SET_USER', payload: userData });
      console.log('AuthContext - User set successfully');
      return { success: true };
    } catch (error) {
      console.error('Token login failed:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      dispatch({ type: 'SET_ERROR', payload: 'Authentication failed' });
      return { success: false, error: 'Authentication failed' };
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'SET_USER', payload: userData });
    // Update stored user data
    const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(userData));
  };

  // Simple initialization - just check if we have a token and user
  useEffect(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Validate token by making a request to /me
        authAPI.getMe()
          .then((userData) => {
            dispatch({ type: 'SET_USER', payload: userData });
          })
          .catch((error) => {
            console.error('Token validation failed:', error);
            // Clear invalid tokens
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            dispatch({ type: 'SET_LOADING', payload: false });
          });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const value = {
    ...state,
    login,
    register,
    logout,
    loginWithToken,
    updateUser,
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
