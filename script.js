const OWUI_SIGNIN_URL = "https://chat.oqta.ai/api/v1/auths/signin";
const OWUI_SIGNUP_URL = "https://chat.oqta.ai/api/v1/auths/signup";
const CHAT_REDIRECT_URL = "https://chat.oqta.ai/sso.html";
const COOKIE_KEY = "oqta_customer"; // JSON {name, email, token, ts}

// ===== Получение элементов =====
const continueSessionBtn = document.querySelector('.session');
const sendBtn = document.querySelector('.action-btn.send');
const textarea = document.querySelector('.prompt-textarea');

const suModal = document.getElementById('signup-modal');

// Sign In элементы
const signinForm = document.getElementById('signin-form');
const signinEmail = document.getElementById('signin-email');
const signinPass = document.getElementById('signin-pass');
const signinCancel = document.getElementById('signin-cancel');
const signinSubmit = document.getElementById('signin-submit');
const signinMsg = document.getElementById('signin-msg');

// Sign Up элементы
const signupForm = document.getElementById('signup-form');
const suName = document.getElementById('su-name');
const suEmail = document.getElementById('su-email');
const suPass = document.getElementById('su-pass');
const suCancel = document.getElementById('su-cancel');
const suSubmit = document.getElementById('su-submit');
const suMsg = document.getElementById('su-msg');

// Кнопки переключения форм
const showSignupBtn = document.getElementById('show-signup');
const showSigninBtn = document.getElementById('show-signin');

// ===== Состояние =====
let LOGGED_IN = false;
let CUSTOMER = null; // {name, email, token}
let PENDING_MESSAGE = "";

// ===== Работа с Cookie =====
function setCookie(name, value, days = 30) {
    try {
        // Используем localStorage вместо cookies для совместимости с file://
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

// ===== Функция для построения URL редиректа =====
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
}

// ===== Показать/скрыть модальное окно =====
function showModal(formType = 'signin') {
    suModal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Показываем нужную форму
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
    // Очистка полей
    signinEmail.value = '';
    signinPass.value = '';
    suName.value = '';
    suEmail.value = '';
    suPass.value = '';
}

// ===== Переключение между формами =====
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

// ===== Обработчик входа (Sign In) =====
async function doSignin() {
    const email = signinEmail.value.trim();
    const password = signinPass.value;

    if (!email || !password) {
        signinMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        signinMsg.textContent = "Signing in…";

        const response = await fetch(OWUI_SIGNIN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            signinMsg.textContent = `Sign in failed (${response.status})${errorMsg ? " — " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";
        const name = data?.name || email.split('@')[0]; // Используем имя из ответа или email

        if (!token) {
            signinMsg.textContent = "No token returned. Check backend.";
            return;
        }

        // Сохраняем в cookie
        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();

        signinMsg.textContent = "Success! Redirecting...";

        // Закрываем модалку и редиректим
        setTimeout(() => {
            hideModal();
            const messageToSend = PENDING_MESSAGE || "";
            PENDING_MESSAGE = "";
            redirectToChat(messageToSend);
        }, 500);

    } catch (e) {
        console.error(e);
        signinMsg.textContent = "Network error. Please try again.";
    }
}

// ===== Обработчик регистрации (Sign Up) =====
async function doSignup() {
    const name = suName.value.trim();
    const email = suEmail.value.trim();
    const password = suPass.value;

    if (!name || !email || !password) {
        suMsg.textContent = "Please fill in all fields.";
        return;
    }

    try {
        suMsg.textContent = "Creating your account…";

        const response = await fetch(OWUI_SIGNUP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const errorMsg = await response.text().catch(() => "");
            suMsg.textContent = `Sign up failed (${response.status})${errorMsg ? " — " + errorMsg : ""}`;
            return;
        }

        const data = await response.json();
        const token = data?.token || "";

        if (!token) {
            suMsg.textContent = "No token returned. Check backend.";
            return;
        }

        // Сохраняем в cookie
        const payload = { name, email, token, ts: Date.now() };
        setCookie(COOKIE_KEY, JSON.stringify(payload), 30);
        CUSTOMER = payload;
        LOGGED_IN = true;

        updateSessionButton();

        suMsg.textContent = "Success! Redirecting...";

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

        // Закрываем модалку и редиректим
        setTimeout(() => {
            hideModal();
            const messageToSend = PENDING_MESSAGE || "";
            PENDING_MESSAGE = "";
            redirectToChat(messageToSend);
        }, 500);

    } catch (e) {
        console.error(e);
        suMsg.textContent = "Network error. Please try again.";
    }
}

// ===== Редирект на chat =====
function redirectToChat(text = "") {
    const token = CUSTOMER?.token || "";
    const url = buildRedirectURL(text, token);
    window.location.href = url;
}

// ===== Обработчик кнопки "Continue Your Session" =====
continueSessionBtn?.addEventListener('click', () => {
    if (LOGGED_IN) {
        // Если авторизован - редиректим на чат
        redirectToChat();
    } else {
        // Если не авторизован - показываем форму входа
        showModal('signin');
    }
});

// ===== Обработчик кнопки Send =====
sendBtn?.addEventListener('click', () => {
    const text = textarea?.value.trim() || "";

    if (!text) {
        alert("Please enter your question first.");
        return;
    }

    if (LOGGED_IN) {
        // Если авторизован - редиректим с текстом
        redirectToChat(text);
    } else {
        // Если не авторизован - показываем форму входа
        PENDING_MESSAGE = text;
        showModal('signin');
    }
});

// ===== Обработчики модального окна =====
signinSubmit?.addEventListener('click', doSignin);
signinCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = ""; // Очищаем сохраненное сообщение
    hideModal();
});
suSubmit?.addEventListener('click', doSignup);
suCancel?.addEventListener('click', () => {
    PENDING_MESSAGE = ""; // Очищаем сохраненное сообщение
    hideModal();
});

// Закрытие по клику вне модалки
suModal?.addEventListener('click', (e) => {
    if (e.target === suModal) hideModal();
});

// Обработка Enter в формах
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


// ===== Инициализация при загрузке страницы =====
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