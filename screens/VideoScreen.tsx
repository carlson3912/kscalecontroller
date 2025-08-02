import {
    RTCPeerConnection,
    RTCView,
    mediaDevices,
  } from 'react-native-webrtc';
  import React, { useEffect, useRef, useState } from 'react';
  import { View, Button } from 'react-native';
  
  const SIGNALING_SERVER = 'ws://10.33.12.44:8765';
  
  const App = () => {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
    const startConnection = async () => {
      console.log('[Client] Connecting to signaling server...');
      const ws = new WebSocket(SIGNALING_SERVER);
      wsRef.current = ws;
  
      ws.onopen = async () => {
        console.log('[Client] WebSocket connected.');
  
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        }) as any;
        pcRef.current = pc;
  
        const remote = new MediaStream();
        setRemoteStream(remote);
  
        pc.ontrack = (event: any) => {
          console.log('[Client] Received remote track:', event.track.kind);
          remote.addTrack(event.track);
        };
  
        pc.onicecandidate = (event: any) => {
          if (event.candidate) {
            console.log('[Client] Sending ICE candidate...');
            ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
          }
        };
  
        // Ask server to send offer
        console.log('[Client] Sending request-offer');
        ws.send(JSON.stringify({ type: 'request-offer' }));
      };
  
      ws.onmessage = async (message) => {
        const data = JSON.parse(message.data);
        console.log('[Client] Received message:', data);
  
        if (data.type === 'offer') {
          console.log('[Client] Received offer');
          const pc = pcRef.current;
          if (!pc) return;
  
          await pc.setRemoteDescription({
            type: 'offer',
            sdp: data.sdp,
          });
  
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
  
          console.log('[Client] Sending answer');
          ws.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
        }
  
        if (data.type === 'candidate') {
          const pc = pcRef.current;
          if (!pc) return;
  
          console.log('[Client] Adding received ICE candidate');
          await pc.addIceCandidate(data.candidate);
        }
      };
  
      ws.onerror = (err) => {
        console.error('[Client] WebSocket error:', err);
      };
  
      ws.onclose = () => {
        console.log('[Client] WebSocket closed.');
      };
    };
  
    return (
      <View style={{ flex: 1 }}>
        {remoteStream && (
          <RTCView
            objectFit="cover"
            //@ts-ignore
            streamURL={remoteStream.toURL()}
            style={{ flex: 1 }}
          />
        )}
        <Button title="Connect to Robot" onPress={startConnection} />
      </View>
    );
  };
  
  export default App;
  