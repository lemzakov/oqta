const OWUI_SIGNIN_URL = "https://chat.oqta.ai/api/v1/auths/signin";
const OWUI_SIGNUP_URL = "https://chat.oqta.ai/api/v1/auths/signup";
const COOKIE_KEY = "oqta_customer"; // JSON {name, email, token, ts}
const SESSION_KEY = "oqta_session"; // JSON {chat_id, user_id, messages, ts}
const N8N_WEBHOOK_URL = "https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000";
const DEFAULT_SYSTEM_PROMPT = "I want to register company"; // Can be customized based on user context

// ===== DOM Elements =====
const continueSessionBtn = document.querySelector('.session');
const sendBtn = document.querySelector('.action-btn.send');
const textarea = document.querySelector('.prompt-textarea');

// Chat window elements
const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatTextarea = document.getElementById('chat-textarea');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatCloseBtn = document.getElementById('chat-close-btn');

const suModal = document.getElementById('signup-modal');

// Sign In elements
const signinForm = document.getElementById('signin-form');
const signinEmail = document.getElementById('signin-email');
const signinPass = document.getElementById('signin-pass');
const signinCancel = document.getElementById('signin-cancel');
const signinSubmit = document.getElementById('signin-submit');
const signinMsg = document.getElementById('signin-msg');

// Sign Up elements
const signupForm = document.getElementById('signup-form');
const suName = document.getElementById('su-name');
const suEmail = document.getElementById('su-email');
const suPass = document.getElementById('su-pass');
const suCancel = document.getElementById('su-cancel');
const suSubmit = document.getElementById('su-submit');
const suMsg = document.getElementById('su-msg');

// Toggle buttons
const showSignupBtn = document.getElementById('show-signup');
const showSigninBtn = document.getElementById('show-signin');

// ===== State Variables =====
let LOGGED_IN = false;
let CUSTOMER = null; // {name, email, token}
let SESSION = null; // {chat_id, user_id, messages, ts}
let PENDING_MESSAGE = "";
let IS_SENDING = false;

