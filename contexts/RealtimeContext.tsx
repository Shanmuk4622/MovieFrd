import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { eventBus } from '../utils/eventBus';
import { getChatRooms } from '../supabaseApi';
import { useAuth } from './AuthContext';

interface RealtimeContextValue {
  connected: boolean;
  channelStatuses: Record<string, string>;
  lastEvent: { channel: string; timestamp: number } | null;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [channelStatuses, setChannelStatuses] = useState<Record<string, string>>({});
  const [lastEvent, setLastEvent] = useState<RealtimeContextValue['lastEvent']>(null);

  useEffect(() => {
    if (!user) return;
    const channels: RealtimeChannel[] = [];

    const setStatus = (name: string, status: string) =>
      setChannelStatuses((prev) => ({ ...prev, [name]: status }));

    // Forward a DB change to the app-wide eventBus and record the timestamp
    // (Chat uses lastEvent to decide whether its polling fallback is needed).
    const forward = (channel: string, table: 'direct_messages' | 'room_messages', payload: any) => {
      setLastEvent({ channel, timestamp: Date.now() });
      eventBus.dispatch('realtime:message', {
        table,
        eventType: payload.eventType ?? payload.event,
        new: payload.new,
        old: payload.old,
      });
    };

    const subscribeRoom = (roomId: number) => {
      const name = `realtime-room-${roomId}`;
      const channel = supabase
        .channel(name)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
          (payload) => forward(name, 'room_messages', payload)
        )
        .subscribe((status) => setStatus(name, String(status)));
      channels.push(channel);
    };

    // Incoming DMs (user is receiver).
    const recvName = `realtime-dms-recv-${user.id}`;
    channels.push(
      supabase
        .channel(recvName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${user.id}` },
          (payload) => forward(recvName, 'direct_messages', payload)
        )
        .subscribe((status) => setStatus(recvName, String(status)))
    );

    // Outgoing DMs (user is sender) — keeps the sender's own thread in sync.
    const sentName = `realtime-dms-sent-${user.id}`;
    channels.push(
      supabase
        .channel(sentName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${user.id}` },
          (payload) => forward(sentName, 'direct_messages', payload)
        )
        .subscribe((status) => setStatus(sentName, String(status)))
    );

    // Subscribe to existing rooms, plus any new rooms as they are created.
    (async () => {
      try {
        const rooms = await getChatRooms();
        rooms.forEach((r) => subscribeRoom(r.id));

        const watchName = `realtime-chat_rooms-${user.id}`;
        channels.push(
          supabase
            .channel(watchName)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'chat_rooms' },
              (payload) => {
                const room = payload.new;
                subscribeRoom(room.id);
                eventBus.dispatch('realtime:room_created', { room });
              }
            )
            .subscribe((status) => setStatus(watchName, String(status)))
        );
      } catch (err) {
        console.error('Failed to set up room subscriptions', err);
      }
    })();

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      setChannelStatuses({});
      setLastEvent(null);
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ connected: !!user, channelStatuses, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider');
  return ctx;
};

export default RealtimeContext;
