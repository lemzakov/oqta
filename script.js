const OWUI_SIGNIN_URL = "https://chat.oqta.ai/api/v1/auths/signin";
const OWUI_SIGNUP_URL = "https://chat.oqta.ai/api/v1/auths/signup";
const COOKIE_KEY = "oqta_customer"; // JSON {name, email, token, ts}
const SESSION_KEY = "oqta_session"; // JSON {chat_id, user_id, messages, ts}
const USER_ID_KEY = "oqta_user_id"; // Persistent user ID (UUID)
const CHAT_ID_KEY = "oqta_chat_id"; // Current chat ID (UUID)
const CONVERSATION_KEY = "oqta_conversation"; // Conversation history
const LANGUAGE_KEY = "oqta_language"; // Selected language
const N8N_WEBHOOK_URL = "https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000";
const DEFAULT_SYSTEM_PROMPT = "I want to register company"; // Can be customized based on user context
const WELCOME_MESSAGE = "Hello! Welcome to OQTA AI. How can I help you today?";
const WELCOME_BACK_MESSAGE = "Welcome Back!";

// ===== DOM Elements =====
const continueSessionBtn = document.querySelector('.session');
const sendBtn = document.querySelector('.action-btn.send');
const textarea = document.querySelector('.prompt-textarea');

// Conversation area elements
const landingContent = document.getElementById('landing-content');
const conversationArea = document.getElementById('conversation-area');
const conversationMessages = document.getElementById('conversation-messages');
const clearBtn = document.getElementById('clear-btn');
const languageSelect = document.getElementById('language-select');

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
function getCookie(name) {
    try {
        return localStorage.getItem(name);
    } catch (e) {
        console.error('Failed to get from localStorage:', e);
        return null;
    }
}

