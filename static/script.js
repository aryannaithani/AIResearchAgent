// DOM elements
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const aiStatus = document.getElementById('aiStatus');
        const statusText = document.getElementById('statusText');
        const typingIndicator = document.getElementById('typingIndicator');
        
        // Landing page elements
        const landingContainer = document.getElementById('landingContainer');
        const chatHeader = document.getElementById('chatHeader');
        const chatContainer = document.getElementById('chatContainer');
        const startButton = document.getElementById('startButton');

        // Chat state
        let isLandingVisible = true;
        let lastMessageCount = 0;
        let isWaitingForResponse = false;

        // Initialize app
        function init() {
            // Set initial timestamp
            const initialTimeElement = document.getElementById('initial-time');
            if (initialTimeElement) {
                initialTimeElement.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
            
            // Landing page event listeners
            if (startButton) {
                startButton.addEventListener('click', transitionToChat);
            }
            
            // Chat event listeners (only add if not on landing)
            if (sendButton && messageInput) {
                setupChatListeners();
            }
        }

        // Transition from landing to chat
        function transitionToChat() {
            if (!isLandingVisible) return;
            
            isLandingVisible = false;
            
            // Add fade-out class to landing
            landingContainer.classList.add('fade-out');
            
            // After animation completes, switch to chat
            setTimeout(() => {
                landingContainer.style.display = 'none';
                chatHeader.style.display = 'flex';
                chatContainer.style.display = 'flex';
                
                // Add fade-in animation to chat
                chatHeader.style.opacity = '0';
                chatContainer.style.opacity = '0';
                chatHeader.style.transform = 'translateY(20px)';
                chatContainer.style.transform = 'translateY(20px)';
                
                // Animate in
                setTimeout(() => {
                    chatHeader.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                    chatContainer.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                    chatHeader.style.opacity = '1';
                    chatContainer.style.opacity = '1';
                    chatHeader.style.transform = 'translateY(0)';
                    chatContainer.style.transform = 'translateY(0)';
                    
                    // Setup chat functionality after transition
                    setupChatListeners();
                    
                    // Focus input after transition
                    setTimeout(() => {
                        if (messageInput) {
                            messageInput.focus();
                        }
                    }, 300);
                }, 50);
            }, 800);
        }

        // Setup chat event listeners
        function setupChatListeners() {
            if (!messageInput || !sendButton) return;

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
        }

        // Initialize when page loads
        init();

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
        content = `<a href="${content}" target="_blank" class="download-button">
            <svg class="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Report
        </a>`;
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