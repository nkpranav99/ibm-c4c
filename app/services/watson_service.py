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
        self.orchestrate_agent_id = settings.WATSON_AGENT_ID
        self.orchestrate_enabled = settings.WATSON_ENABLED
        
        # Store instance ID for later use
        self.orchestrate_instance_id = settings.WATSON_INSTANCE_ID
        
        # Construct base URL from instance ID if provided
        # Format: https://api.{region}.watson-orchestrate.cloud.ibm.com/instances/{instance_id}
        if settings.WATSON_INSTANCE_ID:
            # Determine base API URL
            base_api_url = None
            if settings.WATSON_HOST_URL:
                if "/instances/" in settings.WATSON_HOST_URL:
                    # Extract base from full URL: "https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/xxx" 
                    # -> "https://api.au-syd.watson-orchestrate.cloud.ibm.com"
                    base_api_url = settings.WATSON_HOST_URL.split("/instances/")[0]
                else:
                    # WATSON_HOST_URL is just the base URL (without /instances/)
                    base_api_url = settings.WATSON_HOST_URL.rstrip("/")
            
            # Use default if base not found
            if not base_api_url:
                base_api_url = "https://api.au-syd.watson-orchestrate.cloud.ibm.com"
            
            self.orchestrate_base_url = base_api_url
            # Construct full URL with instance ID
            self.orchestrate_host = f"{base_api_url}/instances/{settings.WATSON_INSTANCE_ID}"
        else:
            # Fallback to WATSON_HOST_URL if instance_id not provided
            if settings.WATSON_HOST_URL and "/instances/" in settings.WATSON_HOST_URL:
                self.orchestrate_base_url = settings.WATSON_HOST_URL.split("/instances/")[0]
            else:
                self.orchestrate_base_url = settings.WATSON_HOST_URL or "https://api.au-syd.watson-orchestrate.cloud.ibm.com"
            self.orchestrate_host = settings.WATSON_HOST_URL or "https://api.au-syd.watson-orchestrate.cloud.ibm.com"
        
        # Watsonx.ai Configuration
        self.watsonx_api_key = settings.WATSONX_API_KEY
        self.watsonx_project_id = settings.WATSONX_PROJECT_ID
        self.watsonx_url = settings.WATSONX_URL or "https://us-south.ml.cloud.ibm.com"
        self.watsonx_model_id = settings.WATSONX_MODEL_ID
        self.watsonx_enabled = settings.WATSONX_ENABLED
        
        logger.info("Watson Hybrid Service initialized")
        logger.info(f"  - Orchestrate enabled: {self.orchestrate_enabled}")
        logger.info(f"  - Orchestrate host: {self.orchestrate_host}")
        logger.info(f"  - Orchestrate instance ID: {settings.WATSON_INSTANCE_ID}")
        logger.info(f"  - Watsonx enabled: {self.watsonx_enabled}")
        
        # System prompt for watsonx
        self.general_prompt = """You are a helpful assistant for a waste material marketplace.
        Help users with general questions about the platform, buying, selling, auctions, and marketplace features.
        Keep responses friendly, concise, and helpful."""
    
    def get_iam_token(self, service: str = "orchestrate") -> Optional[str]:
        """Get IAM token for IBM Cloud authentication
        
        Args:
            service: 'orchestrate' or 'watsonx' - determines which API key to use
        """
        # Use the appropriate API key for each service
        # This is critical - each service needs its own API key with proper permissions
        if service == "watsonx":
            api_key = self.watsonx_api_key
        else:
            api_key = self.orchestrate_api_key
        
        if not api_key:
            logger.warning(f"⚠️  No API key configured for {service}")
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
            logger.error(f"Failed to get IAM token for {service}: {response.status_code} - {response.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"Error getting IAM token for {service}: {e}")
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
            
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            # Use the correct endpoint from working curl command
            # Format: /instances/{instance_id}/v1/orchestrate/runs/stream (note: /v1/ not /api/v1/)
            endpoint = f"{self.orchestrate_host}/v1/orchestrate/runs/stream"
            
            # Use the working payload format from curl command
            payload = {
                "message": {
                    "role": "human",
                    "content": message
                },
                "agent_id": self.orchestrate_agent_id,
                "additional_parameters": {},
                "context": {}
            }
            
            logger.info(f"📡 Endpoint: {endpoint}")
            logger.info(f"📦 Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(endpoint, headers=headers, json=payload, timeout=30)
            
            logger.info(f"📥 Response status: {response.status_code}")
            
            if response.status_code == 200:
                # Handle streaming JSON lines response (NDJSON format)
                # Each line is a JSON object representing an event
                accumulated_text = ""
                final_message = None
                
                try:
                    # Read streaming response line by line
                    for line in response.iter_lines():
                        if not line:
                            continue
                        
                        try:
                            event = json.loads(line.decode('utf-8'))
                            event_type = event.get("event", "")
                            event_data = event.get("data", {})
                            
                            # Handle message.delta events - accumulate text chunks
                            if event_type == "message.delta":
                                delta = event_data.get("delta", {})
                                content = delta.get("content", [])
                                if content and isinstance(content, list) and len(content) > 0:
                                    text_chunk = content[0].get("text", "")
                                    if text_chunk:
                                        accumulated_text += text_chunk
                            
                            # Handle message.created event - contains final complete message
                            elif event_type == "message.created":
                                message = event_data.get("message", {})
                                content = message.get("content", [])
                                if content and isinstance(content, list) and len(content) > 0:
                                    # Extract text from content array
                                    for content_item in content:
                                        if isinstance(content_item, dict):
                                            text = content_item.get("text", "")
                                            if text:
                                                final_message = text
                                                break
                            
                            # Check for completion
                            elif event_type == "done":
                                break
                                
                        except json.JSONDecodeError:
                            logger.warning(f"⚠️  Failed to parse JSON line: {line[:100] if line else 'empty'}")
                            continue
                    
                    # Return final message if available, otherwise accumulated text
                    if final_message:
                        logger.info(f"✅ Success with Orchestrate Agent (final message)")
                        return final_message
                    elif accumulated_text:
                        logger.info(f"✅ Success with Orchestrate Agent (accumulated text)")
                        return accumulated_text
                    else:
                        logger.warning("⚠️  No message content found in stream")
                        return None
                except Exception as stream_error:
                    logger.error(f"Error processing stream: {stream_error}")
                    import traceback
                    logger.error(traceback.format_exc())
                    return None
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
            
            response = requests.post(endpoint, headers=headers, json=payload, params=params, timeout=10)
            
            logger.info(f"📥 Watsonx Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"📥 Watsonx Response data: {json.dumps(result, indent=2)[:500]}")
                # Extract generated text from response
                if "results" in result and len(result["results"]) > 0:
                    return result["results"][0].get("generated_text", "")
            elif response.status_code == 403:
                # 403 usually means service ID doesn't have access to the project
                error_text = response.text
                logger.error(f"❌ Watsonx authorization failed (403)")
                logger.error(f"   Full error: {error_text}")
                logger.error(f"   💡 This usually means the API key's service ID is not a member of the watsonx project.")
                logger.error(f"   💡 Solution: Add the service ID to your watsonx project members in IBM Cloud.")
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
        logger.info("=" * 30)
        logger.info("🤖 Watson Hybrid Service")
        logger.info(f"📝 Message: {message[:100]}...")
        
        # Determine query type
        is_data_query = self.is_data_query(message)
        logger.info(f"🎯 Query type: {'Data Query' if is_data_query else 'General Query'}")
        
        # Try Orchestrate Agent for data queries
        if is_data_query and self.orchestrate_enabled:
            logger.info("🔍 Trying Watson Orchestrate Agent first...")
            # Get token using orchestrate API key
            token = self.get_iam_token(service="orchestrate")
            if token:
                response = self.call_orchestrate_agent(message, token)
                if response:
                    logger.info("✅ Got response from Orchestrate Agent")
                    return response
                logger.info("⚠️  Orchestrate failed, falling back...")
            else:
                logger.warning("⚠️  Could not get authentication token for Orchestrate")
        
        # Try Watsonx for general queries or fallback
        if self.watsonx_enabled:
            logger.info("🔍 Trying Watsonx.ai...")
            # Get token using watsonx API key (CRITICAL: must use watsonx API key, not orchestrate)
            token = self.get_iam_token(service="watsonx")
            if token:
                response = self.call_watsonx(message, conversation_history or [], context_data, token)
                if response:
                    logger.info("✅ Got response from Watsonx")
                    return response
                logger.info("⚠️  Watsonx failed")
            else:
                logger.warning("⚠️  Could not get authentication token for Watsonx")
        
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

