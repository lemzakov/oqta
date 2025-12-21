# OQTA AI - n8n Integration

## Overview

This is a single-page chat application that integrates with n8n for AI-powered conversations about UAE company registration.

## Features

- **Single Page Application**: No authentication required - users can start chatting immediately
- **Session Persistence**: Conversation history is stored in browser's localStorage
- **Welcome Back**: Returning users see their previous conversations automatically
- **n8n Integration**: All chat messages are sent to n8n webhook for AI processing
- **Multi-language Support**: Language selector with 6 languages (English, Arabic, Russian, Chinese, Hindi, Urdu)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## n8n Webhook Configuration

### Endpoint Setup

The application is configured to use the n8n webhook at:
`https://lemzakov.app.n8n.cloud/webhook/44d1ca27-d30f-4088-841b-0853846bb000`

This URL is hardcoded in `script.js` for simplicity. To use a different endpoint, update the `N8N_WEBHOOK_URL` constant in the script.

### Expected Request Format

The application sends POST requests to the n8n webhook with the following JSON structure:

```json
{
  "systemPrompt": "User's message here",
  "user_id": "0856b2d6-2afb-4718-84a0-67e20dc58e07",
  "user_email": "guest@oqta.ai",
  "user_name": "Guest User",
  "user_role": "user",
  "chat_id": "47ed97d6-b7fb-4248-91d8-8f32a76ffdc6",
  "message_id": "12077a93-6a27-46ac-915c-4fce0d64eb28",
  "chatInput": "User's message here"
}
```

**Field Descriptions:**
- `systemPrompt`: The user's message/question
- `user_id`: Unique user ID (UUID, persists across sessions)
- `user_email`: User email (default: "guest@oqta.ai" for anonymous users)
- `user_name`: User name (default: "Guest User" for anonymous users)
- `user_role`: User role (default: "user")
- `chat_id`: Unique chat/conversation ID (UUID, resets on "New Chat")
- `message_id`: Unique message ID (UUID, generated for each message)
- `chatInput`: The user's message/question (same as systemPrompt)

### Expected Response Format

Your n8n workflow should return a JSON response with one of these formats:

```json
{
  "response": "AI assistant's response here"
}
```

or

```json
{
  "message": "AI assistant's response here"
}
```

## Session Management

- **User ID**: Unique UUID generated on first visit, stored in localStorage as `oqta_user_id`, persists across sessions
- **Chat ID**: Unique UUID for each conversation, stored in localStorage as `oqta_chat_id`, resets on "New Chat"
- **Session ID**: Legacy identifier, stored in localStorage as `oqta_session_id`
- **Conversation History**: Stored in localStorage as `oqta_conversation`
- **Language Preference**: Stored in localStorage as `oqta_language`
- **New Chat**: Users can start a fresh conversation using the "New Chat" button (generates new chat_id)

## User Experience Flow

### First-time User
1. User lands on the homepage with registration information
2. User types a message and clicks send
3. Conversation area appears with the chat interface
4. Messages are sent to n8n and responses are displayed

### Returning User
1. User opens the page and sees "Welcome Back!" message
2. Previous conversation is automatically loaded
3. User can continue the conversation or start a new chat

## Local Development

1. Start a local server:
```bash
python3 -m http.server 8080
```

2. Open `http://localhost:8080` in your browser

3. For testing without n8n, the app will show a fallback error message

## Customization

### Messages
Edit these constants in `script.js`:
- `WELCOME_MESSAGE`: Initial greeting for new users
- `WELCOME_BACK_MESSAGE`: Greeting for returning users

### Styling
- `styles.css`: All visual styling
- Responsive breakpoints at 768px and 480px

### n8n Endpoint
Update `N8N_WEBHOOK_URL` in `script.js` to point to your n8n webhook

## Browser Support

- Modern browsers with localStorage support
- JavaScript must be enabled
- Cookies/localStorage must not be blocked

## Notes

- All data is stored locally in the user's browser
- No server-side session management required
- Session persists across page refreshes
- Conversation history is cleared when user clicks "New Chat"
