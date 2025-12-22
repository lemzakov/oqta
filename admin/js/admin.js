// Utility function to escape HTML and prevent XSS
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// API base URL
const API_BASE = '/api';

// State
let currentPage = 'dashboard';
let authToken = null;

// Utility functions
const apiCall = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
};

const showError = (elementId, message) => {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
};

const showSuccess = (elementId, message) => {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
};

// Authentication
const checkAuth = async () => {
    try {
        await apiCall('/auth/verify');
        return true;
    } catch (error) {
        return false;
    }
};

const showLoginPage = () => {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('admin-page').classList.remove('active');
};

const showAdminPage = () => {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('admin-page').classList.add('active');
    loadDashboard();
};

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        authToken = response.token;
        showAdminPage();
    } catch (error) {
        showError('login-error', error.message);
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await apiCall('/auth/logout', { method: 'POST' });
        authToken = null;
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        navigateToPage(page);
    });
});

const navigateToPage = (page) => {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${page}-content`).classList.add('active');

    // Load page data
    currentPage = page;
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'conversations':
            loadSessions();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'knowledge':
            loadDocuments();
            break;
    }
};

// Dashboard
const loadDashboard = async () => {
    try {
        const stats = await apiCall('/dashboard/stats');
        document.getElementById('stat-conversations-today').textContent = stats.conversationsToday;
        document.getElementById('stat-messages-today').textContent = stats.messagesToday;
        document.getElementById('stat-total-messages').textContent = stats.totalMessages;
        document.getElementById('stat-ai-tokens').textContent = stats.aiTokens.toLocaleString();
        document.getElementById('stat-invoiced').textContent = `$${stats.totalInvoiced}`;
        document.getElementById('stat-paid').textContent = `$${stats.totalPaid}`;
        document.getElementById('stat-deals').textContent = stats.dealsInProgress;
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
};

// Conversations
const loadSessions = async () => {
    const sessionsList = document.getElementById('sessions-list');
    sessionsList.innerHTML = '<p class="loading">Loading sessions...</p>';

    try {
        const data = await apiCall('/conversations/sessions?limit=50');
        
        if (data.sessions.length === 0) {
            sessionsList.innerHTML = '<p class="loading">No sessions found.</p>';
            return;
        }

        sessionsList.innerHTML = data.sessions.map(session => `
            <div class="session-item" data-session-id="${escapeHtml(session.id)}">
                <h4>${escapeHtml(session.userName || session.userEmail || 'Guest User')}</h4>
                <p><strong>Session ID:</strong> ${escapeHtml(session.id)}</p>
                <p><strong>Started:</strong> ${escapeHtml(formatDate(session.startedAt))}</p>
                <p><strong>Last Message:</strong> ${escapeHtml(formatDate(session.lastMessageAt))}</p>
                <p><strong>Messages:</strong> ${escapeHtml(String(session.messageCount))}</p>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
                loadSessionDetail(item.dataset.sessionId);
            });
        });
    } catch (error) {
        sessionsList.innerHTML = `<p class="error-message show">Failed to load sessions: ${error.message}</p>`;
    }
};