// ===== UUID Generation =====
function generateUUID() {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===== Storage Functions =====
function setCookie(name, value, days = 30) {
    try {
        localStorage.setItem(name, value);
        console.log('Data saved to localStorage:', name);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function getCookie(name) {
    try {
        const value = localStorage.getItem(name);
        console.log('Data retrieved from localStorage:', name, value ? 'found' : 'not found');
        return value || "";
    } catch (e) {
        console.error('Failed to get from localStorage:', e);
        return "";
    }
}

function deleteCookie(name) {
    try {
        localStorage.removeItem(name);
        console.log('Data removed from localStorage:', name);
    } catch (e) {
        console.error('Failed to remove from localStorage:', e);
    }
}

// ===== Session Management =====
function loadSession() {
    const raw = getCookie(SESSION_KEY);
    if (raw) {
        try {
            SESSION = JSON.parse(raw);
            console.log('Session loaded:', SESSION);
            return SESSION;
        } catch (e) {
            console.error('Failed to parse session:', e);
        }
    }
    return null;
}

function saveSession() {
    if (SESSION) {
        SESSION.ts = Date.now();
        setCookie(SESSION_KEY, JSON.stringify(SESSION), 30);
        console.log('Session saved:', SESSION);
    }
}

function createNewSession() {
    SESSION = {
        chat_id: generateUUID(),
        user_id: CUSTOMER?.token ? generateUUID() : 'anonymous-' + generateUUID(),
        messages: [],
        ts: Date.now()
    };
    saveSession();
    console.log('New session created:', SESSION);
    return SESSION;
}

// ===== Chat UI Functions =====
function showChatWindow() {
    chatWindow.hidden = false;
    document.body.style.overflow = 'hidden';
    
    // Load existing messages if any
    if (SESSION && SESSION.messages && SESSION.messages.length > 0) {
        chatMessages.innerHTML = '';
        SESSION.messages.forEach(msg => {
            addMessageToUI(msg.role, msg.content, false);
        });
        scrollToBottom();
    }
    
    setTimeout(() => chatTextarea.focus(), 100);
}

function hideChatWindow() {
    chatWindow.hidden = true;
    document.body.style.overflow = '';
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessageToUI(role, content, save = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'chat-avatar';
    avatarDiv.textContent = role === 'user' ? (CUSTOMER?.name?.charAt(0).toUpperCase() || 'U') : 'AI';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble';
    bubbleDiv.textContent = content;
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    
    if (save && SESSION) {
        SESSION.messages.push({ role, content, ts: Date.now() });
        saveSession();
    }
    
    scrollToBottom();
}

function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message assistant';
    loadingDiv.id = 'loading-indicator';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'chat-avatar';
    avatarDiv.textContent = 'AI';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble';
    
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'chat-loading';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'chat-loading-dot';
        loadingContainer.appendChild(dot);
    }
    
    bubbleDiv.appendChild(loadingContainer);
    loadingDiv.appendChild(avatarDiv);
    loadingDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(loadingDiv);
    
    scrollToBottom();
}

function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// ===== n8n Webhook Integration =====
async function sendToN8N(message) {
    if (!SESSION) {
        createNewSession();
    }
    
    const messageId = generateUUID();
    
    // Use the default system prompt (can be customized based on context)
    const systemPrompt = DEFAULT_SYSTEM_PROMPT;
    
    // Prepare the request body in the format expected by n8n
    const requestBody = {
        systemPrompt: systemPrompt,
        user_id: SESSION.user_id,
        user_email: CUSTOMER?.email || "guest@oqta.ai",
        user_name: CUSTOMER?.name || "Guest User",
        user_role: CUSTOMER ? "user" : "guest",
        chat_id: SESSION.chat_id,
        message_id: messageId,
        chatInput: message
    };
    
    console.log('Sending to n8n:', requestBody);
    
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('n8n response:', data);
        
        // Parse the AI response - try common response formats
        let aiResponse = '';
        if (typeof data === 'string') {
            aiResponse = data;
        } else if (data.response) {
            aiResponse = data.response;
            console.log('Using response.response field');
        } else if (data.output) {
            aiResponse = data.output;
            console.log('Using response.output field');
        } else if (data.message) {
            aiResponse = data.message;
            console.log('Using response.message field');
        } else {
            console.warn('Unknown response format:', data);
            aiResponse = "I received your message, but I'm having trouble formatting my response. Please try again or contact support.";
        }
        
        return aiResponse;
        
    } catch (error) {
        console.error('Error sending to n8n:', error);
        throw error;
    }
}

// ===== Message Sending =====
async function sendMessage(message) {
    if (!message || IS_SENDING) return;
    
    IS_SENDING = true;
    chatSendBtn.disabled = true;
    
    try {
        // Add user message to UI
        addMessageToUI('user', message);
        
        // Clear input
        chatTextarea.value = '';
        chatTextarea.style.height = 'auto';
        
        // Show loading
        showLoadingIndicator();
        
        // Send to n8n and wait for response
        const aiResponse = await sendToN8N(message);
        
        // Hide loading
        hideLoadingIndicator();
        
        // Add AI response to UI
        addMessageToUI('assistant', aiResponse);
        
    } catch (error) {
        hideLoadingIndicator();
        addMessageToUI('assistant', 'Sorry, I encountered an error. Please try again.');
        console.error('Error in sendMessage:', error);
    } finally {
        IS_SENDING = false;
        chatSendBtn.disabled = false;
        chatTextarea.focus();
    }
}

// ===== Authentication Functions =====
function updateSessionButton() {
    const sessionText = document.getElementById('session-text');
    if (sessionText) {
        sessionText.textContent = LOGGED_IN ? 'Continue Your Session' : 'Sign In';
    }
}

function showModal(formType = 'signin') {
    suModal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Show the correct form
    if (formType === 'signin') {
        signinForm.hidden = false;
        signupForm.hidden = true;
        signinMsg.textContent = "";
        setTimeout(() => signinEmail.focus(), 100);
    } else {
        signinForm.hidden = true;
        signupForm.hidden = false;
        suMsg.textContent = "";
        setTimeout(() => suName.focus(), 100);
    }
}

function hideModal() {
    suModal.hidden = true;
    document.body.style.overflow = '';
    signinEmail.value = '';
    signinPass.value = '';
    suName.value = '';
    suEmail.value = '';
    suPass.value = '';
}

showSignupBtn?.addEventListener('click', () => {
    signinForm.hidden = true;
    signupForm.hidden = false;
    suMsg.textContent = "";
    setTimeout(() => suName.focus(), 100);
});

showSigninBtn?.addEventListener('click', () => {
    signupForm.hidden = true;
    signinForm.hidden = false;
    signinMsg.textContent = "";
    setTimeout(() => signinEmail.focus(), 100);
});

async function doSignin() {
    const email = signinEmail.value.trim();
    const password = signinPass.value;

    if (!email || !password) {
        signinMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        signinMsg.textContent = "Signing in...";

        const response = await fetch(OWUI_SIGNIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            signinMsg.textContent = `Sign in failed (${response.status})${errorMsg ? " - " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";
        const name = data?.name || email.split('@')[0];

        if (!token) {
            signinMsg.textContent = "No token returned. Check backend.";
            return;
        }

        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();
        signinMsg.textContent = "Success!";

        setTimeout(() => {
            hideModal();
            const messageToSend = PENDING_MESSAGE || "";
            PENDING_MESSAGE = "";
            if (messageToSend) {
                showChatWindow();
                sendMessage(messageToSend);
            }
        }, 500);

    } catch (e) {
        console.error(e);
        signinMsg.textContent = "Network error. Please try again.";
    }
}

async function doSignup() {
    const name = suName.value.trim();
    const email = suEmail.value.trim();
    const password = suPass.value;

    if (!name || !email || !password) {
        suMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        suMsg.textContent = "Creating your account...";

        const response = await fetch(OWUI_SIGNUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            suMsg.textContent = `Sign up failed (${response.status})${errorMsg ? " - " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";

        if (!token) {
            suMsg.textContent = "No token returned. Check backend.";
            return;
        }

        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();
        suMsg.textContent = "Success!";

        try {
            await fetch(OWUI_SIGNIN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token })
            });
        } catch (e) {
            console.error("Silent signin failed:", e);
        }

        setTimeout(() => {
            hideModal();
            const messageToSend = PENDING_MESSAGE || "";
            PENDING_MESSAGE = "";
            if (messageToSend) {
                showChatWindow();
                sendMessage(messageToSend);
            }
        }, 500);

    } catch (e) {
        console.error(e);
        suMsg.textContent = "Network error. Please try again.";
    }
}

