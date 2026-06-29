import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircleIcon, XIcon, ChatBubbleIcon } from './icons';
import { AppNotification } from '../types';
import { cn } from '../utils/cn';
import { Avatar } from './ui';

interface NotificationProps {
  notification: AppNotification;
  onClose: () => void;
  onClick?: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose, onClick }) => {
  const { message, type, senderProfile } = notification;
  const [visible, setVisible] = useState(false);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 50);
    const exit = setTimeout(handleClose, 5000);
    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isClickable = !!onClick;
  const Wrapper = isClickable ? 'button' : 'div';

  const icon = useMemo(() => {
    if (type === 'dm' && senderProfile) {
      return <Avatar src={senderProfile.avatar_url} name={senderProfile.username} size="h-10 w-10" />;
    }
    if (type === 'success') return <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-emerald-400" />;
    if (type === 'error') return <XIcon className="h-6 w-6 flex-shrink-0 text-brand-400" />;
    return <ChatBubbleIcon className="h-6 w-6 flex-shrink-0 text-sky-400" />;
  }, [type, senderProfile]);

  const content = useMemo(() => {
    if (type === 'dm' && senderProfile) {
      const text = message.replace(`${senderProfile.username}: `, '');
      return (
        <div className="text-left">
          <p className="font-bold text-white">{senderProfile.username}</p>
          <p className="line-clamp-2 text-sm text-surface-300">{text}</p>
        </div>
      );
    }
    return <p className="flex-1 text-sm font-semibold text-white">{message}</p>;
  }, [message, type, senderProfile]);

  return (
    <div className="fixed right-0 top-5 z-[200] w-full max-w-sm p-4" role="alert">
      <Wrapper
        onClick={onClick}
        className={cn(
          'flex w-full items-start gap-4 rounded-2xl bg-surface-800/95 p-4 text-white shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-[120%]',
          isClickable && 'cursor-pointer hover:bg-surface-700'
        )}
      >
        {icon}
        <div className="min-w-0 flex-1">{content}</div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="Close notification"
          className="-mr-1 -mt-1 flex-shrink-0 rounded-full p-1 hover:bg-white/10"
        >
          <XIcon className="h-5 w-5 text-surface-400 hover:text-white" />
        </button>
      </Wrapper>
    </div>
  );
};

export default Notification;
