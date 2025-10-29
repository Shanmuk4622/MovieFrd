import React, { useEffect } from 'react';
import { CheckCircleIcon, XIcon } from './icons';

interface NotificationProps {
  message: string;
  type: 'success'; // Can be extended later
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // Auto-dismiss after 3 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const icon = type === 'success' ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> : null;
    
    return (
        <div 
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
            role="alert"
        >
            <div className="flex items-center space-x-3 bg-gray-800 text-white p-4 rounded-lg shadow-2xl animate-fade-in">
                {icon}
                <p className="flex-1 text-sm font-semibold">{message}</p>
                <button onClick={onClose} aria-label="Close notification">
                    <XIcon className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
            </div>
        </div>
    );
};

export default Notification;