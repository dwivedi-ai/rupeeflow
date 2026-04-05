import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

function App() {
  console.log('App component is rendering');
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 p-5">
        <h1 className="text-3xl font-bold text-blue-600">TAILWIND CSS IS WORKING!</h1>
        <Routes>
          <Route path="/" element={<div className="mt-4 p-4 bg-white rounded shadow">Home Page with Tailwind</div>} />
          <Route path="/login" element={<div className="mt-4 p-4 bg-green-100 rounded">Login Page with Tailwind</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
