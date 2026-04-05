import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-8 py-6 border-t border-gray-200 bg-white">
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Created by{' '}
          <a 
            href="https://ankitdwivedi.tech" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:underline font-medium"
          >
            Ankit Dwivedi
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
