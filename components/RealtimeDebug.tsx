import React from 'react';
import { useRealtime } from '../contexts/RealtimeContext';

const RealtimeDebug: React.FC = () => {
  const ctx = useRealtime();
  if (!ctx) return null;

  const { connected, channelStatuses, lastEvent } = ctx as any;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 60 }}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-80 text-xs p-3">
        <div className="flex items-center justify-between mb-2">
          <strong className="text-sm">Realtime Debug</strong>
          <span className={`px-2 py-0.5 rounded ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="max-h-40 overflow-auto">
          <div className="mb-2">
            <div className="font-semibold">Channels</div>
            {Object.keys(channelStatuses || {}).length === 0 ? (
              <div className="text-gray-500">No channels</div>
            ) : (
              <ul className="list-none p-0 m-0">
                {Object.entries(channelStatuses).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="truncate pr-2">{k}</span>
                    <span className="font-mono text-xs">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="font-semibold">Last Event</div>
            {lastEvent ? (
              <pre className="text-[10px] max-h-48 overflow-auto bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1">{JSON.stringify(lastEvent, null, 2)}</pre>
            ) : (
              <div className="text-gray-500">No events yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDebug;
