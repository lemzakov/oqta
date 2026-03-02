const OWUI_SIGNIN_URL = "https://chat.oqta.ai/api/v1/auths/signin";
const OWUI_SIGNUP_URL = "https://chat.oqta.ai/api/v1/auths/signup";
const COOKIE_KEY = "oqta_customer"; // JSON {name, email, token, ts}
const SESSION_KEY = "oqta_session"; // JSON {chat_id, user_id, messages, ts}
const USER_ID_KEY = "oqta_user_id"; // Persistent user ID (UUID)
const CHAT_ID_KEY = "oqta_chat_id"; // Current chat ID (UUID)
const CONVERSATION_KEY = "oqta_conversation"; // Conversation history
const LANGUAGE_KEY = "oqta_language"; // Selected language
const LEMZAKOV_AI_WEBHOOK_URL = "https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000";
const DEFAULT_SYSTEM_PROMPT = "I want to register company"; // Can be customized based on user context
const WELCOME_MESSAGE = "Hello! Welcome to OQTA AI. How can I help you today?";
const WELCOME_BACK_MESSAGE = "Welcome Back!";

// ===== DOM Elements =====
const continueSessionBtn = document.querySelector('.session');
const landingTextarea = document.getElementById('landing-textarea');
const landingSendBtn = document.getElementById('landing-send-btn');

// Conversation area elements
const landingContent = document.getElementById('landing-content');
const conversationArea = document.getElementById('conversation-area');
const conversationMessages = document.getElementById('conversation-messages');
const conversationTextarea = document.getElementById('conversation-textarea');
const conversationSendBtn = document.getElementById('conversation-send-btn');
const clearBtn = document.getElementById('clear-btn');
const languageSelect = document.getElementById('language-select');

// Chat window elements (if exists)
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
        
        // Add welcome message if no messages exist yet
        if (SESSION?.messages && SESSION.messages.length === 0) {
            const currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en';
            const t = translations[currentLang] || translations.en;
            const welcomeMsg = t.chat.startMessage;
            
            addMessageToConversationArea('assistant', welcomeMsg, false);
        }
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

// ===== Lemzakov AI Labs Webhook Integration =====
async function sendToLemzakovAI(message) {
    if (!SESSION) {
        createNewSession();
    }
    
    const messageId = generateUUID();
    
    // Use the default system prompt (can be customized based on context)
    const systemPrompt = DEFAULT_SYSTEM_PROMPT;
    
    // Prepare the request body in the format expected by Lemzakov AI Labs
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
    
    console.log('Sending to Lemzakov AI Labs:', requestBody);
    
    try {
        const response = await fetch(LEMZAKOV_AI_WEBHOOK_URL, {
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
        console.log('Lemzakov AI Labs response:', data);
        
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
        console.error('Error sending to Lemzakov AI Labs:', error);
        throw error;
    }
}

// ===== Database Integration =====
// Note: Lemzakov AI Labs manages the chat histories table directly
// We don't write to it from the frontend - only read from admin panel

// ===== Message Sending =====
async function sendMessage(message) {
    if (!message || IS_SENDING) return;
    
    IS_SENDING = true;
    // Disable both send buttons
    if (landingSendBtn) landingSendBtn.disabled = true;
    if (conversationSendBtn) conversationSendBtn.disabled = true;
    
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
        if (landingTextarea) {
            landingTextarea.value = '';
            landingTextarea.style.height = 'auto';
        }
        if (conversationTextarea) {
            conversationTextarea.value = '';
            conversationTextarea.style.height = 'auto';
        }
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to Lemzakov AI Labs and wait for response
        // Note: Lemzakov AI Labs will save both the user message and AI response to chat histories table
        const aiResponse = await sendToLemzakovAI(message);
        
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
        if (landingSendBtn) landingSendBtn.disabled = false;
        if (conversationSendBtn) conversationSendBtn.disabled = false;
        if (conversationTextarea) conversationTextarea.focus();
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

// Landing Page Send Button
landingSendBtn?.addEventListener('click', () => {
    const text = landingTextarea?.value.trim() || "";

    if (!text) {
        alert("Please enter your question first.");
        return;
    }

    console.log('Sending message from landing page:', text);

    // Ensure session exists
    if (!SESSION) {
        loadSession();
    }
    
    sendMessage(text);
    landingTextarea.value = '';
    landingTextarea.style.height = 'auto';
});

// Landing Page Textarea Enter Key
landingTextarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = landingTextarea?.value.trim() || "";
        if (text) {
            console.log('Sending message from landing page (Enter):', text);
            sendMessage(text);
            landingTextarea.value = '';
            landingTextarea.style.height = 'auto';
        }
    }
});

