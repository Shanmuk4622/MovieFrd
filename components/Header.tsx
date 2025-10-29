


import React, { useState } from 'react';
import { SearchIcon, UserIcon, ChatBubbleIcon, LogoIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../App';

interface HeaderProps {
    setView: (view: View) => void;
    onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setView, onSearch }) => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const SearchInput = () => (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search for a movie..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        className="w-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button
        type="button"
        onClick={handleSearchSubmit}
        aria-label="Submit search"
        className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        <SearchIcon className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 p-4 shadow-lg shadow-gray-200/60 dark:shadow-black/20">
      <div className="container mx-auto">
        {/* Top row: Logo and Nav Actions */}
        <div className="flex items-center justify-between">
          <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setView('dashboard')}
          >
            <LogoIcon className="w-9 h-9" />
            <span className="text-xl font-bold tracking-wider text-gray-900 dark:text-white">MovieFrd</span>
          </div>
          
          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8">
            <div className="w-full max-w-lg">
              <SearchInput />
            </div>
          </div>

          {/* Right-side navigation */}
          <div className="flex items-center space-x-2 sm:space-x-4">
             <button
              onClick={() => setView('chat')}
              className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-red-500 transition-colors"
              aria-label="Open chat"
            >
              <ChatBubbleIcon className="w-6 h-6" />
            </button>
            {user ? (
                <button
                  onClick={() => setView('profile')}
                  className="flex items-center space-x-2 group"
                >
                  {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover"/>
                  ) : (
                      <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 group-hover:text-red-500/80 transition-colors" />
                  )}
                  <span className="hidden md:inline truncate max-w-[100px] text-gray-900 dark:text-white group-hover:text-red-500 transition-colors text-sm font-semibold">
                      {profile?.username || user.email}
                  </span>
                </button>
            ) : (
              <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="md:hidden mt-4">
          <SearchInput />
        </div>
      </div>
    </header>
  );
};

export default Header;