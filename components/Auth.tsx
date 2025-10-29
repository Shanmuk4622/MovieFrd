import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Auth: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (username.length < 3) {
            setError("Username must be at least 3 characters long.");
            setLoading(false);
            return;
        }
        const { error } = await signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            }
          }
        });
        if (error) throw error;
        setMessage("Check your email for the confirmation link!");
      } else {
        const { error } = await signIn({ email, password });
        if (error) throw error;
        // The onAuthStateChange listener in AuthContext will handle the redirect
      }
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3">
                <img src="/asserts/logo2.png" alt="MovieFrd Logo" className="w-10 h-10 object-contain" />
                <h1 className="text-4xl font-bold tracking-wider text-gray-900 dark:text-white">MovieFrd</h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Join the VITAP movie community.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl shadow-gray-300 dark:shadow-black/30">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          
          {error && <p className="bg-red-500/20 text-red-400 text-center p-3 rounded-md mb-4 text-sm">{error}</p>}
          {message && <p className="bg-green-500/20 text-green-400 text-center p-3 rounded-md mb-4 text-sm">{message}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 block mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-bold text-gray-500 dark:text-gray-400 block mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-500 dark:text-gray-400 block mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="w-full p-3 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </div>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="font-bold text-red-500 hover:underline ml-1"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;