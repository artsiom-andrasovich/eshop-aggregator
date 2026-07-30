import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export const Header = React.memo(function Header() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
        E-Shop Aggregator
      </Link>
      
      <nav className="space-x-4">
        {isAuthenticated ? (
          <div className="flex items-center space-x-4">
            <span className="font-medium">{user?.displayName}</span>
            <Link to="/profile" className="text-sm hover:underline">
              Profile
            </Link>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
              Logout
            </button>
          </div>
        ) : (
          <div className="space-x-4">
            <Link to="/login" className="text-sm hover:underline">
              Login
            </Link>
            <Link to="/register" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
});
