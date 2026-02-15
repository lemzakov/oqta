# Telegram Bot Integration Guide

## Overview

The OQTA application now includes a Telegram bot integration that allows users to request conversation summaries via inline keyboard callbacks. When a user presses a button with a session ID, the bot generates a summary using OpenAI and sends it back to the user.

## Features

- **Webhook Handler**: Receives inline keyboard callback queries from Telegram
- **Automatic Summary Generation**: Generates conversation summaries using OpenAI GPT-4 mini
- **Smart Caching**: Returns cached summaries if already generated
- **Formatted Messages**: Sends well-formatted HTML messages with customer name, summary, and next actions
- **Session Validation**: Validates UUID format for session IDs

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure Environment Variables

Add your Telegram bot token to the `.env` file:

```bash
TELEGRAM_BOT_TOKEN="your-telegram-bot-token-here"
```

Make sure you also have the OpenAI API key configured:

```bash
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

### 3. Set Up Webhook

After deploying your application, you need to configure the Telegram webhook to point to your server.

#### Option A: Using the Admin API (Recommended)

```bash
POST /api/telegram/set-webhook
Authorization: Bearer <your-admin-jwt-token>
Content-Type: application/json

{
  "webhookUrl": "https://your-domain.com/api/telegram/webhook"
}
```

Example with curl:

```bash
curl -X POST https://your-domain.com/api/telegram/set-webhook \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-domain.com/api/telegram/webhook"}'
```

#### Option B: Using Telegram API Directly

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### 4. Verify Webhook Status

Check if the webhook is configured correctly:

```bash
GET /api/telegram/webhook-info
Authorization: Bearer <your-admin-jwt-token>
```

Or directly via Telegram API:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Usage

### Inline Keyboard Callback Format

When creating inline keyboard buttons in your Telegram bot, use one of these callback data formats:

1. **Simple format**: Just the session ID
   ```
   callback_data: "f47c8118-978f-491e-a770-69389076b567"
   ```

2. **Prefixed format**: With "summary:" prefix
   ```
   callback_data: "summary:f47c8118-978f-491e-a770-69389076b567"
   ```

### Example: Creating an Inline Keyboard

Here's an example of how to send a message with an inline keyboard button that triggers the summary:

```python
import telegram
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

bot = telegram.Bot(token="YOUR_BOT_TOKEN")

# Session ID from your database
session_id = "f47c8118-978f-491e-a770-69389076b567"

# Create inline keyboard
keyboard = [
    [InlineKeyboardButton("📊 Get Summary", callback_data=f"summary:{session_id}")]
]
reply_markup = InlineKeyboardMarkup(keyboard)

# Send message
bot.send_message(
    chat_id=chat_id,
    text="Your conversation has been recorded. Click below to get a summary:",
    reply_markup=reply_markup
)
```

### Response Format

When a user clicks the button, they will receive a formatted message like this:

```
📊 Conversation Summary

Customer: John Doe

Summary:
Customer inquired about company registration in Dubai Free Zone. 
Discussed IFZA and DMCC options, including setup costs and timeline.

Next Action:
Send detailed quote for IFZA package and schedule follow-up call.

📝 Note: This is a cached summary
```

## API Endpoints

### Public Endpoints

#### POST /api/telegram/webhook
Handles incoming webhook requests from Telegram.

**Request Body**: Telegram Update object
- Callback query with session ID
- Regular messages (optional handling)

**Response**: JSON with success status

### Protected Endpoints (Require Admin Authentication)

#### POST /api/telegram/set-webhook
Configure the Telegram webhook URL.

**Request Body**:
```json
{
  "webhookUrl": "https://your-domain.com/api/telegram/webhook"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook set successfully",
  "webhookUrl": "https://your-domain.com/api/telegram/webhook",
  "result": { ... }
}
```

#### GET /api/telegram/webhook-info
Get current webhook configuration and status.

**Response**: Telegram WebhookInfo object

## How It Works

### Flow Diagram

```
User clicks inline keyboard button
    ↓
Telegram sends callback_query to webhook
    ↓
OQTA receives webhook request
    ↓
Extract session ID from callback_data
    ↓
Validate session ID (UUID format)
    ↓
Check if summary exists in database
    ↓
If not exists: Generate using OpenAI GPT-4 mini
    ↓
Format summary message (HTML)
    ↓
Send message via Telegram Bot API
    ↓
User receives formatted summary
```

### Summary Generation

The summary generation uses the same logic as the admin panel:

1. **Retrieve conversation**: Fetch all messages for the session ID
2. **Format for AI**: Convert messages to role-based format (user/assistant)
3. **Generate summary**: Use OpenAI GPT-4 mini with structured output
4. **Extract information**:
   - Customer name (if mentioned)
   - Brief summary (2-3 sentences)
   - Next action/follow-up needed
5. **Cache result**: Save to database for future requests

## Error Handling

The bot handles various error scenarios:

- **Invalid session ID**: Returns error message to user
- **Session not found**: Returns error message to user
- **OpenAI API failure**: Returns error message to user
- **Telegram API failure**: Logs error and returns 500 status
- **Missing configuration**: Returns appropriate error response

## Security Considerations

1. **Webhook URL**: Use HTTPS for production
2. **Session ID Validation**: Only accepts valid UUID format
3. **Admin Endpoints**: Protected with JWT authentication
4. **Rate Limiting**: Consider adding rate limiting for webhook endpoint
5. **Token Security**: Keep `TELEGRAM_BOT_TOKEN` secret

## Troubleshooting

### Webhook not receiving updates

1. Check webhook status:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. Verify webhook URL is accessible (HTTPS required for production)

3. Check server logs for incoming requests

### Messages not being sent

1. Verify `TELEGRAM_BOT_TOKEN` is correctly set
2. Check bot has permission to send messages to the chat
3. Review server logs for Telegram API errors

### Summaries not generating

1. Verify `OPENAI_API_KEY` is configured
2. Check session exists in database
3. Review OpenAI API quota and limits

## Development and Testing

### Local Testing with ngrok

For local development, use ngrok to create a public URL:

```bash
# Start your local server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL to set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-ngrok-url.ngrok.io/api/telegram/webhook"
```

### Testing the Webhook

You can test the webhook manually using curl:

```bash
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 123456789,
    "callback_query": {
      "id": "query_id",
      "from": {
        "id": 12345678,
        "first_name": "Test",
        "username": "testuser"
      },
      "message": {
        "message_id": 123,
        "chat": {
          "id": 12345678,
          "type": "private"
        }
      },
      "data": "summary:f47c8118-978f-491e-a770-69389076b567"
    }
  }'
```

## Production Deployment

### Vercel Deployment

The Telegram webhook endpoint is automatically deployed with your application on Vercel.

1. Set environment variable in Vercel dashboard:
   ```
   TELEGRAM_BOT_TOKEN=your-token-here
   ```

2. After deployment, set the webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://your-vercel-app.vercel.app/api/telegram/webhook"
   ```

### Health Check

The application includes a health check endpoint that you can use to monitor the service:

```bash
GET /api/health
```

This returns the status of the API and database connection.

## Future Enhancements

Possible improvements for future versions:

- [ ] Add rate limiting for webhook endpoint
- [ ] Support for custom summary prompts
- [ ] Multi-language support for summaries
- [ ] Inline query support for searching sessions
- [ ] Direct message handling for interactive commands
- [ ] Analytics for bot usage
- [ ] Support for group chats
- [ ] Custom keyboard layouts for different actions
