import asyncio
import json
import ssl
import websockets

import gi
gi.require_version('Gst', '1.0')
gi.require_version('GstWebRTC', '1.0')
gi.require_version('GstSdp', '1.0')
from gi.repository import Gst, GstWebRTC, GstSdp

Gst.init(None)

PIPELINE_DESC = (
        "libcamerasrc ! "
        "capsfilter caps=video/x-raw,format=YUY2,width=640,height=480,framerate=30/1 ! "
        "videoconvert ! "
        "vp8enc deadline=1 ! "
        "rtpvp8pay ! "
        "webrtcbin name=sendonly bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302"
    )

class WebRTCServer:
    def __init__(self, loop):
        self.pipe = None
        self.webrtc = None
        self.ws = None  # active client connection
        self.loop = loop

    def start_pipeline(self):
        self.pipe = Gst.parse_launch(PIPELINE_DESC)
        self.webrtc = self.pipe.get_by_name("sendonly")
        self.webrtc.connect("on-negotiation-needed", self.on_negotiation_needed)
        self.webrtc.connect("on-ice-candidate", self.send_ice_candidate_message)
        self.webrtc.connect("on-data-channel", self.on_data_channel)
        self.webrtc.connect("pad-added", self.on_incoming_stream) 
        self.pipe.set_state(Gst.State.PLAYING)

    def on_message_string(self, channel, message):
        print("Received:", message)

    def on_data_channel(self, webrtc, channel):
        print("New data channel:", channel.props.label)
        channel.connect("on-message-string", self.on_message_string)

    def on_incoming_stream(self, webrtc, pad):  
        print(f"New pad added: {pad.get_name()}")
        if pad.get_direction() != Gst.PadDirection.SRC:
            return

        caps = pad.get_current_caps()
        structure = caps.get_structure(0)
        media_type = structure.get_name()
        print(f"Media type of incoming pad: {media_type}")

        if media_type.startswith("application/x-rtp"):
            # Create depayloader, decoder, and sink elements dynamically

            # For video (e.g. VP8)
            if structure.get_value("media") == "video":
                depay = Gst.ElementFactory.make("rtpvp8depay", None)
                decoder = Gst.ElementFactory.make("vp8dec", None)
                sink = Gst.ElementFactory.make("autovideosink", None)  # Use kmssink on Pi for HDMI output

                if not depay or not decoder or not sink:
                    print("Failed to create depay, decoder or sink")
                    return

                # Add to pipeline
                self.pipe.add(depay)
                self.pipe.add(decoder)
                self.pipe.add(sink)

                depay.sync_state_with_parent()
                decoder.sync_state_with_parent()
                sink.sync_state_with_parent()

                # Link elements
                depay.link(decoder)
                decoder.link(sink)

                # Link webrtc src pad to depayloader sink pad
                pad.link(depay.get_static_pad("sink"))

                print("Incoming video stream linked and rendering started.")

    def on_negotiation_needed(self, element):
        print("Negotiation needed")
        self.data_channel = self.webrtc.emit("create-data-channel", "chat", None)
        if self.data_channel:
            print("Data channel created on robot")
            self.data_channel.connect("on-message-string", self.on_message_string)
        promise = Gst.Promise.new_with_change_func(self.on_offer_created, element, None)
        self.webrtc.emit("create-offer", None, promise)

    def on_offer_created(self, promise, _, __):
        print("on offer created")
        promise.wait()
        reply = promise.get_reply()
        offer = reply.get_value("offer")
        print("offer:", offer)
        self.webrtc.emit("set-local-description", offer, Gst.Promise.new())
        text = offer.sdp.as_text()
        print("offertext:", text)
        message = json.dumps({'sdp': {'type': 'offer', 'sdp': text}})
        asyncio.run_coroutine_threadsafe(self.ws.send(message), self.loop)

    def send_ice_candidate_message(self, _, mlineindex, candidate):
        message = json.dumps({
            'ice': {'candidate': candidate, 'sdpMLineIndex': mlineindex}
        })
        asyncio.run_coroutine_threadsafe(self.ws.send(message), self.loop)

    def handle_client_message(self, message):
        print("Handling client message")
        if(message == "HELLO"):
            self.start_pipeline()
            return
        msg = json.loads(message)
        if 'sdp' in msg and msg['sdp']['type'] == 'answer':
            sdp = msg['sdp']['sdp']
            res, sdpmsg = GstSdp.SDPMessage.new()
            GstSdp.sdp_message_parse_buffer(sdp.encode(), sdpmsg)
            answer = GstWebRTC.WebRTCSessionDescription.new(GstWebRTC.WebRTCSDPType.ANSWER, sdpmsg)
            self.webrtc.emit("set-remote-description", answer, Gst.Promise.new())
        elif 'ice' in msg:
            ice = msg['ice']
            self.webrtc.emit("add-ice-candidate", ice['sdpMLineIndex'], ice['candidate'])

    async def websocket_handler(self, ws):
        print("Client connected")
        self.ws = ws
        async for msg in ws:
            self.handle_client_message(msg)
        print("Client disconnected")
        self.pipe.set_state(Gst.State.NULL)

async def main():
    loop = asyncio.get_running_loop()
    server = WebRTCServer(loop)
    async def handler(websocket):
        await server.websocket_handler(websocket)

    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("WebSocket server running on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
