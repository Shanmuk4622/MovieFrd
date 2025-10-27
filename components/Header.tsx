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
          <h1 className="text-2xl font-bold tracking-wider text-white">MovieFrd</h1>
        </div>
        <div className="hidden md:flex flex-1 max-w-lg items-center relative">
          <input
            type="text"
            placeholder="Search for movies or series..."
            className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <SearchIcon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 rounded-full hover:bg-gray-700">
                <SearchIcon className="w-6 h-6 text-gray-300" />
            </button>
            {user ? (
                 <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setView('profile')}
                        className="text-sm font-medium hidden sm:inline cursor-pointer hover:text-red-400"
                    >
                        {user.user_metadata.username || user.email}
                    </button>
                    <button onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full text-sm transition-colors">
                        Sign Out
                    </button>
                </div>
            ) : (
                <button className="p-2 rounded-full hover:bg-gray-700">
                    <UserIcon className="w-8 h-8 text-gray-300" />
                </button>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