function setCookie(name, value, days = 30) {
    try {
        localStorage.setItem(name, value);
        console.log('Data saved to localStorage:', name);
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function saveConversation() {
    if (SESSION && SESSION.messages) {
        try {
            localStorage.setItem(CONVERSATION_KEY, JSON.stringify(SESSION.messages));
        } catch (e) {
            console.error('Failed to save conversation:', e);
        }
    }
}

function loadConversation() {
    try {
        const saved = localStorage.getItem(CONVERSATION_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
    }
    return [];
}

function clearConversation() {
    try {
        // Generate new chat_id but keep user_id
        const userId = localStorage.getItem(USER_ID_KEY);
        localStorage.setItem(CHAT_ID_KEY, generateUUID());
        localStorage.removeItem(CONVERSATION_KEY);
        
        // Reset session with new chat_id
        if (SESSION) {
            SESSION.chat_id = localStorage.getItem(CHAT_ID_KEY);
            SESSION.messages = [];
            saveSession();
        }
        
        // Clear UI
        if (conversationMessages) {
            conversationMessages.innerHTML = '';
        }
        
        console.log('Conversation cleared, new chat started');
    } catch (e) {
        console.error('Failed to clear conversation:', e);
    }
}

// ===== Session Management =====
function getUserId() {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = generateUUID();
        localStorage.setItem(USER_ID_KEY, userId);
        console.log('New user_id created:', userId);
    }
    return userId;
}

function getChatId() {
    let chatId = localStorage.getItem(CHAT_ID_KEY);
    if (!chatId) {
        chatId = generateUUID();
        localStorage.setItem(CHAT_ID_KEY, chatId);
        console.log('New chat_id created:', chatId);
    }
    return chatId;
}

function loadSession() {
    const userId = getUserId();
    const chatId = getChatId();
    const messages = loadConversation();
    
    SESSION = {
        user_id: userId,
        chat_id: chatId,
        messages: messages,
        ts: Date.now()
    };
    
    console.log('Session loaded:', SESSION);
    return SESSION;
}

function saveSession() {
    if (SESSION) {
        SESSION.ts = Date.now();
        localStorage.setItem(USER_ID_KEY, SESSION.user_id);
        localStorage.setItem(CHAT_ID_KEY, SESSION.chat_id);
        saveConversation();
        console.log('Session saved:', SESSION);
    }
}

function createNewSession() {
    const userId = getUserId(); // Keep existing user_id or create new one
    const chatId = generateUUID(); // Always new chat_id
    localStorage.setItem(CHAT_ID_KEY, chatId);
    
    SESSION = {
        chat_id: chatId,
        user_id: userId,
        messages: [],
        ts: Date.now()
    };
    saveSession();
    console.log('New session created:', SESSION);
    return SESSION;
}

// ===== Conversation Area Functions =====
function showConversationArea() {
    if (landingContent) {
        landingContent.classList.add('hidden');
    }
    if (conversationArea) {
        conversationArea.classList.add('active');
    }
}

function hideConversationArea() {
    if (landingContent) {
        landingContent.classList.remove('hidden');
    }
    if (conversationArea) {
        conversationArea.classList.remove('active');
    }
}

function addMessageToConversationArea(role, content, save = true) {
    if (!conversationMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageDiv.appendChild(messageContent);
    conversationMessages.appendChild(messageDiv);
    
    if (save && SESSION) {
        SESSION.messages.push({ role, content, ts: Date.now() });
        saveSession();
    }
    
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
}

function showTypingIndicator() {
    if (!conversationMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        messageContent.appendChild(dot);
    }
    
    typingDiv.appendChild(messageContent);
    conversationMessages.appendChild(typingDiv);
    conversationMessages.scrollTop = conversationMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function loadConversationToUI() {
    if (!conversationMessages || !SESSION) return;
    
    conversationMessages.innerHTML = '';
    
    if (SESSION.messages && SESSION.messages.length > 0) {
        SESSION.messages.forEach(msg => {
            addMessageToConversationArea(msg.role, msg.content, false);
        });
    }
}

function showWelcomeBackMessage() {
    if (!conversationMessages) return;
    
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message assistant';
    welcomeDiv.style.textAlign = 'center';
    welcomeDiv.style.fontWeight = '600';
    welcomeDiv.style.opacity = '0.8';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = WELCOME_BACK_MESSAGE;
    
    welcomeDiv.appendChild(messageContent);
    conversationMessages.insertBefore(welcomeDiv, conversationMessages.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
        welcomeDiv.style.transition = 'opacity 0.5s';
        welcomeDiv.style.opacity = '0';
        setTimeout(() => welcomeDiv.remove(), 500);
    }, 3000);
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
        
        // Parse the AI response - handle nested response formats
        let aiResponse = '';
        if (typeof data === 'string') {
            aiResponse = data;
        } else if (data.response && data.response.body && data.response.body.output) {
            // Handle nested format: { response: { body: { output: "message" } } }
            aiResponse = data.response.body.output;
            console.log('Using nested response.body.output field');
        } else if (data.response && typeof data.response === 'string') {
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

// ===== Database Integration =====
// Note: n8n manages the n8n_chat_histories table directly
// We don't write to it from the frontend - only read from admin panel

// ===== Message Sending =====
async function sendMessage(message) {
    if (!message || IS_SENDING) return;
    
    IS_SENDING = true;
    const sendButton = document.getElementById('chat-send-btn');
    if (sendButton) sendButton.disabled = true;
    
    try {
        // Ensure session exists
        if (!SESSION) {
            loadSession();
        }
        
        // Show conversation area if not visible
        showConversationArea();
        
        // Add user message to UI
        addMessageToConversationArea('user', message);
        
        // Clear input
        const textarea = document.getElementById('chat-textarea');
        if (textarea) {
            textarea.value = '';
            textarea.style.height = 'auto';
        }
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to n8n and wait for response
        // Note: n8n will save both the user message and AI response to n8n_chat_histories table
        const aiResponse = await sendToN8N(message);
        
        // Hide typing indicator
        removeTypingIndicator();
        
        // Add AI response to UI
        addMessageToConversationArea('assistant', aiResponse);
        
    } catch (error) {
        removeTypingIndicator();
        addMessageToConversationArea('assistant', 'Sorry, I encountered an error. Please try again.');
        console.error('Error in sendMessage:', error);
    } finally {
        IS_SENDING = false;
        if (sendButton) sendButton.disabled = false;
        const textarea = document.getElementById('chat-textarea');
        if (textarea) textarea.focus();
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
        // Just focus the textarea since conversation area is already visible for returning users
        const textarea = document.getElementById('chat-textarea');
        if (textarea) textarea.focus();
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

    // Ensure session exists
    if (!SESSION) {
        loadSession();
    }
    
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

// Clear/New Chat button - Reset session and reload page
clearBtn?.addEventListener('click', () => {
    if (confirm('Start a new conversation? This will clear your current chat and reload the page.')) {
        // Generate new chat_id (user_id is preserved in localStorage automatically)
        const newChatId = generateUUID();
        
        localStorage.setItem(CHAT_ID_KEY, newChatId);
        localStorage.removeItem(CONVERSATION_KEY);
        localStorage.removeItem(SESSION_KEY);
        
        console.log('New chat started with ID:', newChatId);
        
        // Reload the page to reset everything
        window.location.reload();
    }
});

// Language selector
languageSelect?.addEventListener('change', (e) => {
    const selectedLanguage = e.target.value;
    localStorage.setItem(LANGUAGE_KEY, selectedLanguage);
    console.log('Language changed to:', selectedLanguage);
    
    // You can add translation logic here or send to n8n with the language preference
    // For now, just save the preference
});

// Detect and set browser language on first visit
function detectAndSetBrowserLanguage() {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    
    // If user hasn't selected a language yet, detect from browser
    if (!savedLanguage) {
        const browserLang = navigator.language || navigator.userLanguage;
        let detectedLang = 'en'; // default
        
        // Map browser language codes to our supported languages
        if (browserLang.startsWith('ar')) {
            detectedLang = 'ar'; // Arabic
        } else if (browserLang.startsWith('ru')) {
            detectedLang = 'ru'; // Russian
        } else if (browserLang.startsWith('zh')) {
            detectedLang = 'zh'; // Chinese
        } else if (browserLang.startsWith('hi')) {
            detectedLang = 'hi'; // Hindi
        } else if (browserLang.startsWith('ur')) {
            detectedLang = 'ur'; // Urdu
        }
        
        localStorage.setItem(LANGUAGE_KEY, detectedLang);
        if (languageSelect) {
            languageSelect.value = detectedLang;
        }
        console.log('Browser language detected:', browserLang, '→ Set to:', detectedLang);
    } else {
        // Load saved language preference
        if (languageSelect) {
            languageSelect.value = savedLanguage;
        }
        console.log('Loaded saved language:', savedLanguage);
    }
}

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

    // Load session data
    loadSession();
    
    // Detect and set browser language
    detectAndSetBrowserLanguage();
    
    // Check if user has existing conversation
    const hasMessages = SESSION && SESSION.messages && SESSION.messages.length > 0;
    
    if (hasMessages) {
        // Returning user - show conversation area
        showConversationArea();
        loadConversationToUI();
        showWelcomeBackMessage();
    }

    updateSessionButton();
    
    console.log('OQTA AI initialized', { LOGGED_IN, CUSTOMER, SESSION, hasMessages });
});
