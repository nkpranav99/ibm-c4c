# Watson Hybrid Integration Guide

## 🎯 Overview

Your chatbot now uses a **hybrid approach** that combines:

1. **Watson Orchestrate Agent**: For queries about waste marketplace data (uses knowledge base from waste_streams_dashboard_data.json)
2. **Watsonx.ai Foundation Models**: For general queries (fallback when agent unavailable)
3. **Rule-Based System**: Final fallback if both AI services are unavailable

## 📋 How It Works

```
User Query
    ↓
Check: Is it about waste data?
    ↓
    ├─ YES → Watson Orchestrate Agent
    │         (Uses your knowledge base)
    │
    └─ NO  → Watsonx.ai Model
              (General responses)
    ↓
    ↓ Both fail?
    ↓
    ↓ Rule-Based Fallback
```

## ✅ Current Configuration

### Watson Orchestrate (Primary - Data Queries)
- **Enabled**: Yes ✅
- **API Key**: Configured
- **Host**: https://au-syd.watson-orchestrate.cloud.ibm.com
- **Agent ID**: c6ae3255-b923-4d54-84e0-85512d2f91fc
- **Knowledge Base**: waste_streams_dashboard_data.json (in agent)

### Watsonx.ai (Fallback - General Queries)
- **Enabled**: No (for now)
- **Can be enabled**: When you have watsonx.ai project ID

### Rule-Based (Final Fallback)
- **Enabled**: Always
- **Covers**: Platform questions, help, guidance

## 🔍 Query Routing Logic

### Data Queries → Orchestrate Agent

Keywords that trigger Orchestrate:
- waste, material, listing, plastic, metal, paper
- machinery, equipment, price, quantity
- seller, location, category, auction, bid
- Specific material names (HDPE, LDPE, PET, steel, etc.)

**Example queries**:
- "What plastic waste materials are available?"
- "Show me HDPE scrap in Mumbai"
- "I want to start a plastic recycling business"
- "What machinery is available for processing paper?"

### General Queries → Watsonx.ai (when enabled)

Everything else gets routed to Watsonx:
- "How do I list materials?"
- "How does bidding work?"
- "What are the benefits?"
- "Hello"

### Final Fallback → Rule-Based

If all AI services fail:
- Structured, templated responses
- Helpful suggestions
- Platform information

## ⚙️ Configuration File

Your `.env` file contains:

```env
# Watson Orchestrate (Data Queries)
WATSON_API_KEY=_TO9YnEJFls7WpRnbr2nB3r9hO9fOhXz4PB3P8FLxJ09
WATSON_HOST_URL=https://au-syd.watson-orchestrate.cloud.ibm.com
WATSON_AGENT_ID=c6ae3255-b923-4d54-84e0-85512d2f91fc
WATSON_ENABLED=true

# Watsonx.ai (General Queries)
WATSONX_API_KEY=_TO9YnEJFls7WpRnbr2nB3r9hO9fOhXz4PB3P8FLxJ09
WATSONX_PROJECT_ID=c6ae3255-b923-4d54-84e0-85512d2f91fc
WATSONX_URL=https://au-syd.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
WATSONX_ENABLED=false
```

## 🚀 Getting Started

### 1. Deploy Your Orchestrate Agent

Your agent needs to be deployed first:

1. Go to: https://watson-orchestrate.cloud.ibm.com
2. Open "Custom_agent"
3. Click "Deploy" or "Publish"
4. Wait for deployment

### 2. Start the Backend

```bash
cd /home/pranav.naik/Desktop/ibm-c4c
uvicorn app.main:app --reload
```

### 3. Test the Chatbot

```bash
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What plastic waste materials are available?"}'
```

## 🧪 Testing

### Test Orchestrate Agent

```bash
# Should use Orchestrate agent
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about plastic waste listings"}'
```

### Test General Query (Fallback)

```bash
# Should use Watsonx or rule-based
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I list materials?"}'
```

### Check Logs

Watch backend logs for:
- `🤖 Watson Hybrid Service` - Service initialized
- `🤖 Calling Watson Orchestrate Agent` - Using agent
- `🧠 Calling Watsonx.ai Foundation Model` - Using Watsonx
- `📝 Using rule-based response` - Using fallback

## 📊 Expected Behavior

### ✅ Working (Agent Deployed)

**Query**: "What plastic materials are available?"
**Response**: AI-generated from knowledge base, includes material details

### ⚠️ Fallback (Agent Not Deployed)

**Query**: "What plastic materials are available?"
**Response**: Rule-based response with marketplace data from JSON

### ❌ Both Fail

**Query**: Any query
**Response**: Rule-based response with helpful suggestions

## 🔧 Enable Watsonx.ai (Optional)

To enable Watsonx for general queries:

1. Get watsonx.ai project ID from IBM Cloud
2. Update `.env`:
   ```env
   WATSONX_PROJECT_ID=your_watsonx_project_id
   WATSONX_ENABLED=true
   ```
3. Restart backend

## 📝 Files Created/Modified

- `app/config.py` - Added Watson configuration
- `app/services/watson_service.py` - Hybrid service (NEW)
- `app/routers/chatbot.py` - Updated to use hybrid approach
- `.env` - Configuration file

## 💡 Key Features

1. **Automatic Routing**: Smart detection of query type
2. **Graceful Fallback**: Always has a response
3. **Context Aware**: Adds marketplace listings to context
4. **Logging**: Clear visibility into which service is used
5. **Flexible**: Easy to enable/disable services

## 🎉 Summary

Your chatbot is now set up to:
- ✅ Use Orchestrate agent for waste data queries
- ✅ Use Watsonx for general queries (when enabled)
- ✅ Fallback to rule-based responses
- ✅ Include marketplace context
- ✅ Log all interactions

**Next Step**: Deploy the Orchestrate agent!

