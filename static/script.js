const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const aiStatus = document.getElementById('aiStatus');
        const statusText = document.getElementById('statusText');
        const typingIndicator = document.getElementById('typingIndicator');

        // Set initial timestamp
        document.getElementById('initial-time').textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        let lastMessageCount = 0;
        let isWaitingForResponse = false;

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';

            // Add pulse effect when typing
            if (this.value.trim()) {
                sendButton.classList.add('pulse');
            } else {
                sendButton.classList.remove('pulse');
            }
        });

        // Send message on Enter (but allow Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendButton.addEventListener('click', sendMessage);

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message || isWaitingForResponse) return;

            // Immediately add user message to chat
            addUserMessageToChat(message, new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

            // Clear input and reset
            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendButton.classList.remove('pulse');

            // Set waiting state
            isWaitingForResponse = true;
            updateUIState(true);

            try {
                const response = await fetch('/send_message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: message })
                });

                if (response.ok) {
                    showAIStatus();
                    startStatusPolling();
                } else {
                    throw new Error('Failed to send message');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                hideAllIndicators();
                isWaitingForResponse = false;
                updateUIState(false);
            }
        }

        function addUserMessageToChat(text, timestamp) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message user';
            messageDiv.innerHTML = `
                <div>${text}</div>
                <div class="message-time">${timestamp}</div>
            `;
            messagesContainer.appendChild(messageDiv);
            lastMessageCount++;
            scrollToBottom();
        }

        function addBotMessageToChat(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';

    let content = message.text;
    if (content.startsWith('http')) {
        content = `<a href="${content}" target="_blank">Download Report</a>`;
    }

    messageDiv.innerHTML = `
        <div>${content}</div>
        <div class="message-time">${message.timestamp}</div>
    `;
    messagesContainer.appendChild(messageDiv);
}

        function showAIStatus() {
            aiStatus.classList.add('active');
            scrollToBottom();
        }

        function hideAIStatus() {
            aiStatus.classList.remove('active');
        }

        function showTypingIndicator() {
            typingIndicator.classList.add('active');
            scrollToBottom();
        }

        function hideTypingIndicator() {
            typingIndicator.classList.remove('active');
        }

        function hideAllIndicators() {
            hideAIStatus();
            hideTypingIndicator();
        }

        function updateUIState(waiting) {
            messageInput.disabled = waiting;
            sendButton.disabled = waiting;

            if (!waiting) {
                messageInput.focus();
            }
        }

        async function loadMessages() {
            try {
                const response = await fetch('/get_messages');
                const messages = await response.json();

                if (messages.length > lastMessageCount) {
                    const newMessages = messages.slice(lastMessageCount);
                    newMessages.forEach(message => {
                        if (message.sender === 'bot') {
                            hideAllIndicators();
                            addBotMessageToChat(message);
                            isWaitingForResponse = false;
                            updateUIState(false);
                        }
                    });
                    lastMessageCount = messages.length;
                    scrollToBottom();
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }

        async function checkStatus() {
            try {
                const response = await fetch('/get_status');
                const status = await response.json();

                if (status.active && status.message) {
                    statusText.textContent = status.message;
                    if (!aiStatus.classList.contains('active')) {
                        showAIStatus();
                    }
                } else if (!status.active) {
                    hideAIStatus();
                    if (isWaitingForResponse) {
                        showTypingIndicator();
                    }
                }
            } catch (error) {
                console.error('Error checking status:', error);
            }
        }

        function startStatusPolling() {
            const statusInterval = setInterval(async () => {
                await checkStatus();
                await loadMessages();

                if (!isWaitingForResponse) {
                    clearInterval(statusInterval);
                }
            }, 500);
        }

        function scrollToBottom() {
            requestAnimationFrame(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        }

        // Focus on input when page loads
        window.addEventListener('load', () => {
            messageInput.focus();
        });

        // Periodic message check for multi-user scenarios
        setInterval(loadMessages, 3000);