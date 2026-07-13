import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />
      <main className="px-4 py-6 md:px-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;