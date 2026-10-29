"""Run the app on this Mac for testing: http://localhost:8765

Like `python3 -m http.server 8765`, but it tells the browser never to reuse an
old copy of a file. Without that, Chrome sometimes shows an older version of a
file you just changed, until you force a reload.

Run it from the project folder:
    python3 tools/serve.py
Stop it with Ctrl+C.
"""

import http.server
import os
from pathlib import Path

PORT = 8765


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # "Always fetch this again": no saved copies while developing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(Path(__file__).resolve().parent.parent)  # serve the project folder
    print(f"Serving on http://localhost:{PORT} (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
