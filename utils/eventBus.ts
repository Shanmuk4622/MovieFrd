// Lightweight typed event bus built on the DOM EventTarget, used to fan out
// realtime database events from RealtimeContext to interested components.

export interface RealtimeMessageEvent {
  table: 'direct_messages' | 'room_messages';
  eventType: string;
  new: any;
  old: any;
}

export interface RoomCreatedEvent {
  room: any;
}

interface EventMap {
  'realtime:message': RealtimeMessageEvent;
  'realtime:room_created': RoomCreatedEvent;
}

const bus = new EventTarget();

export const eventBus = {
  addEventListener: (type: keyof EventMap, listener: EventListener) =>
    bus.addEventListener(type, listener),
  removeEventListener: (type: keyof EventMap, listener: EventListener) =>
    bus.removeEventListener(type, listener),
  dispatch: <K extends keyof EventMap>(type: K, detail?: EventMap[K]) =>
    bus.dispatchEvent(new CustomEvent(type, { detail })),
};

export default eventBus;
