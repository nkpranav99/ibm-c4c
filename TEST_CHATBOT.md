# Testing the Chatbot

## Quick Test Commands

### 1. Test with curl
```bash
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to start a plastic recycling business"}'
```

### 2. Test from Frontend
1. Start frontend: `cd frontend && npm run dev`
2. Start backend: `uvicorn app.main:app --reload`
3. Open browser: http://localhost:3000
4. Click the chatbot icon (bottom right)
5. Type: "I want to start a plastic recycling business"

## Expected Response Structure

```json
{
  "message": "Formatted text with business advice",
  "suggestions": ["array", "of", "suggested", "questions"],
  "listings": [{ "detailed": "listing", "information" }]
}
```

## Test Queries

Try these to test different features:

1. **Business Ideas:**
   - "I want to start a plastic recycling business"
   - "Business idea for construction materials"
   - "Start a biofuel business in Mumbai"

2. **General Queries:**
   - "How do I list materials?"
   - "What materials are available?"
   - "How does bidding work?"

## All Working! ✅

The chatbot is fully functional with JSON storage backend.