// Auto-resize landing textarea
landingTextarea?.addEventListener('input', () => {
    landingTextarea.style.height = 'auto';
    landingTextarea.style.height = Math.min(landingTextarea.scrollHeight, 128) + 'px';
});

// Conversation Area Send Button
conversationSendBtn?.addEventListener('click', () => {
    const text = conversationTextarea?.value.trim() || "";
    if (text) {
        console.log('Sending message from conversation area:', text);
        sendMessage(text);
        conversationTextarea.value = '';
        conversationTextarea.style.height = 'auto';
    }
});

// Conversation Area Textarea Enter Key
conversationTextarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = conversationTextarea?.value.trim() || "";
        if (text) {
            console.log('Sending message from conversation area (Enter):', text);
            sendMessage(text);
            conversationTextarea.value = '';
            conversationTextarea.style.height = 'auto';
        }
    }
});

// Auto-resize conversation textarea
conversationTextarea?.addEventListener('input', () => {
    conversationTextarea.style.height = 'auto';
    conversationTextarea.style.height = Math.min(conversationTextarea.scrollHeight, 128) + 'px';
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

// Language translations
const translations = {
    en: {
        welcome: "WELCOME TO",
        hero: {
            title: "Register your company & get business license in UAE with AI",
            subheadline: "AI-guided setup, tax structure selection & licensing — complete business registration in minutes",
            benefit1: "Ask for any tax-related advice",
            benefit2: "Understand your costs free of charge",
            benefit3: "Decide what business structure to register",
            benefit4: "Get personalized AI recommendations",
            primaryCTA: "Start Free Consultation",
            trust1: "Licensed UAE consultants",
            trust2: "300+ companies registered",
            trust3: "4.9/5 client rating",
            trust4: "Official government procedures",
            secondary1: "I want to open a company",
            secondary2: "I want to relocate",
            secondary3: "I want tax advice",
            secondary4: "I want Emirates ID"
        },
        chat: {
            promiseTitle: "Answer 5 questions and get:",
            promise1: "company type",
            promise2: "jurisdiction",
            promise3: "total cost",
            promise4: "next steps",
            placeholder: "What business do you want to open in the UAE?",
            chip1: "SaaS / IT",
            chip2: "Trading",
            chip3: "Holding",
            chip4: "Crypto",
            chip5: "Consulting",
            startMessage: "Hi! I'll help you register a UAE company. What type of business do you plan to open?"
        },
        footer: {
            needAssistance: "Need assistance? Contact us:",
            whatsapp: "WhatsApp",
            finalCTA: "Ready to start your business in UAE?",
            finalCTAButton: "Get Started Now"
        }
    },
    ru: {
        welcome: "ДОБРО ПОЖАЛОВАТЬ В",
        hero: {
            title: "Зарегистрируйте компанию и получите бизнес-лицензию в ОАЭ с помощью ИИ",
            subheadline: "ИИ помогает выбрать структуру компании, юрисдикцию и лицензирование — полная регистрация бизнеса за минуты",
            benefit1: "Получите консультацию по налогам",
            benefit2: "Узнайте стоимость абсолютно бесплатно",
            benefit3: "Выберите структуру бизнеса для регистрации",
            benefit4: "Получите персональные рекомендации ИИ",
            primaryCTA: "Начать бесплатную консультацию",
            trust1: "Лицензированные консультанты в ОАЭ",
            trust2: "300+ зарегистрированных компаний",
            trust3: "Рейтинг клиентов 4.9/5",
            trust4: "Официальные государственные процедуры",
            secondary1: "Хочу открыть компанию",
            secondary2: "Хочу релоцировать бизнес",
            secondary3: "Нужна налоговая консультация",
            secondary4: "Нужен Emirates ID"
        },
        chat: {
            promiseTitle: "Ответьте на 5 вопросов и получите:",
            promise1: "тип компании",
            promise2: "юрисдикцию",
            promise3: "расчёт стоимости",
            promise4: "следующие шаги",
            placeholder: "Какой бизнес вы хотите открыть в ОАЭ?",
            chip1: "SaaS / IT",
            chip2: "Торговля",
            chip3: "Холдинг",
            chip4: "Крипто",
            chip5: "Консалтинг",
            startMessage: "Привет! Я помогу зарегистрировать компанию в ОАЭ. Какой тип бизнеса вы планируете открыть?"
        },
        footer: {
            needAssistance: "Нужна помощь? Свяжитесь с нами:",
            whatsapp: "WhatsApp",
            finalCTA: "Готовы начать свой бизнес в ОАЭ?",
            finalCTAButton: "Начать сейчас"
        }
    },
    ar: {
        welcome: "مرحبًا بك في",
        hero: {
            title: "سجل شركتك واحصل على ترخيص الأعمال في الإمارات باستخدام الذكاء الاصطناعي",
            subheadline: "إعداد موجه بالذكاء الاصطناعي، اختيار الهيكل الضريبي والترخيص — تسجيل الأعمال الكامل في دقائق",
            benefit1: "احصل على أي نصيحة ضريبية",
            benefit2: "افهم تكاليفك مجانًا",
            benefit3: "حدد هيكل العمل المناسب للتسجيل",
            benefit4: "احصل على توصيات مخصصة من الذكاء الاصطناعي",
            primaryCTA: "ابدأ استشارة مجانية",
            trust1: "مستشارون مرخصون في الإمارات",
            trust2: "أكثر من 300 شركة مسجلة",
            trust3: "تقييم العملاء 4.9/5",
            trust4: "إجراءات حكومية رسمية",
            secondary1: "أريد فتح شركة",
            secondary2: "أريد نقل عملي",
            secondary3: "أريد استشارة ضريبية",
            secondary4: "أريد بطاقة الهوية الإماراتية"
        },
        chat: {
            promiseTitle: "أجب على 5 أسئلة واحصل على:",
            promise1: "نوع الشركة",
            promise2: "الولاية القضائية",
            promise3: "التكلفة الإجمالية",
            promise4: "الخطوات التالية",
            placeholder: "ما نوع العمل الذي تريد فتحه في الإمارات؟",
            chip1: "تقنية المعلومات / SaaS",
            chip2: "التجارة",
            chip3: "الشركة القابضة",
            chip4: "العملات الرقمية",
            chip5: "الاستشارات",
            startMessage: "مرحبًا! سأساعدك في تسجيل شركة في الإمارات. ما نوع العمل الذي تخطط لفتحه؟"
        },
        footer: {
            needAssistance: "هل تحتاج إلى مساعدة؟ اتصل بنا:",
            whatsapp: "واتساب",
            finalCTA: "هل أنت مستعد لبدء عملك في الإمارات؟",
            finalCTAButton: "ابدأ الآن"
        }
    }
};

function applyLanguage(lang) {
    const t = translations[lang] || translations.en;
    
    // Set dir attribute for RTL languages
    const htmlElement = document.documentElement;
    if (lang === 'ar') {
        htmlElement.setAttribute('dir', 'rtl');
    } else {
        htmlElement.setAttribute('dir', 'ltr');
    }
    
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const keys = key.split('.');
        let value = t;
        
        // Navigate through nested object
        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }
        
        if (value) {
            element.textContent = value;
        }
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const keys = key.split('.');
        let value = t;
        
        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }
        
        if (value) {
            element.setAttribute('placeholder', value);
        }
    });
    
    // Update welcome banner
    const welcomeSpan = document.querySelector('.welcome span');
    if (welcomeSpan) {
        welcomeSpan.innerHTML = `${t.welcome} <strong>OQTA </strong>AI`;
    }
    
    console.log('Language applied:', lang, 'dir:', htmlElement.getAttribute('dir'));
}

