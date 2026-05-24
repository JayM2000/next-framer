'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type SSEContextType = {
  isConnected: boolean;
  /** Increments on every vault:update event — watch this in useEffect to react */
  updateSignal: number;
};

const SSEContext = createContext<SSEContextType>({
  isConnected: false,
  updateSignal: 0,
});

export const useSSE = () => useContext(SSEContext);

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [updateSignal, setUpdateSignal] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    function connect() {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      es.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'vault:update') {
            setUpdateSignal((c) => c + 1);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      es.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // EventSource auto-reconnects, but we add a manual fallback
        // in case the browser gives up (e.g., after too many failures)
        es.close();
        reconnectTimeout.current = setTimeout(() => {
          if (isMounted) connect();
        }, 5_000);
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, []);

  return (
    <SSEContext.Provider value={{ isConnected, updateSignal }}>
      {children}
    </SSEContext.Provider>
  );
}
