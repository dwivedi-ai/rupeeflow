import React from 'react';

function App() {
  console.log('App component is rendering');
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      background: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: 'red' }}>HELLO WORLD - REACT IS WORKING!</h1>
      <p>Current time: {new Date().toLocaleString()}</p>
      <p>If you see this, React is rendering properly.</p>
    </div>
  );
}

export default App;
