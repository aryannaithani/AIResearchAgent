import os

from flask import Flask, render_template, request, jsonify, session
from datetime import datetime
from researcher import AIResearch
import threading
import uuid

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

user_sessions = {}

def get_session_id():
    if "sid" not in session:
        session["sid"] = str(uuid.uuid4())
    return session["sid"]

def get_user_data():
    sid = get_session_id()
    if sid not in user_sessions:
        user_sessions[sid] = {
            "messages": [],
            "status": {
                "active": False,
                "message": ""
            }
        }
    return user_sessions[sid]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/send_message', methods=['POST'])
def send_message():
    user_data = get_user_data()
    data = request.get_json()
    message_text = data.get("message", "").strip()

    if message_text:
        user_message = {
            "id": len(user_data["messages"]),
            "text": message_text,
            "sender": "user",
            "timestamp": datetime.now().strftime("%H:%M")
        }
        user_data["messages"].append(user_message)

        def process_ai_response(sid, query):
            user_data = user_sessions[sid]
            user_data["status"]["active"] = True
            user_data["status"]["message"] = "Thinking..."

            bot_response = AIResearch(query)

            bot_message = {
                "id": len(user_data["messages"]),
                "text": bot_response,
                "sender": "bot",
                "timestamp": datetime.now().strftime("%H:%M")
            }
            user_data["messages"].append(bot_message)

            user_data["status"]["active"] = False
            user_data["status"]["message"] = ""

        sid = get_session_id()
        thread = threading.Thread(target=process_ai_response, args=(sid, message_text))
        thread.start()

        return jsonify({"status": "success", "message_id": user_message["id"]})

    return jsonify({"status": "error", "message": "Empty message"})

@app.route('/get_messages')
def get_messages():
    user_data = get_user_data()
    return jsonify(user_data["messages"])


@app.route('/get_status')
def get_status():
    user_data = get_user_data()
    return jsonify(user_data["status"])


if __name__ == '__main__':
    app.run(debug=True, threaded=True)