# n8n Integration Guide

## Overview

The OQTA application integrates with n8n for AI chat processing. The `n8n_chat_histories` table is **managed exclusively by n8n** - the frontend and admin panel only READ from this table, never write to it.

## Database Schema

### n8n_chat_histories Table

```sql
CREATE TABLE n8n_chat_histories (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    message JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Managed by:** n8n workflow
**Read by:** Admin panel (via `/api/conversations/sessions/:sessionId` endpoint)
**Written by:** n8n workflow only (NOT by frontend or admin API)

### Message Format

n8n stores messages in JSONB format with the following structure:

#### User Message (type: "human")
```json
{
  "type": "human",
  "content": "hi",
  "additional_kwargs": {},
  "response_metadata": {}
}
```

#### AI Message (type: "ai")
```json
{
  "type": "ai",
  "content": "Hello! I'm Leen, I help with UAE company registration and licensing. What kind of business are you looking to set up, and what's your name?",
  "tool_calls": [],
  "additional_kwargs": {},
  "response_metadata": {},
  "invalid_tool_calls": []
}
```

## Frontend Flow

### 1. User Sends Message

```javascript
// script.js - sendMessage() function
// User message is added to localStorage only
addMessageToConversationArea('user', message);

// Message is sent to n8n webhook
const aiResponse = await sendToN8N(message);

// AI response is added to localStorage only
addMessageToConversationArea('assistant', aiResponse);
```

**Key Points:**
- Frontend does NOT write to database
- Messages are stored in localStorage for UI persistence
- n8n webhook receives the message and processes it
- n8n is responsible for writing BOTH user and AI messages to `n8n_chat_histories`

### 2. n8n Webhook Payload

```json
{
  "systemPrompt": "I want to register company",
  "user_id": "uuid-here",
  "user_email": "guest@oqta.ai",
  "user_name": "Guest User",
  "user_role": "guest",
  "chat_id": "session-uuid-here",
  "message_id": "message-uuid-here",
  "chatInput": "user message text"
}
```

### 3. n8n Workflow Responsibilities

The n8n workflow must:
1. **Process the user message** with AI
2. **Write the user message** to `n8n_chat_histories`:
   ```sql
   INSERT INTO n8n_chat_histories (session_id, message) 
   VALUES (
     'session-uuid',
     '{"type": "human", "content": "user message", "additional_kwargs": {}, "response_metadata": {}}'
   );
   ```
3. **Write the AI response** to `n8n_chat_histories`:
   ```sql
   INSERT INTO n8n_chat_histories (session_id, message) 
   VALUES (
     'session-uuid',
     '{"type": "ai", "content": "AI response", "tool_calls": [], "additional_kwargs": {}, "response_metadata": {}, "invalid_tool_calls": []}'
   );
   ```
4. **Return the AI response** to the frontend

## Sessions Table

### Purpose

The `sessions` table links user sessions to their chat history and is managed by the application (not n8n).

```sql
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW()
);
```

**Managed by:** Application (optional - for admin panel organization)
**Purpose:** Track user sessions and link to messages in `n8n_chat_histories` via `session_id`

## Admin Panel

### Reading Messages

The admin panel reads messages from `n8n_chat_histories`:

```javascript
// GET /api/conversations/sessions/:sessionId
// Returns messages in chronological order
{
  "session": {
    "id": "session-uuid",
    "userId": "user-uuid",
    "userEmail": "guest@oqta.ai",
    "userName": "Guest User",
    "startedAt": "2024-12-22T08:00:00Z",
    "lastMessageAt": "2024-12-22T08:05:00Z"
  },
  "messages": [
    {
      "id": 1,
      "type": "human",  // n8n format
      "content": "hi",
      "createdAt": "2024-12-22T08:01:00Z",
      "toolCalls": [],
      "additionalKwargs": {},
      "responseMetadata": {},
      "invalidToolCalls": []
    },
    {
      "id": 2,
      "type": "ai",  // n8n format
      "content": "Hello! I'm Leen...",
      "createdAt": "2024-12-22T08:01:05Z",
      "toolCalls": [],
      "additionalKwargs": {},
      "responseMetadata": {},
      "invalidToolCalls": []
    }
  ]
}
```

### Message Type Mapping

The admin panel handles n8n's message types:
- `"human"` → displayed as "User"
- `"ai"` → displayed as "AI"

## Session Management

### New Chat Flow

When user clicks "New Chat":
1. Generate new `chat_id` (UUID)
2. Keep existing `user_id` (persistent across sessions)
3. Clear localStorage
4. Reload page
5. Fresh session starts with new `chat_id`

```javascript
// script.js - clearBtn event handler
const newChatId = generateUUID();
localStorage.setItem(CHAT_ID_KEY, newChatId);
localStorage.removeItem(CONVERSATION_KEY);
window.location.reload();
```

## Language Detection

### Browser Language Auto-Detection

On first visit, the application detects the browser language:

```javascript
const browserLang = navigator.language; // e.g., "en-US", "ar-SA", "ru-RU"

