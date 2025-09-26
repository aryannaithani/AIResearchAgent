from flask import Flask, render_template, request, jsonify, session
import uuid
import threading, time, random
from datetime import datetime
from researcher import AIResearch

app = Flask(__name__)
app.secret_key = "SECRET_KEY"  # required for Flask sessions

# store all user sessions here
user_sessions = {}

status_messages = [
    "Scraping webpages...", "Looking up news articles...",
    "Going through research papers...", "Analyzing data sources...",
    "Cross-referencing information...", "Fact-checking details...",
    "Compiling research findings...", "Organizing information...",
    "Generating comprehensive response...", "Finalizing research report...",
    "Compiling a clean PDF..."
]

def get_session_id():
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
        user_sessions[session["session_id"]] = {"messages": [], "status": {"message": "", "active": False}}
    return session["session_id"]

@app.route('/')
def index():
    get_session_id()
    return render_template("index.html")

@app.route('/send_message', methods=['POST'])
def send_message():
    sid = get_session_id()
    data = request.get_json()
    message_text = data.get("message", "").strip()

    if message_text:
        user_data = user_sessions[sid]

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

            for i in range(3):
                user_data["status"]["message"] = random.choice(status_messages)
                time.sleep(random.uniform(1, 2.5))

            user_data["status"]["message"] = "Finalizing response..."
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

        thread = threading.Thread(target=process_ai_response, args=(sid, message_text))
        thread.start()

        return jsonify({"status": "success", "message_id": user_message["id"]})

    return jsonify({"status": "error", "message": "Empty message"})

@app.route('/get_messages')
def get_messages():
    sid = get_session_id()
    return jsonify(user_sessions[sid]["messages"])

@app.route('/get_status')
def get_status():
    sid = get_session_id()
    return jsonify(user_sessions[sid]["status"])

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
