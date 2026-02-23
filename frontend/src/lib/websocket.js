import { useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const useWebSocket = (projectId, token, onMessage) => {
  const wsRef = useRef(null);
  const pingRef = useRef(null);

  const connect = useCallback(() => {
    if (!projectId || !token) return;

    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/ws/${projectId}?token=${token}`);

    ws.onopen = () => {
      // Keepalive ping every 30s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      try {
        const message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (e) {
        // ignore non-json messages
      }
    };

    ws.onclose = () => {
      if (pingRef.current) clearInterval(pingRef.current);
      // Reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [projectId, token, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close();
      }
    };
  }, [connect]);

  return wsRef;
};
