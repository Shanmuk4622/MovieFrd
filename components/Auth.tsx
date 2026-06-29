import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogoIcon } from './icons';
import { Button, Input } from './ui';

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
          setError('Username must be at least 3 characters long.');
          setLoading(false);
          return;
        }
        const { error } = await signUp({ email, password, options: { data: { username } } });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      } else {
        const { error } = await signIn({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-50 p-4 dark:bg-surface-950">
      {/* Ambient cinematic glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <LogoIcon className="h-11 w-11" />
            <h1 className="text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              MovieFrd
            </h1>
          </div>
          <p className="mt-2 text-surface-500 dark:text-surface-400">Join the VITAP movie community.</p>
        </div>

        <div className="card-surface p-8">
          <h2 className="mb-6 text-center text-2xl font-bold text-surface-900 dark:text-white">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          {error && (
            <p className="mb-4 rounded-xl bg-brand-500/15 p-3 text-center text-sm text-brand-600 dark:text-brand-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mb-4 rounded-xl bg-emerald-500/15 p-3 text-center text-sm text-emerald-600 dark:text-emerald-300">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-surface-500 dark:text-surface-400" htmlFor="username">
                  Username
                </label>
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-surface-500 dark:text-surface-400" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-surface-500 dark:text-surface-400" htmlFor="password">
                Password
              </label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" fullWidth size="lg" isLoading={loading}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500 dark:text-surface-400">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
                setMessage(null);
              }}
              className="ml-1 font-bold text-brand-500 hover:underline"
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
