// App.tsx or VideoScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';

const SIGNALING_URL = 'ws://10.33.12.68:8765'; // Match robot WebSocket server port
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Optional but recommended
};

interface VideoProps {
  setStream: (stream: any) => void;
  vector: { x: number; y: number; z: number };
  setIsConnected: (isConnected: boolean) => void;
}

export default function VideoScreen({ setStream, vector, setIsConnected }: VideoProps) {

  const pc = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  useEffect(() => {
    const current = JSON.stringify(vector);
    if (dataChannel.current?.readyState === 'open') {
      console.log('Sending vector:', current);
      dataChannel.current.send(current);
    }
    else{
      console.log("Data channel not open");
    }
  }, [vector]);

  useEffect(() => {
    pc.current = new RTCPeerConnection(configuration);

    pc.current.ontrack = (event) => {
      console.log('ontrack', event);
      setStream(event.streams[0]);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate && ws.current) {
        ws.current.send(JSON.stringify({
          ice: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          }
        }));
      }
    };

    pc.current.ondatachannel = (event) => {
      console.log('Data channel received:', event.channel.label);
      dataChannel.current = event.channel;

      dataChannel.current.onmessage = (msg) => {
        console.log('Message from robot:', msg.data);
      };

      dataChannel.current.onopen = () => {
        console.log('Data channel opened');
      };

      dataChannel.current.onclose = () => {
        console.log('Data channel closed');
      };
    };
    // Setup WebSocket connection
    ws.current = new WebSocket(SIGNALING_URL);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      ws.current?.send('HELLO'); // Send initial HELLO
    };

    ws.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      // Handle SDP offer
      if (message.sdp?.type === 'offer') {
        console.log('Received offer');
        const offerDesc = new RTCSessionDescription({
          type: 'offer',
          sdp: message.sdp.sdp,
        });

        await pc.current?.setRemoteDescription(offerDesc);
        const answer = await pc.current?.createAnswer();
        await pc.current?.setLocalDescription(answer);

        // Send the answer back
        ws.current?.send(JSON.stringify({
          sdp: {
            type: 'answer',
            sdp: answer?.sdp,
          },
        }));
      }

      // Handle incoming ICE candidates from robot
      if (message.ice) {
        try {
          await pc.current?.addIceCandidate({
            candidate: message.ice.candidate,
            sdpMLineIndex: message.ice.sdpMLineIndex,
          });
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
      pc.current?.close();
      ws.current = null;
      pc.current = null;
    };
  }, []);

  return null; // This component just handles signaling & WebRTC
}
