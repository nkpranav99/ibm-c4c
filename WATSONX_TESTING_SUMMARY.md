# Quick Guide: Testing watsonx Integration

## 🎯 The Simplest Way to Test

Just start your backend and watch the logs!

```bash
# Start backend with logging visible
uvicorn app.main:app --reload
```

Then send any chat message (via frontend or API), and you'll see clear indicators.

## ✅ watsonx IS Working

You'll see logs like this:

```
🔍 Checking watsonx availability...
✅ watsonx is enabled and configured!
🤖 Using IBM watsonx AI for response generation
============================================================
🚀 WATSONX: Generating AI response
✅ WATSONX: Service is enabled, calling IBM watsonx API
🌐 WATSONX: Calling API at https://us-south.ml.cloud.ibm.com/...
🤖 WATSONX: Using model ibm/granite-13b-chat-v2
📊 WATSONX: Message count: 3
📡 WATSONX: API response status: 200
✅ WATSONX: Success! Response length: 245 chars
💬 WATSONX: Response preview: [AI response...]
============================================================
✅ Returned AI-generated response from watsonx
```

## ⚠️ watsonx NOT Working (Using Fallback)

You'll see logs like this:

```
🔍 Checking watsonx availability...
⚠️  watsonx module exists but not enabled
📝 Using rule-based response (fallback mode)
```

## 🧪 Quick Test Commands

```bash
# Test via API
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Watch the backend logs for the indicators above!
```

## 📊 Response Differences

**AI Response (watsonx working):**
- Natural, varied language
- Context-aware
- Personalized

**Rule-Based Response (fallback mode):**
- Structured, templated
- Consistent formatting
- Emoji patterns

## 🔍 What to Look For

| Indicator | watsonx Working | watsonx NOT Working |
|-----------|----------------|---------------------|
| Log message | `🚀 WATSONX: Generating AI response` | `📝 Using rule-based response` |
| API status | `📡 WATSONX: API response status: 200` | No API call |
| Response style | Natural, varied | Structured, templated |

## 🐛 Quick Fixes

**No watsonx logs?**
- Check `.env` file has `WATSONX_ENABLED=true`
- Verify API credentials are set

**Getting API errors?**
- Check your API key is valid
- Verify project ID is correct

## 📚 More Info

- See `TEST_WATSONX.md` for detailed testing guide
- See `WATSONX_SETUP.md` for setup instructions

---

**That's it!** The logs will tell you exactly what's happening! 🚀