// Language selector
languageSelect?.addEventListener('change', (e) => {
    const selectedLanguage = e.target.value;
    localStorage.setItem(LANGUAGE_KEY, selectedLanguage);
    console.log('Language changed to:', selectedLanguage);
    
    // Apply language to UI immediately
    applyLanguage(selectedLanguage);
});

// ===== Primary CTA Handler =====
const primaryCTA = document.getElementById('primary-cta');
primaryCTA?.addEventListener('click', () => {
    // Focus on the chat input without harsh scrolling
    const landingTextarea = document.getElementById('landing-textarea');
    if (landingTextarea) {
        landingTextarea.focus();
        // No scrolling - chat is already visible inline
    }
});

// ===== Quick Chips Handlers =====
function handleChipClick(chipType) {
    const currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en';
    const t = translations[currentLang] || translations.en;
    
    const chipMessages = {
        en: {
            saas: "I want to open an IT/SaaS company in the UAE",
            trading: "I want to open a trading company in the UAE",
            holding: "I want to set up a holding company in the UAE",
            crypto: "I want to open a crypto-related business in the UAE",
            consulting: "I want to open a consulting business in the UAE"
        },
        ru: {
            saas: "Хочу открыть IT/SaaS компанию в ОАЭ",
            trading: "Хочу открыть торговую компанию в ОАЭ",
            holding: "Хочу создать холдинговую компанию в ОАЭ",
            crypto: "Хочу открыть крипто-бизнес в ОАЭ",
            consulting: "Хочу открыть консалтинговую компанию в ОАЭ"
        },
        ar: {
            saas: "أريد فتح شركة تقنية معلومات / SaaS في الإمارات",
            trading: "أريد فتح شركة تجارية في الإمارات",
            holding: "أريد إنشاء شركة قابضة في الإمارات",
            crypto: "أريد فتح عمل متعلق بالعملات الرقمية في الإمارات",
            consulting: "أريد فتح شركة استشارية في الإمارات"
        }
    };
    
    const message = chipMessages[currentLang]?.[chipType] || chipMessages.en[chipType];
    
    // Send message to chat
    const landingTextarea = document.getElementById('landing-textarea');
    if (landingTextarea) {
        landingTextarea.value = message;
        // Trigger send
        landingSendBtn?.click();
    }
}

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        const chipType = e.target.getAttribute('data-chip');
        handleChipClick(chipType);
    });
});

