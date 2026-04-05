import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (hasProcessed.current) return; // Prevent multiple executions
      hasProcessed.current = true;
      
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      console.log('AuthCallback - Token:', token);
      console.log('AuthCallback - Error:', error);

      if (error) {
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
        return;
      }

      if (!token) {
        toast.error('No authentication token received.');
        navigate('/login');
        return;
      }

      try {
        console.log('AuthCallback - Attempting to login with token...');
        const result = await loginWithToken(token);
        console.log('AuthCallback - Login result:', result);
        
        if (result.success) {
          toast.success('Successfully logged in with Google!');
          navigate('/dashboard');
        } else {
          toast.error(result.error || 'Authentication failed. Please try again.');
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-4 text-center">
        <LoadingSpinner />
        <h2 className="text-xl font-semibold text-gray-900">
          Completing authentication...
        </h2>
        <p className="text-gray-600">
          Please wait while we log you in.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
