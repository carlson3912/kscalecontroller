import asyncio
import json
import ssl
import websockets

import gi
gi.require_version('Gst', '1.0')
gi.require_version('GstWebRTC', '1.0')
gi.require_version('GstSdp', '1.0')
from gi.repository import Gst, GstWebRTC, GstSdp, GLib

Gst.init(None)

PIPELINE_DESC = '''
webrtcbin name=sendrecv bundle-policy=max-bundle stun-server=stun://stun.l.google.com:19302
 libcamerasrc ! capsfilter caps=video/x-raw,format=YUY2,width=640,height=480,framerate=30/1 ! videoconvert ! queue ! vp8enc name=vp8enc0 deadline=1 ! rtpvp8pay !
 queue ! application/x-rtp,media=video,encoding-name=VP8,payload=97 ! sendrecv.
 alsasrc device=hw:0,0 ! audioconvert ! audioresample ! queue ! opusenc ! rtpopuspay !
 queue ! application/x-rtp,media=audio,encoding-name=OPUS,payload=96 ! sendrecv.
'''
async def glib_main_loop_iteration():
    while True:
        # Process all pending GLib events without blocking
        while GLib.main_context_default().iteration(False):
            pass
        # Yield control back to asyncio, adjust delay as needed
        await asyncio.sleep(0.01)

class WebRTCServer:
    def __init__(self, loop):
        self.pipe = None
        self.webrtc = None
        self.ws = None  # active client connection
        self.loop = loop

    def start_pipeline(self):
        print("Starting pipeline")
        self.pipe = Gst.parse_launch(PIPELINE_DESC)
        bus = self.pipe.get_bus()
        bus.add_signal_watch()
        bus.connect("message", self.on_bus_message)
        self.vp8enc = self.pipe.get_by_name("vp8enc0")
        self.vp8enc.set_property("keyframe-max-dist", 30)
        self.webrtc = self.pipe.get_by_name("sendrecv")
        self.webrtc.set_property("latency", 200) 
        self.webrtc.connect("on-negotiation-needed", self.on_negotiation_needed)
        self.webrtc.connect("on-ice-candidate", self.send_ice_candidate_message)
        self.webrtc.connect("on-data-channel", self.on_data_channel)
        self.webrtc.connect("pad-added", self.on_incoming_stream) 
        self.pipe.set_state(Gst.State.PLAYING)

    def on_bus_message(self, bus, message):
        """Handle messages from the GStreamer bus, specifically for latency."""
        t = message.type
        if t == Gst.MessageType.LATENCY:
            print("Received a LATENCY message. Recalculating latency.")
            self.pipe.recalculate_latency()

        return GLib.SOURCE_CONTINUE
    def close_pipeline(self):
        if self.pipe:
            self.pipe.set_state(Gst.State.NULL)
            self.pipe = None
            self.webrtc = None

    def on_message_string(self, channel, message):
        print("Received:", message)

    def on_data_channel(self, webrtc, channel):
        print("New data channel:", channel.props.label)
        channel.connect("on-message-string", self.on_message_string)

    def on_incoming_decodebin_stream(self, _, pad):
        if not pad.has_current_caps():
            print(pad, 'has no caps, ignoring')
            return

        caps = pad.get_current_caps()
        print("!!!!")
        print(caps.get_structure(0))
        s = caps.get_structure(0)
        name = s.get_name()
        if name.startswith('video'):
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('videoconvert')
            scale = Gst.ElementFactory.make('videoscale')
            capsfilter = Gst.ElementFactory.make('capsfilter')
            sink = Gst.ElementFactory.make('glimagesink')

            # Set the capsfilter to 1920x1080
            capsfilter.set_property('caps', Gst.Caps.from_string('video/x-raw,width=1920,height=1080'))

            # Add all to pipeline
            self.pipe.add(q)
            self.pipe.add(conv)
            self.pipe.add(scale)
            self.pipe.add(capsfilter)
            self.pipe.add(sink)

            # Sync states for new elements
            q.sync_state_with_parent()
            conv.sync_state_with_parent()
            scale.sync_state_with_parent()
            capsfilter.sync_state_with_parent()
            sink.sync_state_with_parent()

            # Link elements: pad -> q -> conv -> scale -> capsfilter -> sink
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(scale)
            scale.link(capsfilter)
            capsfilter.link(sink)
        elif name.startswith('audio'):
            # unchanged
            q = Gst.ElementFactory.make('queue')
            conv = Gst.ElementFactory.make('audioconvert')
            resample = Gst.ElementFactory.make('audioresample')
            sink = Gst.ElementFactory.make('alsasink')
            sink.set_property('device', 'plughw:0,0')
            self.pipe.add(q)
            self.pipe.add(conv)
            self.pipe.add(resample)
            self.pipe.add(sink)
            q.sync_state_with_parent()
            conv.sync_state_with_parent()
            resample.sync_state_with_parent()
            sink.sync_state_with_parent()
            pad.link(q.get_static_pad('sink'))
            q.link(conv)
            conv.link(resample)
            resample.link(sink)

    def on_incoming_stream(self, _, pad):
        if pad.direction != Gst.PadDirection.SRC:
            return
        decodebin = Gst.ElementFactory.make('decodebin')
        decodebin.connect('pad-added', self.on_incoming_decodebin_stream)
        self.pipe.add(decodebin)
        decodebin.sync_state_with_parent()
        self.webrtc.link(decodebin)

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
        print(message)
        if(message == "HELLO"):
            if(self.pipe):
                self.close_pipeline()
           
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
    asyncio.create_task(glib_main_loop_iteration())
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print("WebSocket server running on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
