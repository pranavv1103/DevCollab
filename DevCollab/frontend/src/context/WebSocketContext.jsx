import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthContext } from './AuthContext';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [stompClient, setStompClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      const socket = new SockJS('http://localhost:9090/ws');
      const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log("Connected to WebSocket");
          setConnected(true);
        },
        onDisconnect: () => {
          console.log("Disconnected from WebSocket");
          setConnected(false);
        },
        onStompError: (frame) => {
          console.error("Broker reported error: " + frame.headers['message']);
        }
      });

      client.activate();
      setStompClient(client);

      return () => {
        client.deactivate();
      };
    }
  }, [token]);

  return (
    <WebSocketContext.Provider value={{ stompClient, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
