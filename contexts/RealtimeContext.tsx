import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { supabase } from '../supabaseClient';
import { eventBus } from '../utils/eventBus';
import { getChatRooms } from '../supabaseApi';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

type RealtimeContextValue = {
  connected: boolean;
  channelStatuses: Record<string, string>;
  lastEvent: any | null;
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [channelStatuses, setChannelStatuses] = useState<Record<string, string>>({});
  const [lastEvent, setLastEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Helper to add a subscription and track the channel
    const addChannel = (channel: RealtimeChannel, name?: string) => {
      channels.push(channel);
      if (name) setChannelStatuses(prev => ({ ...prev, [name]: 'SUBSCRIBING' }));
    };

    const setChannelStatus = (name: string, status: string) => {
      setChannelStatuses(prev => ({ ...prev, [name]: status }));
    };

    // Subscribe to direct messages where the user is the receiver (incoming DMs)
    const dmReceiverChannelName = `realtime-dms-recv-${user.id}`;
    const dmReceiverChannel = supabase
      .channel(dmReceiverChannelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${user.id}` },
        (payload: any) => {
          try {
            console.debug('[Realtime] DM (recv) payload received', payload?.event ?? payload?.eventType, payload?.new ? { id: payload.new.id, sender_id: payload.new.sender_id, receiver_id: payload.new.receiver_id, content: String(payload.new.content).slice(0,80) } : payload);
            eventBus.dispatch('realtime:message', { table: 'direct_messages', eventType: payload.eventType ?? payload.event, new: payload.new, old: payload.old });
          } catch (e) {
            console.error('Error dispatching DM realtime event', e);
          }
        }
      )
      .subscribe((status, err) => {
        console.info('[Realtime] dmReceiverChannel status', status, err || '');
        setChannelStatus(dmReceiverChannelName, String(status));
        if (err) setLastEvent({ channel: dmReceiverChannelName, status, err, timestamp: Date.now() });
      });
    addChannel(dmReceiverChannel, dmReceiverChannelName);

    // Subscribe to direct messages where the user is the sender (useful for updates to messages sent by me)
    const dmSenderChannelName = `realtime-dms-sent-${user.id}`;
    const dmSenderChannel = supabase
      .channel(dmSenderChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${user.id}` },
        (payload: any) => {
          try {
            console.debug('[Realtime] DM (sent) payload received', payload?.event ?? payload?.eventType, payload?.new ? { id: payload.new.id, sender_id: payload.new.sender_id, receiver_id: payload.new.receiver_id, content: String(payload.new.content).slice(0,80) } : payload);
            eventBus.dispatch('realtime:message', { table: 'direct_messages', eventType: payload.eventType ?? payload.event, new: payload.new, old: payload.old });
          } catch (e) {
            console.error('Error dispatching DM realtime event', e);
          }
        }
      )
      .subscribe((status, err) => {
        console.info('[Realtime] dmSenderChannel status', status, err || '');
        setChannelStatus(dmSenderChannelName, String(status));
        if (err) setLastEvent({ channel: dmSenderChannelName, status, err, timestamp: Date.now() });
      });
    addChannel(dmSenderChannel, dmSenderChannelName);

    // Subscribe to existing chat rooms messages and to new rooms
    (async () => {
      try {
        const rooms = await getChatRooms();
        rooms.forEach(r => {
          const roomName = `realtime-room-${r.id}`;
          const roomChannel = supabase
            .channel(roomName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${r.id}` }, (payload: any) => {
              try {
                console.debug('[Realtime] room payload', r.id, payload?.event ?? payload?.eventType, payload?.new ? { id: payload.new.id, room_id: payload.new.room_id, sender_id: payload.new.sender_id, content: String(payload.new.content).slice(0,80) } : payload);
                setLastEvent({ channel: roomName, payload, timestamp: Date.now() });
                eventBus.dispatch('realtime:message', { table: 'room_messages', eventType: payload.eventType ?? payload.event, new: payload.new, old: payload.old });
              } catch (e) {
                console.error('Error dispatching room realtime event', e);
              }
            })
            .subscribe((status, err) => {
              setChannelStatus(roomName, String(status));
              if (err) setLastEvent({ channel: roomName, status, err, timestamp: Date.now() });
            });
          addChannel(roomChannel, roomName);
        });

        // Also listen for new rooms being created so we can subscribe dynamically
        const roomsWatchName = `realtime-chat_rooms-${user.id}`;
        const roomsWatch = supabase
          .channel(roomsWatchName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, (payload: any) => {
            console.debug('[Realtime] new chat_room created', payload?.new?.id);
            const r = payload.new;
            const roomName = `realtime-room-${r.id}`;
            const roomChannel = supabase
              .channel(roomName)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${r.id}` }, (p: any) => {
                try {
                  setLastEvent({ channel: roomName, payload: p, timestamp: Date.now() });
                  eventBus.dispatch('realtime:message', { table: 'room_messages', eventType: p.eventType ?? p.event, new: p.new, old: p.old });
                } catch (e) {
                  console.error('Error dispatching room realtime event', e);
                }
              })
              .subscribe((status, err) => {
                setChannelStatus(roomName, String(status));
                if (err) setLastEvent({ channel: roomName, status, err, timestamp: Date.now() });
              });
            addChannel(roomChannel, roomName);
            eventBus.dispatch('realtime:room_created', { room: r });
          })
          .subscribe((status, err) => {
            setChannelStatus(roomsWatchName, String(status));
            if (err) setLastEvent({ channel: roomsWatchName, status, err, timestamp: Date.now() });
          });
        addChannel(roomsWatch, roomsWatchName);
      } catch (err) {
        console.error('Failed to setup room subscriptions', err);
      }
    })();

    return () => {
      try {
        channels.forEach(ch => supabase.removeChannel(ch));
      } catch (e) {
        // ignore
      }
      setChannelStatuses({});
      setLastEvent(null);
    };
  }, [user]);

  return <RealtimeContext.Provider value={{ connected: !!user, channelStatuses, lastEvent }}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider');
  return ctx;
};

export default RealtimeContext;
