import React, { useState } from 'react';
import { SearchIcon, UserIcon, ChatBubbleIcon, LogoIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { View } from '../App';

interface SearchInputProps {
    query: string;
    setQuery: (query: string) => void;
    onSubmit: () => void;
}

// Standalone SearchInput component to prevent focus loss on re-renders.
const SearchInput: React.FC<SearchInputProps> = ({ query, setQuery, onSubmit }) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSubmit();
        }
    };
    
    return (
        <div className="relative w-full">
            <input
                type="text"
                placeholder="Search for a movie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
                type="button"
                onClick={onSubmit}
                aria-label="Submit search"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
                <SearchIcon className="w-5 h-5" />
            </button>
        </div>
    );
};


interface HeaderProps {
    setView: (view: View) => void;
    onSearch: (query: string) => void;
    view: View;
}

const Header: React.FC<HeaderProps> = ({ setView, onSearch, view }) => {
  const { user, profile, hasUnreadDms } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };
  
  const renderRightNav = () => (
    <div className="flex items-center space-x-2 sm:space-x-4">
        <button
        onClick={() => setView('chat')}
        className="relative p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-red-500 transition-colors"
        aria-label="Open chat"
        >
        <ChatBubbleIcon className="w-6 h-6" />
        {hasUnreadDms && (
            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
        )}
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
  );

  const headerClasses = view === 'chat'
    ? 'bg-white dark:bg-gray-800 sticky top-0 z-50 p-4 flex-shrink-0'
    : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 p-4 shadow-lg shadow-gray-200/60 dark:shadow-black/20 flex-shrink-0';


  return (
    <header className={headerClasses}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
            <div 
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => setView('dashboard')}
            >
                <LogoIcon className="w-9 h-9" />
                <span className="text-xl font-bold tracking-wider text-gray-900 dark:text-white">MovieFrd</span>
            </div>
            
            {view !== 'chat' && (
                <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8">
                    <div className="w-full max-w-lg">
                        <SearchInput 
                            query={searchQuery}
                            setQuery={setSearchQuery}
                            onSubmit={handleSearchSubmit}
                        />
                    </div>
                </div>
            )}
            
            {/* Empty spacer for chat view to keep right nav aligned */}
            {view === 'chat' && (
                <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8"></div>
            )}

            {renderRightNav()}
        </div>
        
        {view !== 'chat' && (
            <div className="md:hidden mt-4">
                <SearchInput 
                    query={searchQuery}
                    setQuery={setSearchQuery}
                    onSubmit={handleSearchSubmit}
                />
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;