// Map to supported languages
const supportedLanguages = {
  'en': 'English',
  'ar': 'العربية',
  'ru': 'Русский',
  'zh': '中文',
  'hi': 'हिन्दी',
  'ur': 'اردو'
};
```

Language preference is saved to localStorage and can be sent to n8n for localized responses.

## Important Notes

### ✅ DO
- Read from `n8n_chat_histories` in admin panel
- Link sessions to messages via `session_id`
- Store UI state in localStorage
- Send messages to n8n webhook
- Let n8n handle all database writes to `n8n_chat_histories`

### ❌ DON'T
- Write to `n8n_chat_histories` from frontend
- Write to `n8n_chat_histories` from admin API
- Modify existing messages
- Delete messages (managed by n8n or database admin)

## Troubleshooting

### Messages Not Appearing in Admin Panel

1. **Check n8n workflow** - Ensure it's writing to `n8n_chat_histories`
2. **Verify session_id** - Must match between frontend and n8n
3. **Check message format** - Must be valid JSONB with `type` and `content` fields
4. **Database connection** - Verify n8n can connect to PostgreSQL

### Session Not Found

1. **Check sessions table** - May need to be created manually or by n8n
2. **Verify session_id** - UUID format required
3. **Check database** - Ensure `sessions` table exists

## Example n8n Workflow Nodes

### 1. Webhook Node (Trigger)
- Receives payload from frontend
- Extracts: `chat_id`, `user_id`, `chatInput`, etc.

### 2. AI Chat Node
- Processes user message
- Generates AI response

### 3. PostgreSQL Node #1 (Write User Message)
```sql
INSERT INTO n8n_chat_histories (session_id, message)
VALUES (
  $1,
  $2::jsonb
)
```
Parameters:
- `$1` = `chat_id`
- `$2` = `{"type": "human", "content": "<user message>", ...}`

### 4. PostgreSQL Node #2 (Write AI Message)
```sql
INSERT INTO n8n_chat_histories (session_id, message)
VALUES (
  $1,
  $2::jsonb
)
```
Parameters:
- `$1` = `chat_id`
- `$2` = `{"type": "ai", "content": "<AI response>", ...}`

### 5. Response Node
Returns AI response to frontend as JSON:
```json
{
  "output": "AI response text here"
}
```

## Summary

| Component | Reads n8n_chat_histories | Writes n8n_chat_histories |
|-----------|--------------------------|---------------------------|
| Frontend (script.js) | ❌ No | ❌ No |
| Admin Panel | ✅ Yes | ❌ No |
| Admin API | ✅ Yes | ❌ No |
| n8n Workflow | ✅ Optional | ✅ Yes (Only) |
| Database Admin | ✅ Yes | ✅ Yes (maintenance) |

The `n8n_chat_histories` table is the single source of truth for all chat messages and is managed exclusively by n8n.
