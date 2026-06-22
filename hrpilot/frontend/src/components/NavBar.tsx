import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Navigation bar shown on all authenticated pages.
 * Shows the current page and provides navigation links.
 */
const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-xl font-bold">HRPilot</span>
          <Link to="/chat" className="hover:text-blue-200 text-sm font-medium">💬 Q&A Chat</Link>
          <Link to="/agent" className="hover:text-blue-200 text-sm font-medium">🤖 AI Agent</Link>
          {role === 'ADMIN' && (
            <Link to="/admin" className="hover:text-blue-200 text-sm font-medium">📄 Documents</Link>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-blue-800 hover:bg-blue-900 px-4 py-1 rounded-lg transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
