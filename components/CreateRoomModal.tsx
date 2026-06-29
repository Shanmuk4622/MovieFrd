import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Textarea } from './ui';

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

  useEffect(() => setIsAnonymous(isAnonymousDefault), [isAnonymousDefault]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a New Room" maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-6">
          {error && (
            <p className="rounded-xl bg-brand-500/15 p-3 text-center text-sm text-brand-600 dark:text-brand-300">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="room-name" className="mb-1.5 block text-sm font-semibold text-surface-500 dark:text-surface-400">
              Room Name
            </label>
            <Input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., #salaar-spoilers"
              required
            />
          </div>

          <div>
            <label htmlFor="room-desc" className="mb-1.5 block text-sm font-semibold text-surface-500 dark:text-surface-400">
              Description (Optional)
            </label>
            <Textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this room about?"
              className="h-24"
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl bg-surface-100 p-3 dark:bg-surface-800/60">
            <span className="font-semibold text-surface-900 dark:text-white">Anonymous Room</span>
            <span className="relative inline-flex items-center">
              <input type="checkbox" className="peer sr-only" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
              <span className="h-6 w-11 rounded-full bg-surface-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full dark:bg-surface-600" />
            </span>
          </label>
        </div>

        <div className="flex justify-end border-t border-surface-200/70 px-5 py-4 dark:border-surface-800">
          <Button type="submit" isLoading={loading}>
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateRoomModal;
