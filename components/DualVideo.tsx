// App.tsx or VideoScreen.tsx
import { useEffect, useRef, useCallback } from 'react';
import InCallManager from 'react-native-incall-manager';
import { mediaDevices } from 'react-native-webrtc';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  MediaStream
} from 'react-native-webrtc';

 // Match robot WebSocket server port
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Optional but recommended
};

interface VideoProps {
  setStreamLeft: (stream: any) => void;
  setStreamRight: (stream: any) => void;
  vector: { x: number; y: number; z: number };
  setIsConnected: (isConnected: boolean) => void;
  setLocalStream: (stream: any) => void;
  call: boolean;
  signalingUrl: string;
}

export default function VideoScreen({ setStreamLeft, setStreamRight, vector, setIsConnected, setLocalStream, call, signalingUrl }: VideoProps) {
  const pc = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const streamsAdded = useRef(0)
  
  useEffect(() => {
      InCallManager.start({ media: 'audio' });
      InCallManager.setSpeakerphoneOn(true);
   
  
    return () => {
      InCallManager.stop();
    };
  }, [call]);
  // Shared function to get user media
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      });
      stream.getTracks().forEach(track => {
        console.log("adding track", track.getSettings());
        pc.current?.addTrack(track, stream);
      });
      setLocalStream(stream);
    } catch (e) {
      console.error('getUserMedia error:', e);
    }
  }, [setLocalStream]);

  // Shared function to set up peer connection
  const setupPeerConnection = useCallback(async (withMedia: boolean = false) => {
    pc.current = new RTCPeerConnection(configuration);

    // If we need media, set it up immediately after PC creation
    if (withMedia) {
      await startLocalStream();
    }

    // Set up common event handlers
    (pc.current as any).ontrack = (event: any) => {
      console.log('ontrack', event);
    
      // Some tracks may be audio; filter for video
      const videoTrack = event.track;
      if (videoTrack.kind === 'video') {
        if (event.track.kind !== 'video') return;

        // First time left stream arrives
        if (streamsAdded.current === 0) {

          const newStream = new MediaStream();
          console.log("adding track to left stream")
          newStream.addTrack(event.track);
          console.log("added track to left stream")
          // trigger rerender
          setStreamLeft(newStream);
          streamsAdded.current++;
        }
        // Then second camera goes to the right
        else {
          const newStream = new MediaStream();
          console.log("adding track to right stream")
          newStream.addTrack(event.track);
          console.log("added track to right stream")
          // trigger rerender
          setStreamRight(newStream);
        }
        
      }
    };
    

    (pc.current as any).onicecandidate = (event: any) => {
      if (event.candidate && ws.current) {
        ws.current.send(JSON.stringify({
          ice: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          }
        }));
      }
    };

    (pc.current as any).ondatachannel = (event: any) => {
      console.log('Data channel received:', event.channel.label);
      dataChannel.current = event.channel;

      if (dataChannel.current) {
        dataChannel.current.onmessage = (msg: any) => {
          console.log('Message from robot:', msg.data);
        };

        dataChannel.current.onopen = () => {
          console.log('Data channel opened');
        };

        dataChannel.current.onclose = () => {
          console.log('Data channel closed');
        };
      }
    };
  }, [setStreamLeft, startLocalStream]);

  // Shared function to set up WebSocket
  const setupWebSocket = useCallback(() => {
    console.log("signalingUrl", "ws://" + signalingUrl + ":8765");
    ws.current = new WebSocket("ws://" + signalingUrl + ":8765");

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      ws.current?.send('HELLO');
    };

    ws.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("message", message);
      if (message.sdp?.type === 'offer') {
        console.log('Received offer');
        const offerDesc = new RTCSessionDescription({
          type: 'offer',
          sdp: message.sdp.sdp,
        });

        await pc.current?.setRemoteDescription(offerDesc);
        const answer = await pc.current?.createAnswer();
        await pc.current?.setLocalDescription(answer);

        ws.current?.send(JSON.stringify({
          sdp: {
            type: 'answer',
            sdp: answer?.sdp,
          },
        }));
      }

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

    ws.current.onerror = () => {
      setIsConnected(false);
    };

    ws.current.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
    };
  }, [setIsConnected]);

  // Shared cleanup function
  const cleanup = useCallback(() => {
    console.log("Cleaning up WebRTC connection");
    if(dataChannel.current) {
      dataChannel.current.close();
    }
    pc.current?.getSenders().forEach(sender => sender.track?.stop());
    pc.current?.close();
    dataChannel.current = null;
    pc.current = null;
  }, []);


  useEffect(() => {
  
    return () => {
      cleanup();
    }
  }, [])

  const renegotiate = useCallback(async() => {
    if(pc.current) {
      cleanup();
    }
    await setupPeerConnection(call);
    if(!ws.current) {
      console.log("Setting up WebSocket");
      setupWebSocket();
    }
    else{
      console.log("Sending HELLO");
      ws.current?.send('HELLO');
    }

  }, [call])

  useEffect(() => {
    renegotiate();
  }, [call]);

  // Handle vector updates
  useEffect(() => {
    const current = JSON.stringify(vector);
    if (dataChannel.current?.readyState === 'open') {
      // console.log('Sending vector:', current);
      dataChannel.current.send(current);
    }
    else {
      console.log("Data channel not open");
    }
  }, [vector]);

  return null; // This component just handles signaling & WebRTC
}
