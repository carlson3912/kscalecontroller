import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
} from 'react-native-webrtc';

const SERVER_WS_URL = 'ws://10.33.12.44:8765';

const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const App = () => {
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    startConnection();

    return () => {
      pc.current?.close();
      ws.current?.close();
    };
  }, []);

  const startConnection = async () => {
    ws.current = new WebSocket(SERVER_WS_URL);

    ws.current.onopen = async () => {
        if(ws.current?.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected');
            return;
        }
      console.log('WebSocket connected');

      const object = new RTCPeerConnection(RTC_CONFIGURATION) as any
      pc.current = object;
      object.ontrack = (event: any) => {
        console.log('Received remote stream');
        setRemoteStream(event.streams[0]);
      };

      object.onicecandidate = (event: any) => {
        if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate,
          }));
        }
      };
      console.log('createOffer');
      // We're only receiving audio/video
      const offer = await object.createOffer({
        mandatory: {
          OfferToReceiveAudio: true,
          OfferToReceiveVideo: true,
        }
      });
      var rsd = new RTCSessionDescription(offer);
      await object.setLocalDescription(rsd);
      console.log('setLocalDescription', ws.current?.readyState);
      ws.current!.send(JSON.stringify({
        type: 'webrtc_offer',
        sdp: offer.sdp,
      }));
    };

    ws.current.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type === 'webrtc_answer') {
        const answer = new RTCSessionDescription({ type: 'answer', sdp: data.sdp });
        await pc.current?.setRemoteDescription(answer);
      }

      if (data.type === 'ice_candidate') {
        const candidate = new RTCIceCandidate(data.candidate);
        await pc.current?.addIceCandidate(candidate);
      }
    };

    ws.current.onerror = (err) => console.error('WebSocket error:', err);
    ws.current.onclose = () => console.log('WebSocket closed');
  };

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
      ) : (
        <Text style={styles.text}>Waiting for stream...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  text: { color: '#fff' },
});

export default App;
