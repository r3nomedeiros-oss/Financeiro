import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, user, onLogout }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 overflow-auto">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
