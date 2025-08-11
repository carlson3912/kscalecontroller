import React, { useEffect, useRef } from 'react';
import dgram from 'react-native-udp';

interface SimUDPProps {
  payload?: any;
  vector?: any;
  simStop?: any;
  setPolicy?: any;
}

export default function SimUDP({ payload, vector, simStop }: SimUDPProps) {
  const socketRef = useRef<any>(null);
  const isSocketReady = useRef(false);
  
  const HOST = '10.33.12.134'; // Your Mac's IP
  const PORT = 8765;
  
  useEffect(() => {
    // Create UDP socket
    const socket = dgram.createSocket({ type: 'udp4' });
    socketRef.current = socket;
    isSocketReady.current = false;
    
    // Bind to local address
    socket.bind(0, '0.0.0.0');
    
    socket.on('listening', () => {
      const address = socket.address();
      console.log(`UDP client listening on ${address.address}:${address.port}`);
      isSocketReady.current = true;
    });
    
    socket.on('message', (msg: Buffer, rinfo: any) => {
      console.log(`Received UDP message from ${rinfo.address}:${rinfo.port}: ${msg.toString()}`);
    });
    
    socket.on('error', (err: Error) => {
      console.error('UDP socket error:', err);
      isSocketReady.current = false;
    });
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        isSocketReady.current = false;
      }
    };
  }, []);
  
  // Send data when payload or vector changes
  useEffect(() => {
    if (socketRef.current && isSocketReady.current) {
      // Create JSON object with the required structure
      const data = JSON.stringify({
        Xvel: vector.y,
        Yvel: -vector.x,
        YawRate: -vector.z,
        motion: payload || null
      });
      
      socketRef.current.send(
        data,
        undefined,
        undefined,
        PORT,
        HOST,
        (err: Error | null) => {
          if (err) {
            console.error('UDP send error:', err);
          } else {
            console.log(`Sent UDP data to ${HOST}:${PORT}: ${data}`);
          }
        }
      );
    }
  }, [payload, vector]);
  useEffect(() => {
    if (socketRef.current && isSocketReady.current) {
      if(simStop > 0){
        const data = JSON.stringify({
          vector: [0, 0, 0],
          motion: null,
          reset: true
        });
        
        socketRef.current.send(
          data,
          undefined,
          undefined,
          PORT,
          HOST,
          (err: Error | null) => {
            if (err) {
              console.error('UDP send error:', err);
            } else {
              console.log(`Sent UDP data to ${HOST}:${PORT}: ${data}`);
            }
          }
        );
      }
    }
  }, [simStop]);
  
  return null;
}