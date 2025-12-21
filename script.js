// ===== Configuration =====
// n8n webhook URL - default production endpoint
// For Vercel: This can be replaced at build time with environment variable
const N8N_WEBHOOK_URL = "https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000";

const SESSION_KEY = "oqta_session_id";
const CONVERSATION_KEY = "oqta_conversation";
const USER_ID_KEY = "oqta_user_id";
const CHAT_ID_KEY = "oqta_chat_id";
const WELCOME_MESSAGE = "Hello! I'm OQTA AI assistant. How can I help you with your UAE company registration today?";
const WELCOME_BACK_MESSAGE = "Welcome back! Let's continue where we left off.";

// ===== DOM Elements =====
const landingContent = document.getElementById('landing-content');
const conversationArea = document.getElementById('conversation-area');
const conversationMessages = document.getElementById('conversation-messages');
const conversationTitle = document.getElementById('conversation-title');
const chatTextarea = document.getElementById('chat-textarea');
const chatSendBtn = document.getElementById('chat-send-btn');
const clearBtn = document.getElementById('clear-btn');
const sendBtn = document.querySelector('.action-btn.send');
const textarea = document.querySelector('.prompt-textarea');

// ===== State Management =====
let sessionId = null;
let userId = null;
let chatId = null;
let conversationHistory = [];
let isLoading = false;

// ===== Utility Functions =====
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

function generateUUID() {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = generateSessionId();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

function getUserId() {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
}

function getChatId() {
    let id = localStorage.getItem(CHAT_ID_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(CHAT_ID_KEY, id);
    }
    return id;
}

function saveConversation() {
    try {
        localStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversationHistory));
    } catch (e) {
        console.error('Failed to save conversation:', e);
    }
}

function loadConversation() {
    try {
        const saved = localStorage.getItem(CONVERSATION_KEY);
        if (saved) {
            conversationHistory = JSON.parse(saved);
            return conversationHistory;
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
    }
    return [];
}

function clearConversation() {
    conversationHistory = [];
    sessionId = generateSessionId();
    chatId = generateUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(CHAT_ID_KEY, chatId);
    localStorage.removeItem(CONVERSATION_KEY);
    
    // Show landing page
    showLandingPage();
}

// ===== UI Functions =====
function showLandingPage() {
    if (landingContent) landingContent.classList.remove('hidden');
    if (conversationArea) conversationArea.classList.remove('active');
}

function showConversationArea() {
    if (landingContent) landingContent.classList.add('hidden');
    if (conversationArea) conversationArea.classList.add('active');
}

function addMessage(content, isUser = false) {
    if (!conversationMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    conversationMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
    
    // Add to history
    conversationHistory.push({
        role: isUser ? 'user' : 'assistant',
        content: content,
        timestamp: Date.now()
    });
    
    saveConversation();
}

function showWelcomeMessage(isReturning = false) {
    const message = isReturning ? WELCOME_BACK_MESSAGE : WELCOME_MESSAGE;
    addMessage(message, false);
    
    if (isReturning && conversationTitle) {
        conversationTitle.textContent = "Welcome Back!";
        setTimeout(() => {
            conversationTitle.textContent = "Chat with OQTA AI";
        }, 3000);
    }
}

function showTypingIndicator() {
    if (!conversationMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    
    typingDiv.appendChild(contentDiv);
    conversationMessages.appendChild(typingDiv);
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function renderConversationHistory() {
    if (!conversationMessages) return;
    
    conversationMessages.innerHTML = '';
    
    if (conversationHistory.length === 0) {
        showWelcomeMessage(false);
    } else {
        conversationHistory.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = msg.content;
            
            messageDiv.appendChild(contentDiv);
            conversationMessages.appendChild(messageDiv);
        });
        
        // Show welcome back message at the top
        if (conversationTitle) {
            conversationTitle.textContent = "Welcome Back!";
            setTimeout(() => {
                if (conversationTitle) {
                    conversationTitle.textContent = "Chat with OQTA AI";
                }
            }, 3000);
        }
    }
    
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
}

// ===== n8n Chat Integration =====
async function sendMessageToN8N(message) {
    try {
        const messageId = generateUUID();
        
        const requestBody = {
            systemPrompt: message,
            user_id: userId,
            user_email: "guest@oqta.ai", // Default for anonymous users
            user_name: "Guest User",
            user_role: "user",
            chat_id: chatId,
            message_id: messageId,
            chatInput: message
        };
        
        console.log('Sending to n8n:', requestBody);
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received from n8n:', data);
        
        // Parse the nested response format from n8n
        // Expected format: { response: { body: { output: "message" }, headers: {}, statusCode: 200 } }
        if (data && data.response && data.response.body && data.response.body.output) {
            return data.response.body.output;
        }
        
        // Fallback to other possible formats
        return data.response || data.message || data.output || "I'm sorry, I couldn't process that request.";
    } catch (error) {
        console.error('Error sending message to n8n:', error);
        return "I'm having trouble connecting. Please try again in a moment.";
    }
}

async function handleSendMessage(text) {
    if (!text || isLoading) return;
    
    isLoading = true;
    
    // Show conversation area if not already shown
    showConversationArea();
    
    // Add user message
    addMessage(text, true);
    
    // Clear input
    if (chatTextarea) {
        chatTextarea.value = '';
        chatTextarea.style.height = 'auto';
    }
    if (textarea) {
        textarea.value = '';
        textarea.style.height = 'auto';
    }
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to n8n and get response
    const response = await sendMessageToN8N(text);
    
    // Remove typing indicator
    removeTypingIndicator();
    
    // Add assistant response
    addMessage(response, false);
    
    isLoading = false;
}

// ===== Event Listeners =====
// Send button in conversation area
chatSendBtn?.addEventListener('click', async () => {
    const text = chatTextarea?.value.trim() || "";
    await handleSendMessage(text);
});

// Send button in landing area
sendBtn?.addEventListener('click', async () => {
    const text = textarea?.value.trim() || "";
    await handleSendMessage(text);
});

// Clear/New Chat button
clearBtn?.addEventListener('click', () => {
    if (confirm('Start a new conversation? This will clear your current chat.')) {
        clearConversation();
    }
});

// Auto-resize textareas
if (chatTextarea) {
    chatTextarea.addEventListener('input', () => {
        chatTextarea.style.height = 'auto';
        chatTextarea.style.height = chatTextarea.scrollHeight + 'px';
    });
    
    chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatSendBtn?.click();
        }
    });
}

if (textarea) {
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn?.click();
        }
    });
}

// ===== Initialization =====
window.addEventListener('DOMContentLoaded', () => {
    // Get or create session ID, user ID, and chat ID
    sessionId = getSessionId();
    userId = getUserId();
    chatId = getChatId();
    
    // Load conversation history
    const history = loadConversation();
    
    if (history.length > 0) {
        // Returning user - show conversation area
        showConversationArea();
        renderConversationHistory();
    } else {
        // New user - show landing page
        showLandingPage();
    }
    
    // Language selector functionality
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            const selectedLang = e.target.value;
            console.log('Language changed to:', selectedLang);
            // Store language preference
            localStorage.setItem('oqta_language', selectedLang);
            // Here you can add logic to change the UI language
            // For now, we just store the preference
        });
        
        // Load saved language preference
        const savedLang = localStorage.getItem('oqta_language');
        if (savedLang) {
            languageSelect.value = savedLang;
        }
    }
});
