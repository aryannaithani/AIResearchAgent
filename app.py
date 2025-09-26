from flask import Flask, render_template, request, jsonify
from datetime import datetime
from main import AIResearch
import threading
import time
import random

app = Flask(__name__)

messages = []
current_status = {"message": "", "active": False}

# Dynamic status messages for the AI research process
status_messages = [
    "Scraping webpages...",
    "Looking up news articles...",
    "Going through research papers...",
    "Analyzing data sources...",
    "Cross-referencing information...",
    "Fact-checking details...",
    "Compiling research findings...",
    "Organizing information...",
    "Generating comprehensive response...",
    "Finalizing research report...",
    "Compiling a clean PDF..."
]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/send_message', methods=['POST'])
def send_message():
    data = request.get_json()
    message_text = data.get('message', '').strip()

    if message_text:
        # Add user message immediately
        user_message = {
            'id': len(messages),
            'text': message_text,
            'sender': 'user',
            'timestamp': datetime.now().strftime('%H:%M')
        }
        messages.append(user_message)

        # Start the AI research process in a separate thread
        def process_ai_response():
            current_status["active"] = True

            # Simulate research process with status updates
            for i in range(3):  # Show 3 different status messages
                current_status["message"] = random.choice(status_messages)
                time.sleep(random.uniform(1, 2.5))  # Random delay between 1-2.5 seconds

            # Get the actual AI response
            current_status["message"] = "Finalizing response..."
            bot_response = AIResearch(message_text)

            # Add bot message
            bot_message = {
                'id': len(messages),
                'text': bot_response,
                'sender': 'bot',
                'timestamp': datetime.now().strftime('%H:%M')
            }
            messages.append(bot_message)

            current_status["active"] = False
            current_status["message"] = ""

        thread = threading.Thread(target=process_ai_response)
        thread.daemon = True
        thread.start()

        return jsonify({'status': 'success', 'message_id': user_message['id']})

    return jsonify({'status': 'error', 'message': 'Empty message'})


@app.route('/get_messages')
def get_messages():
    return jsonify(messages)


@app.route('/get_status')
def get_status():
    return jsonify(current_status)


if __name__ == '__main__':
    app.run(debug=True, threaded=True)