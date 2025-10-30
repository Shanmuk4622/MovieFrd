// Lightweight event bus based on DOM EventTarget for inter-component realtime events
const bus = new EventTarget();

export const eventBus = {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => bus.addEventListener(type, listener),
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => bus.removeEventListener(type, listener),
  dispatch: (type: string, detail?: any) => {
    try {
      // lightweight logging for debugging realtime flow
      // keep logs minimal to avoid noise in production
      // eslint-disable-next-line no-console
      console.debug('[eventBus] dispatch', type, detail ? { ...detail, new: detail.new ? { ...detail.new, content: String(detail.new.content).slice(0, 80) } : undefined } : undefined);
    } catch (e) {
      // ignore logging errors
    }
    return bus.dispatchEvent(new CustomEvent(type, { detail }));
  },
};

export default eventBus;
