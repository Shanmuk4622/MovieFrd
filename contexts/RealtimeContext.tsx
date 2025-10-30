import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { eventBus } from '../utils/eventBus';
import { getChatRooms } from '../supabaseApi';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

const RealtimeContext = createContext<{ connected: boolean } | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Helper to add a subscription and track the channel
    const addChannel = (channel: RealtimeChannel) => {
      channels.push(channel);
    };

    // Subscribe to direct messages where the user is sender or receiver
    const dmChannel = supabase
      .channel(`realtime-dms-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_messages', filter: `or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})` },
        (payload: any) => {
          try {
            // debug log inbound payload
            // eslint-disable-next-line no-console
            console.debug('[Realtime] DM payload received', payload?.event ?? payload?.eventType, payload?.new ? { id: payload.new.id, sender_id: payload.new.sender_id, receiver_id: payload.new.receiver_id, content: String(payload.new.content).slice(0,80) } : payload);
            eventBus.dispatch('realtime:message', { table: 'direct_messages', eventType: payload.eventType ?? payload.event, new: payload.new, old: payload.old });
          } catch (e) {
            console.error('Error dispatching DM realtime event', e);
          }
        }
      )
      .subscribe();
    addChannel(dmChannel);

    // Subscribe to existing chat rooms messages and to new rooms
    (async () => {
      try {
        const rooms = await getChatRooms();
        rooms.forEach(r => {
          const roomChannel = supabase
            .channel(`realtime-room-${r.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${r.id}` }, (payload: any) => {
              try {
                // eslint-disable-next-line no-console
                console.debug('[Realtime] room payload', r.id, payload?.event ?? payload?.eventType, payload?.new ? { id: payload.new.id, room_id: payload.new.room_id, sender_id: payload.new.sender_id, content: String(payload.new.content).slice(0,80) } : payload);
                eventBus.dispatch('realtime:message', { table: 'room_messages', eventType: payload.eventType ?? payload.event, new: payload.new, old: payload.old });
              } catch (e) {
                console.error('Error dispatching room realtime event', e);
              }
            })
            .subscribe();
          addChannel(roomChannel);
        });

        // Also listen for new rooms being created so we can subscribe dynamically
        const roomsWatch = supabase
          .channel(`realtime-chat_rooms-${user.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_rooms' }, (payload: any) => {
            // eslint-disable-next-line no-console
            console.debug('[Realtime] new chat_room created', payload?.new?.id);
            const r = payload.new;
            const roomChannel = supabase
              .channel(`realtime-room-${r.id}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'room_messages', filter: `room_id=eq.${r.id}` }, (p: any) => {
                try {
                  eventBus.dispatch('realtime:message', { table: 'room_messages', eventType: p.eventType ?? p.event, new: p.new, old: p.old });
                } catch (e) {
                  console.error('Error dispatching room realtime event', e);
                }
              })
              .subscribe();
            addChannel(roomChannel);
            eventBus.dispatch('realtime:room_created', { room: r });
          })
          .subscribe();
        addChannel(roomsWatch);
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
    };
  }, [user]);

  return <RealtimeContext.Provider value={{ connected: !!user }}>{children}</RealtimeContext.Provider>;
};

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used inside RealtimeProvider');
  return ctx;
};

export default RealtimeContext;
