"""Local web server backing the browser-based parking slot editor."""

import json
import os
import threading
import webbrowser

from flask import Flask, Response, jsonify, request, send_file

from src.logger import logger
from src.slots import save_slots

EDITOR_HTML = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "web", "slot_editor.html",
)


def run_editor(frame_path: str, initial_slots: list, slots_path: str,
               host: str = "127.0.0.1", port: int = 5050) -> list:
    """Serve the slot editor and block until the browser posts the slots back.

    Args:
        frame_path (str): Reference image the slots are drawn over.
        initial_slots (list): Slots to preload into the editor.
        slots_path (str): Destination the edited slots are written to.
        host (str): Interface to bind. Loopback by default.
        port (int): Port to bind.

    Returns:
        list: The slots as saved from the browser.
    """
    app = Flask(__name__, static_folder=None)
    state = {"slots": list(initial_slots)}
    saved = threading.Event()

    with open(EDITOR_HTML, encoding="utf-8") as f:
        html = f.read().replace("__INITIAL_SLOTS__", json.dumps(initial_slots))

    @app.route("/")
    def index():
        return Response(html, mimetype="text/html")

    @app.route("/frame")
    def frame():
        return send_file(os.path.abspath(frame_path), mimetype="image/jpeg")

    @app.route("/api/slots", methods=["GET"])
    def get_slots():
        return jsonify(state["slots"])

    @app.route("/api/slots", methods=["POST"])
    def post_slots():
        state["slots"] = request.get_json()
        save_slots(state["slots"], slots_path)
        logger.info(f"Saved {len(state['slots'])} slot(s) to {slots_path}")
        saved.set()
        return jsonify({"status": "ok", "count": len(state["slots"])})

    url = f"http://{host}:{port}"

    def serve():
        import logging
        logging.getLogger("werkzeug").setLevel(logging.ERROR)
        app.run(host=host, port=port, debug=False, use_reloader=False)

    threading.Thread(target=serve, daemon=True).start()
    threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    logger.info(f"Slot editor → {url}  (save in the browser to continue)")

    saved.wait()
    return state["slots"]
