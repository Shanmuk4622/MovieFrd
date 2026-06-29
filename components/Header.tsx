import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchIcon, ChatBubbleIcon, LogoIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { searchMovies } from '../api';
import { Movie } from '../types';
import { cn } from '../utils/cn';
import { Avatar, IconButton, Input } from './ui';
import { POSTER_FALLBACK, handleImageError } from '../utils/images';

interface SearchInputProps {
  onSearch: (query: string) => void;
}

/** Search box with 300ms-debounced live suggestions. */
const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchMovies(query);
        setSuggestions(results.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close the dropdown when clicking away.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = (value: string) => {
    if (!value.trim()) return;
    setShowSuggestions(false);
    onSearch(value.trim());
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        type="text"
        value={query}
        placeholder="Search for a movie…"
        leftIcon={<SearchIcon className="h-5 w-5" />}
        className="rounded-full"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit(query);
          if (e.key === 'Escape') setShowSuggestions(false);
        }}
      />

      {showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
        <div className="card-surface absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto scrollbar-thin p-1">
          {loadingSuggestions && (
            <div className="p-3 text-center text-sm text-surface-400">Searching…</div>
          )}
          {suggestions.map((movie) => (
            <button
              key={movie.id}
              onClick={() => {
                setQuery(movie.title);
                submit(movie.title);
              }}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <img
                src={movie.posterUrl}
                alt={movie.title}
                onError={handleImageError(POSTER_FALLBACK)}
                className="h-14 w-10 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-surface-900 dark:text-white">{movie.title}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'} · ⭐ {movie.rating.toFixed(1)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Header: React.FC = () => {
  const { user, profile, hasUnreadDms } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname === '/chat';

  const handleSearch = (query: string) => navigate(`/search?q=${encodeURIComponent(query)}`);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex-shrink-0 border-b border-surface-200/70 dark:border-surface-800',
        isChat
          ? 'bg-white dark:bg-surface-900'
          : 'bg-white/80 backdrop-blur-md dark:bg-surface-950/80'
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex flex-shrink-0 items-center gap-2.5"
            aria-label="Go to dashboard"
          >
            <LogoIcon className="h-9 w-9" />
            <span className="text-xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              MovieFrd
            </span>
          </button>

          {!isChat && (
            <div className="hidden flex-1 justify-center px-4 md:flex lg:px-8">
              <div className="w-full max-w-lg">
                <SearchInput onSearch={handleSearch} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            <IconButton
              aria-label="Open chat"
              onClick={() => navigate('/chat')}
              className="relative hover:text-brand-500"
            >
              <ChatBubbleIcon className="h-6 w-6" />
              {hasUnreadDms && (
                <span className="absolute right-1.5 top-1.5 block h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500 ring-2 ring-white dark:ring-surface-950" />
              )}
            </IconButton>

            <button
              onClick={() => navigate('/profile')}
              className="group flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <Avatar src={profile?.avatar_url} name={profile?.username || user?.email} size="h-8 w-8" />
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-surface-800 group-hover:text-brand-500 dark:text-surface-100 md:inline">
                {profile?.username || user?.email}
              </span>
            </button>
          </div>
        </div>

        {!isChat && (
          <div className="mt-3 md:hidden">
            <SearchInput onSearch={handleSearch} />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
