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
let lastSessionsRefresh = null; // Track when sessions were last refreshed
let previousSessionIds = new Set(); // Track sessions from previous load to detect new ones

// Hamburger menu functionality
const hamburgerMenu = document.getElementById('hamburger-menu');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobile-overlay');

if (hamburgerMenu && sidebar && mobileOverlay) {
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
    });

    mobileOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        mobileOverlay.classList.remove('active');
    });

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    });
}

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
        case 'customers':
            loadCustomers();
            break;
        case 'billing':
            loadInvoices();
            break;
        case 'free-zones':
            loadFreeZones();
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
let currentSessionsPage = 1;
let totalSessionsPages = 1;

// Update the timestamp display
const updateLastRefreshTimestamp = () => {
    const timestampEl = document.getElementById('sessions-last-updated');
    if (timestampEl && lastSessionsRefresh) {
        const now = new Date();
        const diffSeconds = Math.floor((now - lastSessionsRefresh) / 1000);
        
        let timeText;
        if (diffSeconds < 60) {
            timeText = 'just now';
        } else if (diffSeconds < 3600) {
            const minutes = Math.floor(diffSeconds / 60);
            timeText = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            const hours = Math.floor(diffSeconds / 3600);
            timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
        
        timestampEl.textContent = `Last updated: ${timeText}`;
    }
};

const loadSessions = async (append = false) => {
    const sessionsList = document.getElementById('sessions-list');
    
    if (!append) {
        sessionsList.innerHTML = '<p class="loading">Loading sessions...</p>';
        currentSessionsPage = 1;
    }

    try {
        const data = await apiCall(`/conversations/sessions?page=${currentSessionsPage}&limit=10`);
        
        if (data.sessions.length === 0 && currentSessionsPage === 1) {
            sessionsList.innerHTML = '<p class="loading">No sessions found.</p>';
            return;
        }

        totalSessionsPages = data.totalPages;
        
        // Track which sessions are new
        const currentSessionIds = new Set(data.sessions.map(s => s.id));
        const newSessionIds = new Set();
        
        if (!append && previousSessionIds.size > 0) {
            // Detect new sessions that weren't in the previous load
            for (const id of currentSessionIds) {
                if (!previousSessionIds.has(id)) {
                    newSessionIds.add(id);
                }
            }
        }
        
        // Update the previous sessions set for next comparison
        if (!append) {
            previousSessionIds = currentSessionIds;
        }

        const sessionsHTML = data.sessions.map(session => {
            const hasSummary = session.summary !== null;
            const isNew = newSessionIds.has(session.id);
            const summaryHTML = hasSummary ? `
                <div class="session-summary">
                    <p><strong>Customer:</strong> ${escapeHtml(session.summary.customerName || 'Unknown')}</p>
                    <p><strong>Summary:</strong> ${escapeHtml(session.summary.summary)}</p>
                    <p><strong>Next Action:</strong> ${escapeHtml(session.summary.nextAction || 'N/A')}</p>
                </div>
            ` : '';

            return `
                <div class="session-item ${isNew ? 'session-new' : ''}" data-session-id="${escapeHtml(session.id)}">
                    ${isNew ? '<div class="new-badge">NEW</div>' : ''}
                    <div class="session-header">
                        <h4>${escapeHtml(session.userName || session.userEmail || 'Guest User')}</h4>
                        <div class="session-actions">
                            <button class="btn btn-small btn-summary" data-session-id="${escapeHtml(session.id)}" onclick="generateSessionSummary('${escapeHtml(session.id)}'); event.stopPropagation();">
                                ${hasSummary ? '🔄 Refresh Summary' : '✨ AI Summary'}
                            </button>
                            <button class="btn btn-small btn-export" data-session-id="${escapeHtml(session.id)}" onclick="exportToGoogleSheets('${escapeHtml(session.id)}'); event.stopPropagation();">
                                📊 Copy to Google Sheets
                            </button>
                        </div>
                    </div>
                    <p><strong>Session ID:</strong> ${escapeHtml(session.id)}</p>
                    <p><strong>Started:</strong> ${escapeHtml(formatDate(session.startedAt))}</p>
                    <p><strong>Last Message:</strong> ${escapeHtml(formatDate(session.lastMessageAt))}</p>
                    <p><strong>Messages:</strong> ${escapeHtml(String(session.messageCount))}</p>
                    ${summaryHTML}
                </div>
            `;
        }).join('');

        if (append) {
            // Remove the "Show More" button if it exists
            const showMoreBtn = sessionsList.querySelector('.show-more-btn');
            if (showMoreBtn) {
                showMoreBtn.remove();
            }
            sessionsList.insertAdjacentHTML('beforeend', sessionsHTML);
        } else {
            sessionsList.innerHTML = sessionsHTML;
        }

        // Add "Show More" button if there are more pages
        if (currentSessionsPage < totalSessionsPages) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'btn btn-secondary show-more-btn';
            showMoreBtn.textContent = 'Show More';
            showMoreBtn.style.marginTop = '20px';
            showMoreBtn.style.width = '100%';
            showMoreBtn.onclick = () => {
                currentSessionsPage++;
                loadSessions(true);
            };
            sessionsList.appendChild(showMoreBtn);
        }

        // Add click handlers to session items (not buttons)
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (!e.target.classList.contains('btn')) {
                    loadSessionDetail(item.dataset.sessionId);
                }
            });
        });
        
        // Update the last refresh timestamp
        if (!append) {
            lastSessionsRefresh = new Date();
            updateLastRefreshTimestamp();
        }
    } catch (error) {
        sessionsList.innerHTML = `<p class="error-message show">Failed to load sessions: ${error.message}</p>`;
    }
};