const loadSessionDetail = async (sessionId) => {
    document.getElementById('sessions-list').style.display = 'none';
    const sessionDetail = document.getElementById('session-detail');
    sessionDetail.style.display = 'block';

    const sessionInfo = document.getElementById('session-info');
    const messagesList = document.getElementById('messages-list');

    sessionInfo.innerHTML = '<p class="loading">Loading session...</p>';
    messagesList.innerHTML = '';

    try {
        const data = await apiCall(`/conversations/sessions/${sessionId}`);
        
        sessionInfo.innerHTML = `
            <p><strong>Session ID:</strong> ${escapeHtml(data.session.id)}</p>
            <p><strong>User:</strong> ${escapeHtml(data.session.userName || data.session.userEmail || 'Guest User')}</p>
            <p><strong>Started:</strong> ${escapeHtml(formatDate(data.session.startedAt))}</p>
            <p><strong>Last Message:</strong> ${escapeHtml(formatDate(data.session.lastMessageAt))}</p>
        `;

        messagesList.innerHTML = data.messages.map(msg => {
            // n8n uses "human" for user messages and "ai" for AI messages
            const messageType = msg.type === 'human' ? 'user' : msg.type;
            const displayType = messageType === 'user' ? 'User' : messageType === 'ai' ? 'AI' : messageType;
            
            return `
                <div class="message ${escapeHtml(messageType)}">
                    <div class="message-type">${escapeHtml(displayType)}</div>
                    <div class="message-content">${escapeHtml(msg.content)}</div>
                    <div class="message-time">${escapeHtml(formatDate(msg.createdAt))}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        sessionInfo.innerHTML = `<p class="error-message show">Failed to load session: ${error.message}</p>`;
    }
};

document.getElementById('back-to-sessions').addEventListener('click', () => {
    document.getElementById('sessions-list').style.display = 'block';
    document.getElementById('session-detail').style.display = 'none';
});

// Settings
const loadSettings = async () => {
    try {
        const settings = await apiCall('/settings');
        document.getElementById('whatsapp_number').value = settings.whatsapp_number || '';
        document.getElementById('phone_number').value = settings.phone_number || '';
        document.getElementById('n8n_url').value = settings.n8n_url || '';
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
};

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const settings = {
        whatsapp_number: document.getElementById('whatsapp_number').value,
        phone_number: document.getElementById('phone_number').value,
        n8n_url: document.getElementById('n8n_url').value,
    };

    try {
        await apiCall('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
        showSuccess('settings-message', 'Settings saved successfully!');
    } catch (error) {
        showError('settings-message', `Failed to save settings: ${error.message}`);
    }
});

// Knowledge Base
const loadDocuments = async () => {
    const documentsList = document.getElementById('documents-list');
    documentsList.innerHTML = '<p class="loading">Loading documents...</p>';

    try {
        const data = await apiCall('/knowledge/documents?limit=100');
        
        if (data.documents.length === 0) {
            documentsList.innerHTML = '<p class="loading">No documents found.</p>';
            return;
        }

        documentsList.innerHTML = data.documents.map(doc => `
            <div class="document-item">
                <div class="document-content">
                    <div class="doc-id">ID: ${escapeHtml(String(doc.id))}</div>
                    <div class="doc-text">${escapeHtml(doc.payload?.text || 'No text content')}</div>
                    <div class="doc-metadata">${escapeHtml(JSON.stringify(doc.payload || {}))}</div>
                </div>
                <button class="btn btn-danger btn-sm delete-doc-btn" data-doc-id="${escapeHtml(String(doc.id))}">Delete</button>
            </div>
        `).join('');
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-doc-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteDocument(btn.dataset.docId));
        });
    } catch (error) {
        documentsList.innerHTML = `<p class="error-message show">Failed to load documents: ${error.message}</p>`;
    }
};

const deleteDocument = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) {
        return;
    }

    try {
        await apiCall(`/knowledge/documents/${id}`, { method: 'DELETE' });
        loadDocuments();
    } catch (error) {
        alert(`Failed to delete document: ${error.message}`);
    }
};

// Upload modal
const uploadModal = document.getElementById('upload-modal');
const uploadBtn = document.getElementById('upload-doc-btn');
const closeModal = document.querySelector('.modal .close');

uploadBtn.addEventListener('click', () => {
    uploadModal.classList.add('active');
});

closeModal.addEventListener('click', () => {
    uploadModal.classList.remove('active');
});

window.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
    }
});

// Toggle between file upload and text input
document.querySelectorAll('input[name="upload-method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const fileGroup = document.getElementById('file-upload-group');
        const textGroup = document.getElementById('text-upload-group');
        const fileInput = document.getElementById('doc-file');
        const textInput = document.getElementById('doc-text');
        
        if (e.target.value === 'file') {
            fileGroup.style.display = 'block';
            textGroup.style.display = 'none';
            fileInput.required = true;
            textInput.required = false;
        } else {
            fileGroup.style.display = 'none';
            textGroup.style.display = 'block';
            fileInput.required = false;
            textInput.required = true;
        }
    });
});

document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadMethod = document.querySelector('input[name="upload-method"]:checked').value;
    const metadataStr = document.getElementById('doc-metadata').value;
    
    let metadata = {};
    if (metadataStr) {
        try {
            metadata = JSON.parse(metadataStr);
        } catch (error) {
            alert('Invalid JSON in metadata field');
            return;
        }
    }

    try {
        let response;
        
        if (uploadMethod === 'file') {
            // File upload
            const fileInput = document.getElementById('doc-file');
            const file = fileInput.files[0];
            
            if (!file) {
                alert('Please select a file');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', JSON.stringify(metadata));
            
            // Use fetch directly for FormData
            const token = localStorage.getItem('token');
            const res = await fetch('/api/knowledge/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || errorData.details || 'Upload failed');
            }
            
            response = await res.json();
        } else {
            // Text upload
            const text = document.getElementById('doc-text').value;
            
            if (!text) {
                alert('Please enter document text');
                return;
            }
            
            response = await apiCall('/knowledge/documents', {
                method: 'POST',
                body: JSON.stringify({ text, metadata }),
            });
        }
        
        uploadModal.classList.remove('active');
        document.getElementById('upload-form').reset();
        alert(`Document uploaded successfully! ${response.chunksUploaded} chunk(s) created.`);
        loadDocuments();
    } catch (error) {
        alert(`Failed to upload document: ${error.message}`);
    }
});

// Initialize
(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        showAdminPage();
    } else {
        showLoginPage();
    }
})();
