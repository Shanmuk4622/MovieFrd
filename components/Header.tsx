import React, { useState } from 'react';
import { SearchIcon, UserIcon, PlayIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../App';

interface HeaderProps {
    setView: (view: View) => void;
    onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setView, onSearch }) => {
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 p-4 shadow-lg shadow-gray-200/60 dark:shadow-black/20">
      <div className="container mx-auto flex items-center justify-between">
        <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setView('dashboard')}
        >
          <PlayIcon className="w-8 h-8 text-red-500" />
          <span className="text-xl font-bold tracking-wider text-gray-900 dark:text-white">MovieFrd</span>
        </div>
        
        <div className="flex-1 flex justify-center px-4 lg:px-8">
          <div className="relative w-full max-w-lg">
            <input
              type="text"
              placeholder="Search for a movie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setView('chat')}
            className="hidden sm:block text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-red-500 transition-colors"
          >
            Chat
          </button>
          {user ? (
            <div className="flex items-center space-x-3">
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
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-3 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;