const loadSessionDetail = async (sessionId, silentRefresh = false) => {
    document.getElementById('sessions-list').style.display = 'none';
    const sessionDetail = document.getElementById('session-detail');
    sessionDetail.style.display = 'block';
    sessionDetail.dataset.sessionId = sessionId; // Store for auto-refresh

    const sessionInfo = document.getElementById('session-info');
    const messagesList = document.getElementById('messages-list');

    if (!silentRefresh) {
        sessionInfo.innerHTML = '<p class="loading">Loading session...</p>';
        messagesList.innerHTML = '';
    }

    try {
        const data = await apiCall(`/conversations/sessions/${sessionId}`);
        
        const summaryHTML = data.summary ? `
            <div class="summary-card">
                <h3>AI Summary</h3>
                <p><strong>Customer Name:</strong> ${escapeHtml(data.summary.customerName || 'Unknown')}</p>
                <p><strong>Summary:</strong> ${escapeHtml(data.summary.summary)}</p>
                <p><strong>Next Action:</strong> ${escapeHtml(data.summary.nextAction || 'N/A')}</p>
                <p class="summary-date"><small>Generated: ${escapeHtml(formatDate(data.summary.createdAt))}</small></p>
            </div>
        ` : '';

        sessionInfo.innerHTML = `
            <p><strong>Session ID:</strong> ${escapeHtml(data.session.id)}</p>
            <p><strong>User:</strong> ${escapeHtml(data.session.userName || data.session.userEmail || 'Guest User')}</p>
            <p><strong>Started:</strong> ${escapeHtml(formatDate(data.session.startedAt))}</p>
            <p><strong>Last Message:</strong> ${escapeHtml(formatDate(data.session.lastMessageAt))}</p>
            ${summaryHTML}
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
        if (!silentRefresh) {
            sessionInfo.innerHTML = `<p class="error-message show">Failed to load session: ${error.message}</p>`;
        }
    }
};

document.getElementById('back-to-sessions').addEventListener('click', () => {
    document.getElementById('sessions-list').style.display = 'block';
    document.getElementById('session-detail').style.display = 'none';
});

// Add refresh button event listener
document.getElementById('refresh-sessions-btn')?.addEventListener('click', () => {
    loadSessions(false);
});

// Update timestamp display periodically
setInterval(() => {
    if (currentPage === 'conversations') {
        updateLastRefreshTimestamp();
    }
}, 10000); // Update every 10 seconds

// Settings
const loadSettings = async () => {
    try {
        const settings = await apiCall('/settings');
        document.getElementById('whatsapp_number').value = settings.whatsapp_number || '';
        document.getElementById('phone_number').value = settings.phone_number || '';
        document.getElementById('n8n_url').value = settings.n8n_url || '';
        document.getElementById('n8n_sheets_url').value = settings.n8n_sheets_url || '';
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
        n8n_sheets_url: document.getElementById('n8n_sheets_url').value,
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
        const data = await apiCall('/knowledge/documents?limit=1000');
        
        if (data.documents.length === 0) {
            documentsList.innerHTML = '<p class="loading">No documents found.</p>';
            return;
        }

        // Group documents by filename
        const documentsByFile = {};
        data.documents.forEach(doc => {
            const filename = doc.payload?.filename || 'Unknown';
            if (!documentsByFile[filename]) {
                documentsByFile[filename] = {
                    filename,
                    chunks: [],
                    totalChunks: doc.payload?.totalChunks || 0,
                    uploadedAt: doc.payload?.uploadedAt
                };
            }
            documentsByFile[filename].chunks.push(doc);
        });

        // Display grouped by file
        documentsList.innerHTML = Object.values(documentsByFile).map(file => {
            const chunkCount = file.chunks.length;
            const totalChunks = file.totalChunks || chunkCount;
            const uploadDate = file.uploadedAt ? formatDate(file.uploadedAt) : 'Unknown';
            
            return `
                <div class="document-group">
                    <div class="document-header">
                        <h4>${escapeHtml(file.filename)}</h4>
                        <div class="document-meta">
                            <span class="chunk-info">${chunkCount} chunk${chunkCount !== 1 ? 's' : ''} ${totalChunks > chunkCount ? `of ${totalChunks}` : ''}</span>
                            <span class="upload-date">Uploaded: ${uploadDate}</span>
                        </div>
                        <button class="btn btn-danger btn-sm delete-file-btn" data-filename="${escapeHtml(file.filename)}">Delete All</button>
                    </div>
                    <details class="document-chunks">
                        <summary>View chunks</summary>
                        <div class="chunks-list">
                            ${file.chunks.map((doc, idx) => {
                                const chunkText = doc.payload?.text || 'No text content';
                                const cleanText = chunkText.length > 200 ? chunkText.substring(0, 200) + '...' : chunkText;
                                const chunkIndex = doc.payload?.chunkIndex !== undefined ? doc.payload.chunkIndex : idx;
                                
                                return `
                                    <div class="chunk-item">
                                        <div class="chunk-header">
                                            <span class="chunk-number">Chunk #${chunkIndex + 1}</span>
                                            <button class="btn btn-danger btn-xs delete-chunk-btn" data-doc-id="${escapeHtml(String(doc.id))}">Delete</button>
                                        </div>
                                        <div class="chunk-text">${escapeHtml(cleanText)}</div>
                                        <div class="chunk-id">ID: ${escapeHtml(String(doc.id))}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </details>
                </div>
            `;
        }).join('');
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-chunk-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteDocument(btn.dataset.docId));
        });
        
        document.querySelectorAll('.delete-file-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteFile(btn.dataset.filename));
        });
    } catch (error) {
        documentsList.innerHTML = `<p class="error-message show">Failed to load documents: ${error.message}</p>`;
    }
};

