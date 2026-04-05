import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>RupeeFlow Test</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ background: '#f0f0f0', padding: '10px', marginTop: '10px' }}>
        <p>Current time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default App;
