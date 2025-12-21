const OWUI_SIGNIN_URL = "https://chat.oqta.ai/api/v1/auths/signin";
const OWUI_SIGNUP_URL = "https://chat.oqta.ai/api/v1/auths/signup";
const CHAT_REDIRECT_URL = "https://chat.oqta.ai/sso.html";
const COOKIE_KEY = "oqta_customer"; // JSON {name, email, token, ts}

// ===== ��������� ��������� =====
const continueSessionBtn = document.querySelector('.session');
const sendBtn = document.querySelector('.action-btn.send');
const textarea = document.querySelector('.prompt-textarea');

const suModal = document.getElementById('signup-modal');

// Landing and conversation areas
const landingContent = document.getElementById('landing-content');
const conversationArea = document.getElementById('conversation-area');
const conversationMessages = document.getElementById('conversation-messages');
const chatTextarea = document.getElementById('chat-textarea');
const chatSendBtn = document.getElementById('chat-send-btn');
const logoutBtn = document.getElementById('logout-btn');
const sessionBtn = document.getElementById('session-btn');

// Sign In ��������
const signinForm = document.getElementById('signin-form');
const signinEmail = document.getElementById('signin-email');
const signinPass = document.getElementById('signin-pass');
const signinCancel = document.getElementById('signin-cancel');
const signinSubmit = document.getElementById('signin-submit');
const signinMsg = document.getElementById('signin-msg');

// Sign Up ��������
const signupForm = document.getElementById('signup-form');
const suName = document.getElementById('su-name');
const suEmail = document.getElementById('su-email');
const suPass = document.getElementById('su-pass');
const suCancel = document.getElementById('su-cancel');
const suSubmit = document.getElementById('su-submit');
const suMsg = document.getElementById('su-msg');

// ������ ������������ ����
const showSignupBtn = document.getElementById('show-signup');
const showSigninBtn = document.getElementById('show-signin');

// ===== ��������� =====
let LOGGED_IN = false;
let CUSTOMER = null; // {name, email, token}
let PENDING_MESSAGE = "";

