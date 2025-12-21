# OQTA Admin Panel Setup

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the `.env` file with your actual values:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `ADMIN_EMAIL`: Admin email (default: admin@oqta.ai)
   - `ADMIN_PASSWORD`: Admin password (set a secure password)
   - `JWT_SECRET`: A secure random string for JWT signing
   - `QDRANT_URL`: Your Qdrant instance URL
   - `QDRANT_API_KEY`: Your Qdrant API key

## Database Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run prisma:generate
```

3. Run database migrations:
```bash
npm run prisma:migrate
```

## Running the Application

### Development Mode
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Production Mode
```bash
npm run build
npm start
```

## Accessing the Admin Panel

1. Open your browser and navigate to `http://localhost:3000/admin`
2. Login with the credentials from your `.env` file:
   - Email: Value of `ADMIN_EMAIL`
   - Password: Value of `ADMIN_PASSWORD`

## Features

### Dashboard
- View statistics for conversations started today
- Track messages sent
- Monitor AI tokens used
- See invoice and payment information

### Conversations
- Browse all user sessions
- View session details with full message history
- Messages displayed in chat format

### Settings
- Configure WhatsApp number for landing page
- Set phone number
- Update n8n URL

### Knowledge Base
- List documents in Qdrant collection
- Upload new documents
- Delete existing documents

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify token

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Conversations
- `GET /api/conversations/sessions` - List all sessions
- `GET /api/conversations/sessions/:sessionId` - Get session details

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update multiple settings

### Knowledge Base
- `GET /api/knowledge/documents` - List documents from Qdrant
- `POST /api/knowledge/documents` - Upload a document
- `DELETE /api/knowledge/documents/:id` - Delete a document

### Chat (Public endpoint for storing conversations)
- `POST /api/chat/message` - Save a chat message

## Integrating with Existing Frontend

To store user conversations from the existing chat interface, update your `script.js` to call the chat API:

```javascript
// After receiving a message from n8n
await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: chatId, // or session_id from your current implementation
    userId: userId,
    userEmail: userEmail,
    userName: userName,
    type: 'user', // or 'ai'
    content: messageContent,
  }),
});
```

## Database Schema

### Tables
- `admin_users` - Admin authentication
- `sessions` - User conversation sessions
- `n8n_chat_histories` - Individual chat messages
- `settings` - Application settings
- `invoices` - Invoice tracking

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check database credentials

### Authentication Issues
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`
- Check browser console for errors
- Clear cookies and try again

### Qdrant Connection Issues
- Verify `QDRANT_URL` and `QDRANT_API_KEY`
- Ensure the collection "oqta" exists
- Check network connectivity to Qdrant
