# Telegram Bot Quick Start

## Setup (5 minutes)

### 1. Get Bot Token
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy your bot token

### 2. Configure Environment
Add to `.env`:
```bash
TELEGRAM_BOT_TOKEN="your-bot-token-here"
OPENAI_API_KEY="sk-your-openai-api-key"
```

### 3. Deploy Application
```bash
npm run build
npm start
```

### 4. Set Webhook
After deployment, configure the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "allowed_updates": ["callback_query"]
  }'
```

Or use the admin API:
```bash
curl -X POST https://your-domain.com/api/telegram/set-webhook \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-domain.com/api/telegram/webhook"}'
```

## Usage

### Send Message with Summary Button

**Python Example:**
```python
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

bot = Bot(token="YOUR_BOT_TOKEN")

keyboard = [[
    InlineKeyboardButton(
        "📊 Get Summary", 
        callback_data=f"summary:{session_id}"
    )
]]
reply_markup = InlineKeyboardMarkup(keyboard)

bot.send_message(
    chat_id=user_chat_id,
    text="Your conversation has been saved. Get summary:",
    reply_markup=reply_markup
)
```

**Node.js Example:**
```javascript
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

const keyboard = {
  inline_keyboard: [[
    { 
      text: '📊 Get Summary', 
      callback_data: `summary:${sessionId}` 
    }
  ]]
};

bot.sendMessage(chatId, 'Get your conversation summary:', {
  reply_markup: keyboard
});
```

### Callback Data Format

Support both formats:
- Simple: `"f47c8118-978f-491e-a770-69389076b567"`
- Prefixed: `"summary:f47c8118-978f-491e-a770-69389076b567"`

## API Endpoints

### Webhook (Public)
```
POST /api/telegram/webhook
Rate Limit: 60 requests/minute
```

### Admin Endpoints (Protected)
```
POST /api/telegram/set-webhook
GET /api/telegram/webhook-info
Rate Limit: 100 requests/15 minutes
Auth: Bearer token required
```

## Testing

### Local Development with ngrok
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Terminal 3: Set webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://YOUR-NGROK-URL.ngrok.io/api/telegram/webhook"
```

### Manual Webhook Test
```bash
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "callback_query": {
      "message": {"chat": {"id": 12345}},
      "data": "summary:f47c8118-978f-491e-a770-69389076b567"
    }
  }'
```

### Check Webhook Status
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Response Format

User receives:
```
📊 Conversation Summary

Customer: John Doe

Summary:
Customer inquired about company registration in Dubai...

Next Action:
Send detailed quote for IFZA package.
```

## Troubleshooting

**Webhook not working?**
```bash
# Check status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Delete and reset
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=YOUR_URL"
```

**Summary not generating?**
- Check `OPENAI_API_KEY` is set
- Verify session exists in database
- Check server logs

**Messages not sending?**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check bot has permission to message user
- Review server logs for Telegram API errors

## Production Checklist

- [ ] `TELEGRAM_BOT_TOKEN` configured in environment
- [ ] `OPENAI_API_KEY` configured
- [ ] Webhook URL uses HTTPS
- [ ] Webhook configured via Telegram API
- [ ] Rate limiting enabled (automatic)
- [ ] Logs monitored for errors
- [ ] Database backups enabled

## Support

For detailed documentation, see [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md)
