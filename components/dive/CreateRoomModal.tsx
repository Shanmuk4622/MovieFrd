import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string | null) => Promise<void>;
  isAnonymousDefault: boolean;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onSubmit, isAnonymousDefault }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(isAnonymousDefault);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsAnonymous(isAnonymousDefault);
  }, [isAnonymousDefault]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setName('');
      setDescription('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setError('Room name must be at least 3 characters long.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim(), description.trim() || null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create room.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Create a New Room</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <p className="bg-red-500/20 text-red-400 text-center p-3 rounded-md text-sm">{error}</p>}
            
            <div>
              <label className="text-sm font-bold text-gray-500 dark:text-gray-400 block mb-2" htmlFor="room-name">
                Room Name
              </label>
              <input
                id="room-name"
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., #salaar-spoilers"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-bold text-gray-500 dark:text-gray-400 block mb-2" htmlFor="room-desc">
                Description (Optional)
              </label>
              <textarea
                id="room-desc"
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this room about?"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-md">
              <span className="font-semibold text-gray-900 dark:text-white">Anonymous Room</span>
              <label htmlFor="anonymous-toggle" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="anonymous-toggle" 
                  className="sr-only peer"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700/50 flex justify-end rounded-b-2xl">
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;