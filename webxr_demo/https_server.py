import http.server
import ssl
import os

def get_ssl_context(certfile, keyfile):
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    context.load_cert_chain(certfile, keyfile)
    context.set_ciphers("@SECLEVEL=1:ALL")
    return context

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Let SimpleHTTPRequestHandler handle all GET requests for static files
        return super().do_GET()
    
    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        print("POST data received:", post_data.decode("utf-8"))
        
        # Send a simple response
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'POST received successfully')

    def log_message(self, format, *args):
        # Custom logging to show what files are being served
        print(f"[{self.address_string()}] {format % args}")

# Auto-generate SSL certificate if it doesn't exist
def generate_cert_if_needed():
    if not os.path.exists('cert.pem') or not os.path.exists('key.pem'):
        print("Generating self-signed SSL certificate...")
        os.system('openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=LocalDev/CN=localhost"')
        print("Certificate generated successfully!")

# Generate certificate if needed
generate_cert_if_needed()

# Server configuration
server_address = ("127.0.0.1", 5000)
print(f"Starting HTTPS server on https://{server_address[0]}:{server_address[1]}")
print(f"Serving files from: {os.getcwd()}")

# Create and configure server
httpd = http.server.HTTPServer(server_address, MyHandler)
context = get_ssl_context("cert.pem", "key.pem")
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("Server ready! Visit https://127.0.0.1:5000")
print("Press Ctrl+C to stop the server")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    httpd.server_close()