// ===== Secondary Paths Handlers =====
function handleSecondaryPath(action) {
    const currentLang = localStorage.getItem(LANGUAGE_KEY) || 'en';
    
    const pathMessages = {
        en: {
            'open-company': "I want to open a company in the UAE",
            'relocate': "I want to relocate my business to the UAE",
            'tax-advice': "I need tax advice for UAE business",
            'emirates-id': "I want to get Emirates ID"
        },
        ru: {
            'open-company': "Хочу открыть компанию в ОАЭ",
            'relocate': "Хочу релоцировать бизнес в ОАЭ",
            'tax-advice': "Нужна консультация по налогам в ОАЭ",
            'emirates-id': "Хочу получить Emirates ID"
        },
        ar: {
            'open-company': "أريد فتح شركة في الإمارات",
            'relocate': "أريد نقل عملي إلى الإمارات",
            'tax-advice': "أحتاج إلى استشارة ضريبية لأعمال الإمارات",
            'emirates-id': "أريد الحصول على بطاقة الهوية الإماراتية"
        }
    };
    
    const message = pathMessages[currentLang]?.[action] || pathMessages.en[action];
    
    // Send message to chat
    const landingTextarea = document.getElementById('landing-textarea');
    if (landingTextarea) {
        landingTextarea.value = message;
        // Trigger send
        landingSendBtn?.click();
    }
}

document.querySelectorAll('.secondary-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const action = e.target.getAttribute('data-action');
        handleSecondaryPath(action);
    });
});

// Detect and set browser language on first visit
function detectAndSetBrowserLanguage() {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    
    // If user hasn't selected a language yet, detect from browser
    if (!savedLanguage) {
        const browserLang = navigator.language || navigator.userLanguage;
        let detectedLang = 'en'; // default
        
        // Map browser language codes to our supported languages (EN, RU, AR only)
        if (browserLang.startsWith('ar')) {
            detectedLang = 'ar'; // Arabic
        } else if (browserLang.startsWith('ru')) {
            detectedLang = 'ru'; // Russian
        }
        
        localStorage.setItem(LANGUAGE_KEY, detectedLang);
        if (languageSelect) {
            languageSelect.value = detectedLang;
        }
        applyLanguage(detectedLang);
        console.log('Browser language detected:', browserLang, '→ Set to:', detectedLang);
    } else {
        // Load saved language preference
        if (languageSelect) {
            languageSelect.value = savedLanguage;
        }
        applyLanguage(savedLanguage);
        console.log('Loaded saved language:', savedLanguage);
    }
}

// ===== Load Settings from API =====
async function loadContactSettings() {
    try {
        const response = await fetch('/api/settings/public');
        if (response.ok) {
            const settings = await response.json();
            
            // Update phone number
            if (settings.phone_number) {
                const phoneLink = document.getElementById('contact-phone');
                const phoneText = document.getElementById('contact-phone-text');
                if (phoneLink && phoneText) {
                    // Remove all non-digit characters for the tel: link
                    const phoneDigits = settings.phone_number.replace(/\D/g, '');
                    phoneLink.href = `tel:${phoneDigits}`;
                    phoneText.textContent = settings.phone_number;
                    console.log('Phone number loaded from settings:', settings.phone_number);
                }
            }
            
            // Update WhatsApp number
            if (settings.whatsapp_number) {
                const whatsappLink = document.getElementById('contact-whatsapp');
                if (whatsappLink) {
                    // Remove all non-digit characters for WhatsApp link
                    const whatsappDigits = settings.whatsapp_number.replace(/\D/g, '');
                    whatsappLink.href = `https://wa.me/${whatsappDigits}`;
                    console.log('WhatsApp number loaded from settings:', settings.whatsapp_number);
                }
            }
        }
    } catch (error) {
        console.error('Failed to load contact settings:', error);
        // Keep default values if settings can't be loaded
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
    
    // Load contact settings from database
    loadContactSettings();
    
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
