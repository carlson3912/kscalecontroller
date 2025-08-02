import asyncio
import json
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.contrib.media import MediaPlayer
import os

# Path to a local video file or use webcam device string like "/dev/video0" or "default"
VIDEO_SOURCE = os.path.expanduser('~/videos/BigBuckBunny_320x180.mp4') # or "/path/to/video.mp4" or "/dev/video0"

pcs = set()

async def handle_offer(websocket):
    print("Client connected")
    pc = RTCPeerConnection()
    pcs.add(pc)

    player = None
    # Real video or webcam
    player = MediaPlayer(VIDEO_SOURCE)
    video_track = player.video

    # Add video track to the peer connection
    if video_track:
        pc.addTrack(video_track)
        print("Added video track to the peer connection")
    async def send_json(obj):
        await websocket.send(json.dumps(obj))
        print("Sent JSON to client")


    try:
        async for message in websocket:
            print("Received message from client")
            data = json.loads(message)

            if data["type"] == "webrtc_offer":
                print("Received offer")
                offer = RTCSessionDescription(sdp=data["sdp"]["sdp"], type=data["sdp"]["type"])
                await pc.setRemoteDescription(offer)

                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                # Send answer back
                await send_json({
                    "type": "webrtc_answer",
                    "sdp": {
                        "type": pc.localDescription.type,
                        "sdp": pc.localDescription.sdp,
                    }
                })

            elif data["type"] == "ice_candidate":
                candidate = data["candidate"]
                if candidate is not None:
                    await pc.addIceCandidate(candidate)

    except websockets.ConnectionClosed:
        print("Client disconnected")

    finally:
        await pc.close()
        pcs.discard(pc)


async def main():
    async with websockets.serve(handle_offer, "0.0.0.0", 8765):
        print("WebSocket signaling server started on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
