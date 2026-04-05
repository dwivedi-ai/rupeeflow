import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.simple';
import Login from './pages/Login';
import './index.css';

function TestRoutes() {
  const { loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-5">Loading...</div>;
  }
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <div className="min-h-screen bg-gray-50 p-5">
          <h1 className="text-3xl font-bold text-green-600">MAIN APP IS WORKING!</h1>
          <p className="mt-4">You are {isAuthenticated ? 'authenticated' : 'not authenticated'}</p>
          <a href="/login" className="text-blue-600 underline">Go to Login</a>
        </div>
      } />
    </Routes>
  );
}

function App() {
  console.log('App component is rendering');
  
  return (
    <AuthProvider>
      <Router>
        <TestRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
