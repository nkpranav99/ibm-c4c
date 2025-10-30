"""
Hybrid Watson Service
- Watson Orchestrate Agent: For queries about waste marketplace data (from knowledge base)
- Watsonx.ai Foundation Models: For general queries and fallback
"""

from typing import List, Dict, Optional
from app.config import settings
import json
import requests
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WatsonHybridService:
    """
    Hybrid service that uses:
    1. Watson Orchestrate Agent for waste data queries (with knowledge base)
    2. Watsonx.ai for general queries and fallback
    """
    
    def __init__(self):
        # Watson Orchestrate Configuration
        self.orchestrate_api_key = settings.WATSON_API_KEY
        self.orchestrate_host = settings.WATSON_HOST_URL
        self.orchestrate_agent_id = settings.WATSON_AGENT_ID
        self.orchestrate_enabled = settings.WATSON_ENABLED
        
        # Watsonx.ai Configuration
        self.watsonx_api_key = settings.WATSONX_API_KEY
        self.watsonx_project_id = settings.WATSONX_PROJECT_ID
        self.watsonx_url = settings.WATSONX_URL or "https://us-south.ml.cloud.ibm.com"
        self.watsonx_model_id = settings.WATSONX_MODEL_ID
        self.watsonx_enabled = settings.WATSONX_ENABLED
        
        logger.info("Watson Hybrid Service initialized")
        logger.info(f"  - Orchestrate enabled: {self.orchestrate_enabled}")
        logger.info(f"  - Watsonx enabled: {self.watsonx_enabled}")
        
        # System prompt for watsonx
        self.general_prompt = """You are a helpful assistant for a waste material marketplace.
Help users with general questions about the platform, buying, selling, auctions, and marketplace features.
Keep responses friendly, concise, and helpful."""
    
    def get_iam_token(self) -> Optional[str]:
        """Get IAM token for IBM Cloud authentication"""
        # Use orchestrate API key if available, otherwise watsonx
        api_key = self.orchestrate_api_key or self.watsonx_api_key
        if not api_key:
            return None
        
        try:
            url = "https://iam.cloud.ibm.com/identity/token"
            data = {
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": api_key
            }
            response = requests.post(url, data=data, timeout=10)
            if response.status_code == 200:
                return response.json()["access_token"]
            logger.error(f"Failed to get IAM token: {response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error getting IAM token: {e}")
            return None
    
    def is_data_query(self, message: str) -> bool:
        """
        Determine if query is about waste data (should use Orchestrate agent)
        """
        message_lower = message.lower()
        
        # Keywords that indicate waste marketplace data queries
        data_keywords = [
            "waste", "material", "listing", "plastic", "metal", "paper", "biomass",
            "machinery", "equipment", "price", "quantity", "buy", "sell",
            "seller", "location", "category", "auction", "bid",
            "hype", "ldpe", "pet", "steel", "aluminum", "cardboard",
            "bagasse", "ash", "glass", "rubber", "textile"
        ]
        
        return any(keyword in message_lower for keyword in data_keywords)
    
    def call_orchestrate_agent(self, message: str, token: str) -> Optional[str]:
        """
        Call Watson Orchestrate Agent (for waste data queries)
        """
        if not self.orchestrate_enabled or not self.orchestrate_agent_id:
            return None
        
        try:
            logger.info("🤖 Calling Watson Orchestrate Agent")
            
            # Try the wxochat endpoint with correct payload format
            endpoint = f"{self.orchestrate_host}/wxochat/api/v1/chat"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "agentId": self.orchestrate_agent_id,
                "input": {
                    "text": message
                }
            }
            
            logger.info(f"📡 Endpoint: {endpoint}")
            logger.info(f"📦 Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
            
            logger.info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"📥 Response data: {json.dumps(result, indent=2)[:500]}")
                # Extract response text from agent
                if isinstance(result, dict):
                    return result.get("output", {}).get("text") or str(result)
                return str(result)
            elif response.status_code == 404:
                logger.warning("⚠️  Orchestrate agent not found (404) - agent may not be deployed")
            else:
                logger.warning(f"⚠️  Orchestrate returned {response.status_code}: {response.text[:200]}")
            
            return None
        except Exception as e:
            logger.error(f"Error calling Orchestrate agent: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def call_watsonx(self, message: str, conversation_history: List[Dict], 
                     context_data: Optional[Dict], token: str) -> Optional[str]:
        """
        Call Watsonx.ai for general queries
        """
        if not self.watsonx_enabled or not self.watsonx_project_id:
            return None
        
        try:
            logger.info("🧠 Calling Watsonx.ai Foundation Model")
            
            # Use the correct endpoint for watsonx.ai
            endpoint = f"{self.watsonx_url}/ml/v1/text/generation"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Build the prompt from conversation
            prompt_parts = [self.general_prompt]
            
            # Add context if available
            if context_data:
                context_str = json.dumps(context_data, indent=2)
                prompt_parts.append(f"\nAdditional context:\n{context_str}")
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        prompt_parts.append(f"\nUser: {content}")
                    elif role == "assistant":
                        prompt_parts.append(f"\nAssistant: {content}")
            
            # Add current message
            prompt_parts.append(f"\nUser: {message}\nAssistant:")
            
            full_prompt = "".join(prompt_parts)
            
            payload = {
                "model_id": self.watsonx_model_id,
                "project_id": self.watsonx_project_id,
                "input": full_prompt,
                "parameters": {
                    "decoding_method": "greedy",
                    "temperature": 0.7,
                    "max_new_tokens": 1024
                }
            }
            
            # Add version as query parameter
            params = {"version": "2023-05-29"}
            
            logger.info(f"📡 Watsonx Endpoint: {endpoint}")
            logger.info(f"📦 Watsonx Payload (prompt preview): {full_prompt[:200]}...")
            
            response = requests.post(endpoint, headers=headers, json=payload, params=params, timeout=30)
            
            logger.info(f"📥 Watsonx Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"📥 Watsonx Response data: {json.dumps(result, indent=2)[:500]}")
                # Extract generated text from response
                if "results" in result and len(result["results"]) > 0:
                    return result["results"][0].get("generated_text", "")
            else:
                logger.warning(f"⚠️  Watsonx returned {response.status_code}: {response.text[:200]}")
            
            return None
        except Exception as e:
            logger.error(f"Error calling Watsonx: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    def generate_response(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        context_data: Optional[Dict] = None
    ) -> str:
        """
        Generate response using hybrid approach:
        1. If waste data query → Use Orchestrate Agent
        2. Otherwise → Use Watsonx
        3. Fallback to rules if both fail
        """
        logger.info("=" * 60)
        logger.info("🤖 Watson Hybrid Service")
        logger.info(f"📝 Message: {message[:100]}...")
        
        # Get authentication token
        token = self.get_iam_token()
        if not token:
            logger.warning("⚠️  Could not get authentication token")
            return None
        
        # Determine query type
        is_data_query = self.is_data_query(message)
        logger.info(f"🎯 Query type: {'Data Query' if is_data_query else 'General Query'}")
        
        # Try Orchestrate Agent for data queries
        if is_data_query and self.orchestrate_enabled:
            logger.info("🔍 Trying Watson Orchestrate Agent first...")
            response = self.call_orchestrate_agent(message, token)
            if response:
                logger.info("✅ Got response from Orchestrate Agent")
                return response
            logger.info("⚠️  Orchestrate failed, falling back...")
        
        # Try Watsonx for general queries or fallback
        if self.watsonx_enabled:
            logger.info("🔍 Trying Watsonx.ai...")
            response = self.call_watsonx(message, conversation_history or [], context_data, token)
            if response:
                logger.info("✅ Got response from Watsonx")
                return response
            logger.info("⚠️  Watsonx failed")
        
        # Both failed
        logger.warning("❌ Both services failed")
        return None


# Global service instance
_watson_service = None

def get_watson_service() -> WatsonHybridService:
    """Get or create the global Watson service instance"""
    global _watson_service
    if _watson_service is None:
        _watson_service = WatsonHybridService()
    return _watson_service