// ===== Event Listeners =====

// Continue Session Button
continueSessionBtn?.addEventListener('click', () => {
    if (LOGGED_IN || SESSION) {
        showChatWindow();
    } else {
        showModal('signin');
    }
});

// Main Send Button (from landing page)
sendBtn?.addEventListener('click', () => {
    const text = textarea?.value.trim() || "";

    if (!text) {
        alert("Please enter your question first.");
        return;
    }

    // Always show chat window directly
    if (!SESSION) {
        createNewSession();
    }
    
    showChatWindow();
    sendMessage(text);
    textarea.value = '';
});

// Chat Window Send Button
chatSendBtn?.addEventListener('click', () => {
    const text = chatTextarea?.value.trim() || "";
    if (text) {
        sendMessage(text);
    }
});

// Chat Textarea Enter Key
chatTextarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatTextarea?.value.trim() || "";
        if (text) {
            sendMessage(text);
        }
    }
});

// Auto-resize chat textarea
chatTextarea?.addEventListener('input', () => {
    chatTextarea.style.height = 'auto';
    chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 128) + 'px';
});

// Close Chat Window
chatCloseBtn?.addEventListener('click', () => {
    hideChatWindow();
});

// Sign in/up handlers
signinSubmit?.addEventListener('click', doSignin);
signinCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = "";
    hideModal();
});
suSubmit?.addEventListener('click', doSignup);
suCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = "";
    hideModal();
});

suModal?.addEventListener('click', (e) => {
    if (e.target === suModal) hideModal();
});

signinEmail?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') signinPass.focus();
});
signinPass?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSignin();
});

suName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') suEmail.focus();
});
suEmail?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') suPass.focus();
});
suPass?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSignup();
});

// ===== Initialization =====
window.addEventListener('DOMContentLoaded', async () => {
    // Load customer data
    const raw = getCookie(COOKIE_KEY);
    if (raw) {
        try {
            CUSTOMER = JSON.parse(raw) || null;
        } catch (e) {
            console.error("Failed to parse cookie:", e);
        }

        if (CUSTOMER?.token) {
            LOGGED_IN = true;

            try {
                await fetch(OWUI_SIGNIN_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ token: CUSTOMER.token })
                });
            } catch (e) {
                console.error("Silent signin failed:", e);
            }
        }
    }

    // Load session data
    loadSession();

    updateSessionButton();
    
    console.log('OQTA AI initialized', { LOGGED_IN, CUSTOMER, SESSION });
});