// ===== ������ � Cookie =====
function setCookie(name, value, days = 30) {
    try {
        // ���������� localStorage ������ cookies ��� ������������� � file://
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

// ===== ������� ��� ���������� URL ��������� =====
function buildRedirectURL(text, token) {
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (text) params.append('q', text);
    return `${CHAT_REDIRECT_URL}?${params.toString()}`;
}

function updateSessionButton() {
    const sessionText = document.getElementById('session-text');
    if (sessionText) {
        sessionText.textContent = LOGGED_IN ? 'Continue Your Session' : 'Sign In';
    }
    
    // Show/hide session button based on logged-in state
    if (sessionBtn) {
        if (LOGGED_IN) {
            sessionBtn.style.display = 'none';
        } else {
            sessionBtn.style.display = 'inline-flex';
        }
    }
    
    // Toggle between landing page and conversation area
    if (LOGGED_IN) {
        if (landingContent) landingContent.classList.add('hidden');
        if (conversationArea) conversationArea.classList.add('active');
    } else {
        if (landingContent) landingContent.classList.remove('hidden');
        if (conversationArea) conversationArea.classList.remove('active');
    }
}

// ===== ��������/������ ��������� ���� =====
function showModal(formType = 'signin') {
    doSignup();
 //   suModal.hidden = false;
  //  document.body.style.overflow = 'hidden';

    // ���������� ������ �����
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
    // ������� �����
    signinEmail.value = '';
    signinPass.value = '';
    suName.value = '';
    suEmail.value = '';
    suPass.value = '';
}

// ===== ������������ ����� ������� =====
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

// ===== ���������� ����� (Sign In) =====
async function doSignin() {
    const email = signinEmail.value.trim();
    const password = signinPass.value;

    if (!email || !password) {
        signinMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        signinMsg.textContent = "Signing in�";

        const response = await fetch(OWUI_SIGNIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            signinMsg.textContent = `Sign in failed (${response.status})${errorMsg ? " � " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";
        const name = data?.name || email.split('@')[0]; // ���������� ��� �� ������ ��� email

        if (!token) {
            signinMsg.textContent = "No token returned. Check backend.";
            return;
        }

        // ��������� � cookie
        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();

        signinMsg.textContent = "Success!";

        // Close modal and show conversation instead of redirecting
        setTimeout(() => {
            hideModal();
            PENDING_MESSAGE = "";
        }, 500);

    } catch (e) {
        console.error(e);
        signinMsg.textContent = "Network error. Please try again.";
    }
}

// ===== ���������� ����������� (Sign Up) =====
async function doSignup() {
    const name = "automail"+ Date.now();//suName.value.trim();
    const email = name + "@mail.com";// signinEmail.value.trim();
    const password = "password";//signinPass.value";

   // const name = suName.value.trim();
   // const email = suEmail.value.trim();
   // const password = suPass.value;

    if (!name || !email || !password) {
        suMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        suMsg.textContent = "Creating your account�";

        const response = await fetch(OWUI_SIGNUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            suMsg.textContent = `Sign up failed (${response.status})${errorMsg ? " � " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";

        if (!token) {
            suMsg.textContent = "No token returned. Check backend.";
            return;
        }

        // ��������� � cookie
        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();

        suMsg.textContent = "Success!";

        // Silent sign-in
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

        // Close modal and show conversation instead of redirecting
        setTimeout(() => {
            hideModal();
            PENDING_MESSAGE = "";
        }, 500);

    } catch (e) {
        console.error(e);
        suMsg.textContent = "Network error. Please try again.";
    }
}

// ===== �������� �� chat =====
function redirectToChat(text = "") {
    const token = CUSTOMER?.token || "";
    const url = buildRedirectURL(text, token);
    window.location.href = url;
}

// ===== Logout function =====
function doLogout() {
    deleteCookie(COOKIE_KEY);
    CUSTOMER = null;
    LOGGED_IN = false;
    updateSessionButton();
    // Clear conversation messages except the initial greeting
    if (conversationMessages) {
        conversationMessages.innerHTML = `
            <div class="message assistant">
                <div class="message-content">
                    Hello! I'm OQTA AI assistant. How can I help you with your UAE company registration today?
                </div>
            </div>
        `;
    }
    if (chatTextarea) {
        chatTextarea.value = '';
    }
}

// ===== ���������� ������ "Continue Your Session" =====
continueSessionBtn?.addEventListener('click', () => {
    if (LOGGED_IN) {
        // ���� ����������� - ���������� �� ���
        redirectToChat();
    } else {
        // ���� �� ����������� - ���������� ����� �����
        showModal('signin');
    }
});

// ===== ���������� ������ Send =====
sendBtn?.addEventListener('click', () => {
    const text = textarea?.value.trim() || "";

    if (!text) {
        alert("Please enter your question first.");
        return;
    }

    if (LOGGED_IN) {
        // Add message to conversation and redirect
        if (conversationMessages) {
            const userMsg = document.createElement('div');
            userMsg.className = 'message user';
            userMsg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
            conversationMessages.appendChild(userMsg);
            conversationMessages.scrollTop = conversationMessages.scrollHeight;
        }
        redirectToChat(text);
    } else {
        // ���� �� ����������� - ���������� ����� �����
        PENDING_MESSAGE = text;
        showModal('signin');
    }
});

// ===== ����������� ���������� ���� =====
signinSubmit?.addEventListener('click', doSignin);
signinCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = ""; // ������� ����������� ���������
    hideModal();
});
suSubmit?.addEventListener('click', doSignup);
suCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = ""; // ������� ����������� ���������
    hideModal();
});

// �������� �� ����� ��� �������
suModal?.addEventListener('click', (e) => {
    if (e.target === suModal) hideModal();
});

// ��������� Enter � ������
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

// ===== Logout button =====
logoutBtn?.addEventListener('click', doLogout);

// ===== Chat send button =====
chatSendBtn?.addEventListener('click', () => {
    const text = chatTextarea?.value.trim() || "";
    
    if (!text) {
        return;
    }
    
    // Add user message to conversation
    if (conversationMessages) {
        const userMsg = document.createElement('div');
        userMsg.className = 'message user';
        userMsg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
        conversationMessages.appendChild(userMsg);
        
        // Scroll to bottom
        conversationMessages.scrollTop = conversationMessages.scrollHeight;
    }
    
    // Clear textarea
    if (chatTextarea) {
        chatTextarea.value = '';
        chatTextarea.style.height = 'auto';
    }
    
    // Redirect to chat with the message
    redirectToChat(text);
});

// Auto-resize chat textarea
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

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// ===== ������������� ��� �������� �������� =====
window.addEventListener('DOMContentLoaded', async () => {
    const raw = getCookie(COOKIE_KEY);

    if (raw) {
        try {
            CUSTOMER = JSON.parse(raw) || null;
        } catch (e) {
            console.error("Failed to parse cookie:", e);
        }

        if (CUSTOMER?.token) {
            LOGGED_IN = true;


            // Silent sign-in
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

    updateSessionButton();
});