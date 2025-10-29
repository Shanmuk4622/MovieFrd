import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircleIcon, XIcon, ChatBubbleIcon, UserIcon } from './icons';
import { Profile } from '../types';

interface NotificationProps {
  // FIX: Added 'error' to the notification type to support error messages.
  notification: { message: string; type: 'success' | 'info' | 'dm' | 'error'; senderProfile?: Profile };
  onClose: () => void;
  onClick?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose, onClick }) => {
    const { message, type, senderProfile } = notification;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Mount animation
        const enterTimer = setTimeout(() => setVisible(true), 100);

        // Auto-dismiss timer
        const exitTimer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
        };
    }, []); // Run only on mount

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for animation to finish
    };
    
    const isClickable = !!onClick;
    const WrapperComponent = isClickable ? 'button' : 'div';

    const icon = useMemo(() => {
        if (type === 'dm' && senderProfile) {
            return senderProfile.avatar_url 
                ? <img src={senderProfile.avatar_url} alt={senderProfile.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0"/>
                : <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><UserIcon className="w-6 h-6 text-gray-300" /></div>;
        }
        if (type === 'success') return <CheckCircleIcon className="w-6 h-6 text-green-400 flex-shrink-0" />;
        // FIX: Added a case for the 'error' notification type.
        if (type === 'error') return <XIcon className="w-6 h-6 text-red-400 flex-shrink-0" />;
        // Fallback for 'info'
        return <ChatBubbleIcon className="w-6 h-6 text-blue-400 flex-shrink-0" />;
    }, [type, senderProfile]);

    const content = useMemo(() => {
        if (type === 'dm' && senderProfile) {
            const messageText = message.replace(`${senderProfile.username}: `, '');
            return (
                <div>
                    <p className="font-bold text-white text-left">{senderProfile.username}</p>
                    <p className="text-sm text-gray-300 line-clamp-2 text-left">{messageText}</p>
                </div>
            );
        }
        return <p className="flex-1 text-sm font-semibold">{message}</p>;
    }, [message, type, senderProfile]);

    return (
        <div className="fixed top-5 right-0 z-[200] w-full max-w-sm p-4" role="alert">
            <WrapperComponent
                onClick={onClick}
                className={`flex w-full items-start space-x-4 bg-gray-800/90 backdrop-blur-md text-white p-4 rounded-lg shadow-2xl transform transition-transform duration-300 ease-in-out ${visible ? 'translate-x-0' : 'translate-x-full'} ${isClickable ? 'cursor-pointer hover:bg-gray-700' : ''}`}
            >
                {icon}
                <div className="flex-1 min-w-0">
                    {content}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleClose(); }} aria-label="Close notification" className="flex-shrink-0 p-1 -mt-1 -mr-1 rounded-full hover:bg-white/10">
                    <XIcon className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
            </WrapperComponent>
        </div>
    );
};

export default Notification;
