import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="p-8">
        <Outlet /> 
      </main>
    </div>
  );
};

export default Layout;