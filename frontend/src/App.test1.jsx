import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  console.log('App component is rendering');
  
  return (
    <Router>
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        background: '#f0f0f0',
        minHeight: '100vh'
      }}>
        <h1 style={{ color: 'green' }}>ROUTER IS WORKING!</h1>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
