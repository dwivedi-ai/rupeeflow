import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.simple';
import './index.css';

function TestComponent() {
  const { loading, isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 p-5">
      <h1 className="text-3xl font-bold text-green-600">AUTH CONTEXT IS WORKING!</h1>
      <p className="mt-4">Loading: {loading ? 'true' : 'false'}</p>
      <p>Authenticated: {isAuthenticated ? 'true' : 'false'}</p>
    </div>
  );
}

function App() {
  console.log('App component is rendering');
  
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<TestComponent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
