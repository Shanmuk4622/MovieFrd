import React, { useState } from 'react';
import { SearchIcon, UserIcon, PlayIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../App';

interface HeaderProps {
    setView: (view: View) => void;
    onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setView, onSearch }) => {
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-gray-900 bg-opacity-80 backdrop-blur-md sticky top-0 z-50 p-4 shadow-lg shadow-black/20">
      <div className="container mx-auto flex items-center justify-between">
        <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setView('dashboard')}
        >
          <PlayIcon className="w-8 h-8 text-red-500" />
          <span className="text-xl font-bold tracking-wider">MovieFrd</span>
        </div>
        
        <div className="flex-1 flex justify-center px-8">
          <div className="relative w-full max-w-lg">
            <input
              type="text"
              placeholder="Search for a movie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setView('chat')}
            className="hidden sm:block text-sm font-semibold hover:text-red-500 transition-colors"
          >
            Chat
          </button>
          {user ? (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setView('profile')}
                className="text-sm font-semibold hover:text-red-500 transition-colors truncate max-w-[100px] md:max-w-xs"
              >
                {user.user_metadata.username || user.email}
              </button>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-3 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <UserIcon className="w-8 h-8 text-gray-400" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