const deleteFile = async (filename) => {
    if (!confirm(`Are you sure you want to delete all chunks of "${filename}"?`)) {
        return;
    }

    try {
        const data = await apiCall('/knowledge/documents?limit=1000');
        const chunks = data.documents.filter(doc => doc.payload?.filename === filename);
        
        // Delete all chunks
        await Promise.all(chunks.map(chunk => 
            apiCall(`/knowledge/documents/${chunk.id}`, { method: 'DELETE' })
        ));
        
        loadDocuments();
    } catch (error) {
        alert(`Failed to delete file: ${error.message}`);
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

// Customers Page
const loadCustomers = async () => {
    const customersList = document.getElementById('customers-list');
    customersList.innerHTML = '<p class="loading">Loading customers...</p>';
    
    try {
        const data = await apiCall('/customers');
        
        if (data.customers.length === 0) {
            customersList.innerHTML = '<p class="no-data">No customers found.</p>';
            return;
        }
        
        customersList.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Company</th>
                        <th>Sessions</th>
                        <th>Invoices</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.customers.map(customer => `
                        <tr>
                            <td>${escapeHtml(customer.name)}</td>
                            <td>${escapeHtml(customer.email || '-')}</td>
                            <td>${escapeHtml(customer.phone || '-')}</td>
                            <td>${escapeHtml(customer.company || '-')}</td>
                            <td>${customer._count.sessions}</td>
                            <td>${customer._count.invoices}</td>
                            <td>${formatDate(customer.createdAt)}</td>
                            <td>
                                <button class="btn btn-small" onclick="viewCustomer('${customer.id}')">View</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        customersList.innerHTML = `<p class="error-message show">Failed to load customers: ${error.message}</p>`;
    }
};

// Billing Page  
const loadInvoices = async () => {
    const invoicesList = document.getElementById('invoices-list');
    invoicesList.innerHTML = '<p class="loading">Loading invoices...</p>';
    
    try {
        const statusFilter = document.getElementById('invoice-status-filter')?.value || '';
        const params = statusFilter ? `?status=${statusFilter}` : '';
        const data = await apiCall(`/billing${params}`);
        
        if (data.invoices.length === 0) {
            invoicesList.innerHTML = '<p class="no-data">No invoices found.</p>';
            return;
        }
        
        invoicesList.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.invoices.map(invoice => `
                        <tr>
                            <td>${escapeHtml(invoice.invoiceNumber)}</td>
                            <td>${invoice.customer ? escapeHtml(invoice.customer.name) : '-'}</td>
                            <td>${invoice.amount} ${invoice.currency}</td>
                            <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                            <td>${invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                            <td>${formatDate(invoice.createdAt)}</td>
                            <td>
                                ${invoice.status === 'draft' ? `<button class="btn btn-small btn-primary" onclick="sendInvoice('${invoice.id}')">Send Invoice</button>` : ''}
                                <button class="btn btn-small" onclick="viewInvoice('${invoice.id}')">View</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        invoicesList.innerHTML = `<p class="error-message show">Failed to load invoices: ${error.message}</p>`;
    }
};

const sendInvoice = async (invoiceId) => {
    if (!confirm('Are you sure you want to send this invoice to the customer?')) {
        return;
    }
    
    try {
        await apiCall(`/billing/${invoiceId}/send`, { method: 'POST' });
        alert('Invoice sent successfully!');
        loadInvoices();
    } catch (error) {
        alert(`Failed to send invoice: ${error.message}`);
    }
};

// Free Zones Page
const loadFreeZones = async () => {
    const freeZonesList = document.querySelector('#free-zones-list .free-zones-grid');
    freeZonesList.innerHTML = '<p class="loading">Loading free zone integrations...</p>';
    
    try {
        const data = await apiCall('/free-zones');
        
        if (data.freeZones.length === 0) {
            freeZonesList.innerHTML = '<p class="no-data">No free zone integrations configured yet.</p>';
            return;
        }
        
        freeZonesList.innerHTML = data.freeZones.map(fz => `
            <div class="free-zone-card">
                <div class="free-zone-header">
                    <h3>${escapeHtml(fz.name)}</h3>
                    <span class="status-badge ${fz.isActive ? 'status-active' : 'status-inactive'}">
                        ${fz.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="free-zone-details">
                    <p><strong>Code:</strong> ${escapeHtml(fz.code)}</p>
                    <p><strong>API Endpoint:</strong> ${fz.apiEndpoint ? escapeHtml(fz.apiEndpoint.substring(0, 50)) + '...' : 'Not configured'}</p>
                    <p><strong>Last Updated:</strong> ${formatDate(fz.updatedAt)}</p>
                </div>
                <div class="free-zone-actions">
                    <button class="btn btn-small" onclick="editFreeZone('${fz.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteFreeZone('${fz.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        freeZonesList.innerHTML = `<p class="error-message show">Failed to load free zones: ${error.message}</p>`;
    }
};

const deleteFreeZone = async (freeZoneId) => {
    if (!confirm('Are you sure you want to delete this free zone integration?')) {
        return;
    }
    
    try {
        await apiCall(`/free-zones/${freeZoneId}`, { method: 'DELETE' });
        alert('Free zone integration deleted successfully!');
        loadFreeZones();
    } catch (error) {
        alert(`Failed to delete: ${error.message}`);
    }
};

// Event listeners for new features
document.getElementById('invoice-status-filter')?.addEventListener('change', () => {
    loadInvoices();
});

// Function to generate AI summary for a session
const generateSessionSummary = async (sessionId) => {
    try {
        const btn = document.querySelector(`button[data-session-id="${sessionId}"].btn-summary`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Generating...';
        }

        const data = await apiCall(`/conversations/sessions/${sessionId}/summary`, {
            method: 'POST',
        });

        if (data.summary) {
            alert(`Summary generated successfully!\n\nCustomer: ${data.summary.customerName}\nSummary: ${data.summary.summary}\nNext Action: ${data.summary.nextAction}`);
            // Reload sessions to show the new summary
            loadSessions(false);
        }
    } catch (error) {
        alert(`Failed to generate summary: ${error.message}`);
    } finally {
        const btn = document.querySelector(`button[data-session-id="${sessionId}"].btn-summary`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = '✨ AI Summary';
        }
    }
};

// Function to export conversation to Google Sheets
const exportToGoogleSheets = async (sessionId) => {
    console.log('Export to Google Sheets triggered for session:', sessionId);
    
    try {
        const btn = document.querySelector(`button[data-session-id="${sessionId}"].btn-export`);
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Exporting...';
        }

        const data = await apiCall(`/conversations/sessions/${sessionId}/export-to-sheets`, {
            method: 'POST',
        });

        console.log('Export to Google Sheets response:', data);
        
        if (data.success) {
            alert(`✓ ${data.message}`);
        }
    } catch (error) {
        console.error('Failed to export to Google Sheets:', error);
        alert(`Failed to export: ${error.message}`);
    } finally {
        const btn = document.querySelector(`button[data-session-id="${sessionId}"].btn-export`);
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📊 Copy to Google Sheets';
        }
    }
};

// Make functions globally available
window.generateSessionSummary = generateSessionSummary;
window.exportToGoogleSheets = exportToGoogleSheets;

// Add "Link to Customer" button in conversation detail
const originalLoadSessionDetail = loadSessionDetail;
loadSessionDetail = async (sessionId, silentRefresh = false) => {
    await originalLoadSessionDetail(sessionId, silentRefresh);
    
    if (!silentRefresh) {
        const sessionInfo = document.getElementById('session-info');
        const linkButton = document.createElement('button');
        linkButton.className = 'btn btn-secondary';
        linkButton.textContent = '🔗 Link to Customer';
        linkButton.style.marginTop = '10px';
        linkButton.onclick = () => {
            // TODO: Show modal to select/create customer and link this session
            alert('Link to customer feature - UI to be implemented');
        };
        sessionInfo.appendChild(linkButton);
    }
};

// Initialize
(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        showAdminPage();
    } else {
        showLoginPage();
    }
})();
