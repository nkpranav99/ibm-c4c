"""
Hybrid Watson Service
- Watson Orchestrate Agent: For queries about waste marketplace data (from knowledge base)
- Watsonx.ai Foundation Models: For general queries and fallback
"""

from typing import List, Dict, Optional, Any
from app.config import settings
import json
import requests  # type: ignore
import logging
import re

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
        self.seller_agent_id = settings.WATSON_SELLER_AGENT_ID
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
        logger.info(f"  - Seller-specific agent configured: {bool(self.seller_agent_id)}")
        logger.info(f"  - Watsonx enabled: {self.watsonx_enabled}")
        
        # System prompt for watsonx
        self.general_prompt = """You are a helpful assistant for a waste material marketplace.
        Help users with general questions about the platform, buying, selling, auctions, and marketplace features.
        Keep responses friendly, concise, and helpful.
        Provide a single direct answer tailored to the latest user question without including dialogue labels like 'User:' or 'Assistant:'."""
    
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
        Excludes listing creation queries which should use WatsonX
        """
        message_lower = message.lower()
        
        # First, check if this is a listing creation query (should use WatsonX, not Orchestrate)
        listing_creation_phrases = [
            "available for sale", "for sale", "ready for sale", "up for sale",
            "priced at", "price per", "selling", "i have", "i've got", 
            "we have", "we've got", "material available", "tons available",
            "kg available", "fixed sale", "fixed price", "i want to sell",
            "i want to list", "create a listing", "list my"
        ]
        
        # Check if it's a question (informational query)
        # Questions about waste materials should go to Orchestrate Agent
        question_indicators = [
            "what", "how", "where", "when", "why", "can i", "should i",
            "what can i do", "what can i", "how can i", "tell me", "explain",
            "describe", "help me", "i want to know"
        ]
        is_question = any(qword in message_lower for qword in question_indicators)
        
        # If it's a listing creation query (not a question), it's NOT a data query
        # (it should go to WatsonX for structured parsing)
        # But questions about materials ARE data queries (should use Orchestrate)
        is_listing_creation = (not is_question) and any(phrase in message_lower for phrase in listing_creation_phrases)
        if is_listing_creation:
            return False
        
        # Keywords that indicate waste marketplace data queries
        data_keywords = [
            "waste", "material", "listing", "plastic", "metal", "paper", "biomass",
            "machinery", "equipment", "price", "quantity", "buy", "sell",
            "seller", "location", "category", "auction", "bid",
            "bagasse", "rice husk", "coconut shell", "straw", "hay", "fly ash",
            "bottom ash", "coal ash", "hdpe", "hdpe scrap", "pet", "pet bottles",
            "pp scrap", "ldpe", "ldpe film", "mixed plastic", "steel", "steel scrap",
            "aluminum", "aluminum scrap", "copper wire", "brass scrap", "cast iron",
            "cardboard", "cardboard bales", "mixed paper", "newspaper", "concrete rubble",
            "brick waste", "scrap wood", "gypsum waste", "clear glass", "mixed glass",
            "broken glass", "cotton scrap", "fabric remnants", "industrial rags",
            "tire scrap", "rubber crumb", "food processing waste", "vegetable waste",
            "dual-shaft", "shredder", "pulp processing", "twin screw", "extruder",
            "carbonization furnace", "hydraulic baler", "ring spinning", "rotary screw",
            "projectile weaving", "injection molding", "blow molding",
            "water cooled chiller", "fourdrinier", "paper machine", "coal fired boiler",
            "bottling line", "reverse osmosis", "ro plant", "fiber laser", "press brake",
            "briquetting", "pelletizing", "gasification", "de-inking", "granulator",
            "washing line", "fiber spinning", "weaving loom", "alligator shear",
            "baling press"
        ]
        
        return any(keyword in message_lower for keyword in data_keywords)
    
    def call_orchestrate_agent(
        self,
        message: str,
        token: str,
        agent_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Call Watson Orchestrate Agent (for waste data queries)
        """
        agent_to_use = agent_id or self.orchestrate_agent_id

        if not self.orchestrate_enabled or not agent_to_use:
            return None
        
        try:
            logger.info("🤖 Calling Watson Orchestrate Agent")
            logger.info(f"🆔 Using agent ID: {agent_to_use}")
            
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
                "agent_id": agent_to_use,
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
                prompt_parts.append(f"\nAdditional context to reference if useful:\n{context_str}")

            # Add recent conversation history for grounding without duplicating roles in the response
            if conversation_history:
                recent_history = conversation_history[-6:]
                formatted_history = []
                for msg in recent_history:
                    content = msg.get("content", "")
                    if not content:
                        continue
                    role = msg.get("role", "user")
                    if role == "assistant":
                        formatted_history.append(f"Assistant: {content}")
                    else:
                        formatted_history.append(f"User: {content}")
                if formatted_history:
                    history_block = "\n".join(formatted_history)
                    prompt_parts.append(f"\nConversation context (most recent last):\n{history_block}")

            # Add current message and explicit instruction for the reply format
            prompt_parts.append(
                f"\nLatest user question:\n{message}\n\nReply with one helpful assistant response in plain text, without adding role prefixes or follow-up questions unless the user explicitly asks for them.\n"
            )

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
    
    def _normalize_listing_record(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            material = (record.get("material_name") or record.get("material") or "").strip()
            category = (record.get("category") or record.get("listing_category") or "").strip()
            title = (record.get("title") or record.get("listing_name") or record.get("name") or material).strip()
            unit = (record.get("unit") or record.get("quantity_unit") or "tons").strip() or "tons"
            location = (record.get("location") or record.get("city") or "").strip()
            description = record.get("description") or record.get("details") or None

            def _to_number(value):
                if value is None:
                    return None
                if isinstance(value, (int, float)):
                    return float(value)
                cleaned = re.sub(r"[^0-9.\-]", "", str(value))
                if cleaned in {"", "-"}:
                    return None
                try:
                    return float(cleaned)
                except ValueError:
                    return None

            quantity = _to_number(record.get("quantity"))
            price_per_unit = _to_number(record.get("price_per_unit") or record.get("price"))

            sale_type_raw = (record.get("sale_type") or record.get("listing_type") or "").strip().lower()
            if "auction" in sale_type_raw:
                sale_type = "auction"
            elif sale_type_raw:
                sale_type = "fixed_price"
            else:
                sale_type = "fixed_price"

            if not material or quantity is None or price_per_unit is None or not location:
                return None

            return {
                "material_name": material,
                "title": title,
                "category": category or "Other",
                "quantity": quantity,
                "unit": unit,
                "price_per_unit": price_per_unit,
                "sale_type": sale_type,
                "location": location,
                "description": description,
                "images": record.get("images") if isinstance(record.get("images"), list) else [],
            }
        except Exception as exc:
            logger.error(f"Failed to normalize listing payload: {exc}")
            return None

    def generate_structured_listing(self, raw_message: str) -> Optional[Dict[str, Any]]:
        if not self.watsonx_enabled:
            logger.info("Watsonx disabled - cannot parse structured listing")
            return None

        logger.info("🧾 Invoking watsonx structured listing extractor")
        logger.info(f"📝 Raw message snippet: {raw_message[:]}")

        token = self.get_iam_token(service="watsonx")
        if not token:
            logger.warning("Unable to obtain Watsonx token for structured listing call")
            return None

        endpoint = f"{self.watsonx_url.rstrip('/')}/ml/v1/text/generation"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        instruction = (
            "You are a strict data extraction assistant. Read the seller's message and output ONLY a compact JSON "
            "object with these keys: material_name, title, category, quantity, unit, price_per_unit, sale_type, "
            "location, description. Numbers must be numeric. sale_type must be either 'fixed_price' or 'auction'. "
            "If information is missing, set value to null. Do not add commentary."
        )

        payload = {
            "model_id": self.watsonx_model_id,
            "project_id": self.watsonx_project_id,
            "input": f"{instruction}\n\nSeller message:\n{raw_message.strip()}\n\nJSON:",
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": 256,
                "min_new_tokens": 1,
                "repetition_penalty": 1.05,
            },
        }

        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                params={"version": "2023-05-29"},
                timeout=30,
            )
            if response.status_code != 200:
                logger.warning(
                    "Watsonx structured listing call failed: %s - %s",
                    response.status_code,
                    response.text[:200],
                )
                return None

            data = response.json()
            generated = (
                data.get("results", [{}])[0].get("generated_text", "") if isinstance(data.get("results"), list) else ""
            ).strip()

            logger.info(f"🧾 watsonx raw generated payload: {generated[:200]}")

            if not generated:
                return None

            start = generated.find("{")
            end = generated.rfind("}")
            if start == -1 or end == -1 or end <= start:
                logger.warning("Structured listing response missing JSON body: %s", generated[:120])
                return None

            json_block = generated[start : end + 1]
            try:
                parsed = json.loads(json_block)
            except json.JSONDecodeError:
                logger.warning("Unable to decode JSON from structured listing response: %s", json_block[:120])
                return None

            if isinstance(parsed, list) and parsed:
                parsed = parsed[0]

            if not isinstance(parsed, dict):
                return None

            normalized = self._normalize_listing_record(parsed)
            logger.info(f"🧾 Normalized watsonx listing: {normalized}")
            return normalized
        except Exception as exc:
            logger.exception("Error generating structured listing: %s", exc)
            return None

    def generate_response(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        context_data: Optional[Dict] = None,
        user_role: Optional[str] = None
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
        if user_role:
            logger.info(f"👤 User role detected: {user_role}")
        
        # Determine query type
        is_data_query = self.is_data_query(message)
        logger.info(f"🎯 Query type: {'Data Query' if is_data_query else 'General Query'}")

        agent_override = None
        if user_role == "seller" and self.seller_agent_id:
            agent_override = self.seller_agent_id
            logger.info("🔁 Switching to seller-specific Orchestrate agent")
        
        # Try Orchestrate Agent for data queries
        if is_data_query and self.orchestrate_enabled:
            logger.info("🔍 Trying Watson Orchestrate Agent first...")
            # Get token using orchestrate API key
            token = self.get_iam_token(service="orchestrate")
            if token:
                response = self.call_orchestrate_agent(message, token, agent_id=agent_override)
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

