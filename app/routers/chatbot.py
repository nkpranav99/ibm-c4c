from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import logging
import re
from pathlib import Path
from jose import JWTError, jwt

from app.config import settings
from app.schemas.listing import ListingSubmission
from app.utils.mock_storage import get_user_by_email
from app.routers.listings import (
    load_master_data as listings_load_master_data,
    save_master_data as listings_save_master_data,
    format_listing as listings_format_listing,
)

# Set up logging
logger = logging.getLogger(__name__)

# Try to import Watson service
try:
    from app.services.watson_service import get_watson_service
    WATSON_AVAILABLE = True
    logger.info("✅ Watson service imported successfully")
except ImportError as e:
    WATSON_AVAILABLE = False
    get_watson_service = None
    logger.warning(f"⚠️  Watson service not available: {e}")

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []
    user_role: Optional[str] = None
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    user_company: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    suggestions: Optional[List[str]] = []
    listings: Optional[List[dict]] = []  # Include relevant listings


SELLER_LISTING_CATEGORIES = [
    "Agricultural/Biomass",
    "Industrial Ash",
    "Plastic Waste",
    "Metal Scrap",
    "Paper & Cardboard",
    "Construction & Demolition",
    "Glass",
    "Textile Waste",
    "Rubber & Tires",
    "Organic/Food Waste",
]


SALE_TYPE_ALIASES = {
    "fixed_price": {"fixed price", "fixed", "fixed-price", "direct", "direct sale", "set price"},
    "auction": {"auction", "bid", "bidding", "auction listing", "open bidding"},
}


LISTING_FLOW_PLAN = [
    {"field": "material_name", "label": "Material name", "optional": False},
    {"field": "title", "label": "Listing title", "optional": True},
    {"field": "category", "label": "Category", "optional": False},
    {"field": "quantity", "label": "Quantity", "optional": False},
    {"field": "unit", "label": "Unit", "optional": False},
    {"field": "price_per_unit", "label": "Price per unit", "optional": False},
    {"field": "sale_type", "label": "Sale type", "optional": False},
    {"field": "location", "label": "Location", "optional": False},
    {"field": "description", "label": "Description", "optional": True},
    {"field": "images", "label": "Image URLs", "optional": True},
]


LISTING_FLOW_FIELDS = [step["field"] for step in LISTING_FLOW_PLAN]
LISTING_FLOW_STEP_MAP = {step["field"]: step for step in LISTING_FLOW_PLAN}
LISTING_FLOW_TOTAL_STEPS = len(LISTING_FLOW_PLAN)


LISTING_STEP_INSTRUCTIONS = {
    "material_name": "What material are you listing? (e.g., HDPE scrap, mixed paper bales)",
    "title": "Provide a short headline buyers will see. Type 'skip' and I'll create one for you automatically.",
    "category": "Choose the closest category from this list: "
    + ", ".join(SELLER_LISTING_CATEGORIES),
    "quantity": "How much material is available? Please share a number (you can include decimals).",
    "unit": "What unit should we display? (e.g., tons, kg, liters). Type 'skip' to use 'tons'.",
    "price_per_unit": "What's the price per unit? Share the amount in INR.",
    "sale_type": "Is this a fixed price or an auction listing? Reply with 'fixed price' or 'auction'.",
    "location": "Where is the material located? (City or region).",
    "description": "Add any quality notes, certifications, or pickup details buyers should know. Type 'skip' to leave it blank for now.",
    "images": "Share image URLs separated by commas or new lines. Type 'skip' if you don't have photos yet.",
}


LISTING_FLOW_SESSIONS: Dict[str, Dict[str, Any]] = {}


def _get_user_from_request(http_request: Request) -> Optional[Dict]:
    """Attempt to resolve the authenticated user from the incoming request."""
    auth_header = (
        http_request.headers.get("authorization")
        or http_request.headers.get("Authorization")
        or http_request.headers.get("AUTHORIZATION")
    )
    if not auth_header:
        return None

    parts = auth_header.replace(",", " ").split()
    if not parts:
        return None

    scheme = parts[0]
    token = parts[1] if len(parts) > 1 else ""
    if scheme.lower() != "bearer" or not token:
        return None

    token = token.strip()
    if token.lower() in {"null", "none", "undefined"}:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        logger.warning("⚠️  Invalid authentication token presented at chatbot endpoint")
        return None

    email = payload.get("sub")
    if not email:
        return None

    user = get_user_by_email(email)
    if not user:
        logger.warning("⚠️  Chatbot request token resolved to unknown user")
    return user


def _get_listing_flow_key(user: Optional[Dict]) -> Optional[str]:
    if not user:
        return None
    key = user.get("email") or user.get("id") or user.get("username")
    if key is None:
        return None
    return str(key)


def _reset_listing_flow(flow_key: str):
    LISTING_FLOW_SESSIONS.pop(flow_key, None)


def _start_listing_flow(flow_key: str):
    LISTING_FLOW_SESSIONS[flow_key] = {
        "step_index": 0,
        "data": {},
        "started_at": datetime.utcnow().isoformat(),
    }
    logger.info(f"🧾 Listing flow started for {flow_key}")


def _format_structured_listing_preview(data: Dict[str, Any]) -> str:
    parts = ["Here’s what I understood:"]
    mapping = [
        ("Material", data.get("material_name")),
        ("Listing title", data.get("title")),
        ("Category", data.get("category")),
        ("Quantity", f"{data.get('quantity')} {data.get('unit')}") if data.get("quantity") else None,
        ("Price per unit", f"₹{data.get('price_per_unit')}" if data.get("price_per_unit") is not None else None),
        ("Sale type", data.get("sale_type", "").replace('_', ' ').title()),
        ("Location", data.get("location")),
    ]
    for label, value in mapping:
        if value:
            parts.append(f"• {label}: {value}")
    description = data.get("description")
    if description:
        parts.append("")
        parts.append(f"Description: {description}")
    parts.append("")
    parts.append("Should I publish this listing?")
    return "\n".join(parts)


def _call_watson_listing_parser(raw_message: str) -> Optional[Dict[str, Any]]:
    logger.info("🤖 Attempting watsonx structured listing parse")
    try:
        watson_service = get_watson_service() if get_watson_service else None
        if not watson_service:
            logger.info("❌ Watson service unavailable for structured listing parse")
            return None
        parsed = watson_service.generate_structured_listing(raw_message)
        if parsed:
            logger.info("✅ watsonx returned structured listing data")
        else:
            logger.info("⚠️ watsonx did not return structured listing data")
        return parsed
    except Exception as exc:
        logger.error(f"Listing parser call failed: {exc}")
        return None


def _get_step_instruction(field: str, step_index: int) -> str:
    label = LISTING_FLOW_STEP_MAP[field]["label"]
    optional_suffix = " (optional)" if LISTING_FLOW_STEP_MAP[field]["optional"] else ""
    base = f"Step {step_index + 1}/{LISTING_FLOW_TOTAL_STEPS} – {label}{optional_suffix}\n"
    instruction = LISTING_STEP_INSTRUCTIONS.get(field, "Please provide the required information.")
    return (
        f"{base}{instruction}\n\nType 'cancel' anytime to stop or 'start over' to begin again."
    )


def _should_start_listing_flow(message: str) -> bool:
    if not message:
        return False
    text = message.lower()
    normalized = re.sub(r"[^a-z0-9\s]", " ", text)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    keywords = [
        "list an item",
        "list my item",
        "list a new item",
        "list this item",
        "list material",
        "list my material",
        "list items",
        "list my items",
        "list items for sale",
        "create a listing",
        "create new listing",
        "new listing",
        "publish listing",
        "post a listing",
        "sell this material",
        "sell my material",
        "sell an item",
        "add new listing",
        "add a listing",
        "add listing",
        "list for sale",
        "list your item",
    ]
    if any(trigger in normalized for trigger in keywords):
        return True

    sale_phrases = [
        "available for sale",
        "for sale",
        "ready for sale",
        "up for auction",
        "priced at",
        "fixed sale",
        "fixed price",
    ]

    if any(phrase in normalized for phrase in sale_phrases):
        if any(word in normalized for word in ["have", "selling", "providing", "offering", "available"]):
            if any(unit in normalized for unit in ["ton", "tons", "kg", "kilogram", "metric", "bale", "mt", "quantity"]):
                return True

    if "list" in normalized and (
        "sell" in normalized
        or "sale" in normalized
        or "material" in normalized
        or "materials" in normalized
        or "item" in normalized
        or "items" in normalized
        or "listing" in normalized
    ):
        return True

    if "create" in normalized and "listing" in normalized:
        return True

    if "publish" in normalized and "listing" in normalized:
        return True

    return False


def _is_seller_intent(message: str, user_role: Optional[str]) -> bool:
    if user_role != "seller":
        return False
    return _should_start_listing_flow(message)


def _extract_number(value: str) -> Optional[float]:
    if not value:
        return None
    sanitized = value.replace(",", " ")
    match = re.search(r"-?\d+(?:\.\d+)?", sanitized)
    if not match:
        return None
    try:
        return float(match.group())
    except ValueError:
        return None


def _parse_listing_flow_input(field: str, raw_message: str):
    message = raw_message.strip()
    if not message:
        return False, None, "Please enter a response so I can continue."

    lower_message = message.lower()
    if field in {"title", "unit", "description", "images"} and lower_message in {"skip", "none", "no", "n/a", "na"}:
        if field == "unit":
            return True, "tons", None
        if field == "images":
            return True, [], None
        return True, None, None

    if field == "material_name":
        stripped = message.strip().rstrip('.')
        if not stripped:
            return False, None, "Please share the material name so buyers know what you're offering."
        return True, stripped, None

    if field == "title":
        return True, message.strip(), None

    if field == "category":
        normalized = message.strip().lower()
        for category in SELLER_LISTING_CATEGORIES:
            if normalized == category.lower():
                return True, category, None
        # Allow partial matches
        for category in SELLER_LISTING_CATEGORIES:
            if normalized in category.lower():
                return True, category, None
        return False, None, "I couldn't match that category. Please choose one from the list I provided."

    if field == "quantity":
        number = _extract_number(message)
        if number is None:
            return False, None, "Please share the quantity as a number (you can include decimals)."
        if number <= 0:
            return False, None, "The quantity must be greater than zero."
        return True, number, None

    if field == "unit":
        unit_value = message.strip()
        if not unit_value:
            return False, None, "Please provide a unit (e.g., tons, kg) or type 'skip' to use 'tons'."
        return True, unit_value, None

    if field == "price_per_unit":
        number = _extract_number(message)
        if number is None:
            return False, None, "Please share the price per unit as a number in INR."
        if number < 0:
            return False, None, "The price cannot be negative."
        return True, number, None

    if field == "sale_type":
        clean = re.sub(r"[^a-z0-9 ]", "", lower_message)
        clean = clean.strip()
        words = set(clean.split())
        for sale_type, aliases in SALE_TYPE_ALIASES.items():
            if clean == sale_type:
                return True, sale_type, None
            if clean in aliases:
                return True, sale_type, None
            for alias in aliases:
                if " " in alias and alias in clean:
                    return True, sale_type, None
                if " " not in alias and alias in words:
                    return True, sale_type, None
        return False, None, "Please reply with 'fixed price' or 'auction'."

    if field == "location":
        return True, message.strip(), None

    if field == "description":
        return True, message.strip(), None

    if field == "images":
        urls = []
        separators = re.split(r"\r?\n|,", message)
        for entry in separators:
            trimmed = entry.strip()
            if trimmed:
                urls.append(trimmed)
        return True, urls, None

    return False, None, "I'm not sure how to process that input."


def _format_listing_flow_acknowledgement(field: str, value) -> str:
    if field == "material_name" and value:
        return f"Great, we'll list it as **{value}**."
    if field == "title":
        return "Got it – I'll use your custom headline." if value else "No problem, I'll generate a headline for you."
    if field == "category" and value:
        return f"Category set to **{value}**."
    if field == "quantity" and value is not None:
        quantity_display = format(value, 'g') if isinstance(value, (int, float)) else value
        return f"Quantity captured as **{quantity_display}**."
    if field == "unit" and value:
        return f"Unit noted as **{value}**."
    if field == "price_per_unit" and value is not None:
        if isinstance(value, (int, float)):
            return f"Price per unit recorded as **₹{value:,.2f}**."
        return "Price per unit recorded."
    if field == "sale_type" and value:
        label = "Fixed price" if value == "fixed_price" else "Auction"
        return f"Sale type selected: **{label}**."
    if field == "location" and value:
        return f"We'll show the location as **{value}**."
    if field == "description":
        return "Description added." if value else "No worries, you can add a description later."
    if field == "images":
        if value:
            return f"Captured {len(value)} image link{'s' if len(value) != 1 else ''}."
        return "No images for now — you can add them later if you'd like."
    return ""


def _submit_listing_from_flow(flow_data: Dict[str, Any], user: Dict) -> dict:
    payload = {
        "title": (flow_data.get("title") or f"{flow_data['material_name']} Listing").strip(),
        "material_name": flow_data["material_name"],
        "category": flow_data["category"],
        "quantity": float(flow_data["quantity"]),
        "unit": (flow_data.get("unit") or "tons").strip() or "tons",
        "price_per_unit": float(flow_data["price_per_unit"]),
        "sale_type": flow_data["sale_type"],
        "location": flow_data["location"],
        "description": flow_data.get("description") or None,
        "seller_company": user.get("company_name") or user.get("username") or "Independent Seller",
        "images": flow_data.get("images") or [],
    }

    submission = ListingSubmission(**payload)

    master_data = listings_load_master_data()
    listings = master_data.get("waste_material_listings", [])

    new_id = max((item.get("id", 0) for item in listings), default=0) + 1
    date_posted = datetime.utcnow().date().isoformat()

    new_listing = {
        "id": new_id,
        "listing_type": "waste_material",
        "title": submission.title,
        "material_name": submission.material_name,
        "category": submission.category,
        "quantity": submission.quantity,
        "unit": submission.unit,
        "price_per_unit": submission.price_per_unit,
        "total_value": round(submission.quantity * submission.price_per_unit, 2),
        "sale_type": submission.sale_type,
        "status": "pending",
        "location": submission.location,
        "seller_company": submission.seller_company,
        "date_posted": date_posted,
        "views": 0,
        "inquiries": 0,
    }

    if submission.description:
        new_listing["description"] = submission.description
    if submission.images:
        new_listing["images"] = submission.images

    listings.append(new_listing)
    master_data["waste_material_listings"] = listings
    listings_save_master_data(master_data)

    logger.info(
        "🧾 New listing created via chatbot for seller %s (listing ID %s)",
        submission.seller_company,
        new_id,
    )

    return listings_format_listing(new_listing)


def _build_listing_summary_message(listing: dict) -> str:
    price_value = listing.get('price')
    if isinstance(price_value, (int, float)):
        price_display = f"₹{price_value:,.2f}"
    elif price_value is not None:
        price_display = str(price_value)
    else:
        price_display = "—"

    quantity_value = listing.get('quantity')
    if isinstance(quantity_value, (int, float)):
        quantity_display = format(quantity_value, 'g')
    else:
        quantity_display = quantity_value or "—"

    unit_display = listing.get('quantity_unit') or ''

    lines = [
        "✅ **Listing submitted successfully!**",
        "",
        f"• **Title:** {listing.get('title', 'N/A')}",
        f"• **Material:** {listing.get('material_name', 'N/A')}",
        f"• **Quantity:** {quantity_display} {unit_display}",
        f"• **Price per unit:** {price_display}",
        f"• **Sale type:** {listing.get('listing_type', 'N/A').replace('_', ' ').title()}",
        f"• **Location:** {listing.get('location', 'N/A')}",
        f"• **Status:** {listing.get('status', 'pending').title()}",
    ]

    detail_path = listing.get("detail_path")
    if detail_path:
        lines.extend([
            "",
            f"🔗 You can review it here: {detail_path}",
        ])

    lines.append("\nI'll keep an eye out for inquiries on this listing.")
    return "\n".join(lines)


def _default_listing_flow_suggestions() -> List[str]:
    return ["Cancel listing creation", "Start over", "Show my listings"]


def _handle_listing_flow_message(flow_key: str, user: Dict, user_message: str) -> Optional[ChatResponse]:
    state = LISTING_FLOW_SESSIONS.get(flow_key)
    if not state:
        return None

    if state.get("pending_confirmation"):
        answer = user_message.strip().lower()
        if answer in {"yes", "y", "publish", "confirm", "yes, publish it"}:
            try:
                listing = _submit_listing_from_flow(state["data"], user)
            except Exception as exc:
                logger.error(f"Error creating listing from structured flow: {exc}")
                _reset_listing_flow(flow_key)
                return ChatResponse(
                    message="Something went wrong while publishing. Please try again or create the listing from your dashboard.",
                    suggestions=["Try again", "Open seller dashboard"],
                )

            _reset_listing_flow(flow_key)
            summary_message = _build_listing_summary_message(listing)
            return ChatResponse(
                message=summary_message,
                suggestions=["Create another listing", "Show my listings", "What else can you help with?"],
                listings=[listing],
            )

        if answer in {"no", "n", "start over", "restart", "no, start over"}:
            _start_listing_flow(flow_key)
            prompt = _get_step_instruction(LISTING_FLOW_FIELDS[0], 0)
            return ChatResponse(
                message="No problem, let's do it step by step.\n\n" + prompt,
                suggestions=_default_listing_flow_suggestions(),
            )

        return ChatResponse(
            message="Please reply with **Yes** to publish or **No** to start over.",
            suggestions=["Yes, publish it", "No, start over"],
        )

    message_lower = user_message.strip().lower()
    if message_lower in {"cancel", "cancel listing", "stop", "exit"}:
        _reset_listing_flow(flow_key)
        return ChatResponse(
            message="Understood — I cancelled the listing setup. Let me know when you want to start again.",
            suggestions=["Start a new listing", "What can you do?"]
        )

    if message_lower in {"start over", "restart", "reset"}:
        _start_listing_flow(flow_key)
        prompt = _get_step_instruction(LISTING_FLOW_FIELDS[0], 0)
        return ChatResponse(
            message="No problem, let's begin again from the top.\n\n" + prompt,
            suggestions=_default_listing_flow_suggestions(),
        )

    current_step_index = state["step_index"]
    current_field = LISTING_FLOW_FIELDS[current_step_index]

    success, value, error = _parse_listing_flow_input(current_field, user_message)
    if not success:
        prompt = _get_step_instruction(current_field, current_step_index)
        return ChatResponse(
            message=f"{error}\n\n{prompt}",
            suggestions=_default_listing_flow_suggestions(),
        )

    state["data"][current_field] = value
    acknowledgement = _format_listing_flow_acknowledgement(current_field, value)

    state["step_index"] += 1

    if state["step_index"] >= LISTING_FLOW_TOTAL_STEPS:
        try:
            listing = _submit_listing_from_flow(state["data"], user)
        except Exception as exc:
            logger.error(f"Error submitting listing via chatbot: {exc}")
            _reset_listing_flow(flow_key)
            return ChatResponse(
                message="I captured your answers but ran into an error while creating the listing. Please try again from the seller dashboard.",
                suggestions=["Open seller dashboard", "Try again later"],
            )

        _reset_listing_flow(flow_key)
        summary_message = _build_listing_summary_message(listing)
        return ChatResponse(
            message=summary_message,
            suggestions=["Create another listing", "Show my listings", "What else can you help with?"],
            listings=[listing],
        )

    next_field = LISTING_FLOW_FIELDS[state["step_index"]]
    prompt = _get_step_instruction(next_field, state["step_index"])
    message_parts = []
    if acknowledgement:
        message_parts.append(acknowledgement)
    message_parts.append("")
    message_parts.append(prompt)
    return ChatResponse(
        message="\n".join(message_parts),
        suggestions=_default_listing_flow_suggestions(),
    )

def extract_keywords_from_message(message: str) -> List[str]:
    """
    Extract keywords from user message for searching listings.
    Returns a list of keywords that might match waste materials or categories.
    """
    message_lower = message.lower()
    keywords = []
    
    # Material keywords
    material_keywords = [
        "plastic", "hdpe", "ldpe", "pp", "pet", "pvc",
        "metal", "steel", "aluminum", "copper", "brass", "iron",
        "paper", "cardboard", "paper",
        "glass", "glassware",
        "rubber", "tire",
        "textile", "fabric", "cotton",
        "ash", "fly ash", "bottom ash",
        "bagasse", "rice husk", "coconut shell", "straw",
        "construction", "concrete", "rubble", "brick",
        "organic", "food waste", "vegetable waste"
    ]
    
    # Check which keywords are in the message
    for keyword in material_keywords:
        if keyword in message_lower:
            keywords.append(keyword)
    
    return keywords


def search_listings_by_keywords(keywords: List[str], location: Optional[str] = None, limit: int = 5) -> List[dict]:
    """
    Search listings based on keywords and return relevant materials.
    """
    try:
        if getattr(settings, "DISABLE_DB", False):
            mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
            with open(mock_path, "r") as f:
                master_data = json.load(f)
            
            listings = master_data.get("waste_material_listings", [])
            # Don't filter by status - show all listings for search
            
            # If no keywords provided, return all active listings
            if not keywords:
                matched_listings = listings.copy()
            else:
                # Filter by keywords
                matched_listings = []
                for listing in listings:
                    title = listing.get("title", "").lower()
                    material = listing.get("material_name", "").lower()
                    category = listing.get("category", "").lower()
                    description = listing.get("description", "").lower() if listing.get("description") else ""
                    
                    # Check if any keyword matches
                    for keyword in keywords:
                        keyword_lower = keyword.lower()
                        if (keyword_lower in title or 
                            keyword_lower in material or 
                            keyword_lower in category or
                            keyword_lower in description):
                            matched_listings.append(listing)
                            break
            
            # Filter by location if provided (prioritize location matches)
            if location:
                location_lower = location.lower()
                location_matches = [l for l in matched_listings if location_lower in l.get("location", "").lower()]
                if location_matches:
                    # Show location matches first, then others if needed
                    matched_listings = location_matches + [l for l in matched_listings if l not in location_matches]
            
            # Format listings
            formatted = []
            for listing in matched_listings[:limit]:
                formatted.append({
                    "id": listing.get("id"),
                    "card_type": "material",
                    "title": listing.get("title"),
                    "material_name": listing.get("material_name"),
                    "category": listing.get("category"),
                    "quantity": listing.get("quantity"),
                    "quantity_unit": listing.get("unit"),
                    "price": listing.get("price_per_unit"),
                    "total_value": listing.get("total_value"),
                    "location": listing.get("location"),
                    "listing_type": listing.get("sale_type"),
                    "seller_company": listing.get("seller_company"),
                    "status": listing.get("status"),
                    "detail_path": f"/listing/{listing.get('id')}"
                })
            
            return formatted
    except Exception as e:
        print(f"Error searching listings: {e}")
    return []


# Machinery query keywords for detection
MACHINERY_QUERY_KEYWORDS = [
    "machinery", "machine", "equipment", "industrial equipment",
    "shredder", "dual-shaft", "extruder", "processing line", "pulp line",
    "carbonization", "furnace", "baler", "spinning", "loom",
    "compressor", "chiller", "boiler", "bottling", "injection", "molding",
    "cnc", "laser", "press brake", "water treatment", "ro plant",
    "shutdown machinery", "liquidation machinery"
]

GENERIC_MACHINERY_TERMS = {
    "machinery", "machine", "equipment", "industrial equipment",
    "shutdown machinery", "liquidation machinery"
}

KNOWN_LOCATIONS = [
    "mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad", "pune", "ahmedabad",
    "coimbatore", "nagpur", "surat", "jaipur", "lucknow", "kanpur", "kochi"
]


def extract_machinery_keywords(message: str) -> List[str]:
    message_lower = message.lower()
    return [keyword for keyword in MACHINERY_QUERY_KEYWORDS if keyword in message_lower]


def search_machinery_by_keywords(keywords: List[str], location: Optional[str] = None, limit: int = 5) -> List[dict]:
    """Search machinery listings using master data."""
    try:
        if getattr(settings, "DISABLE_DB", False):
            mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
            with open(mock_path, "r") as f:
                master_data = json.load(f)

            machinery_sources = master_data.get("machinery_listings", []) + master_data.get("all_shutdown_machinery", [])

            # Deduplicate by ID (shutdown listings share IDs with base list)
            machinery_map = {}
            for machine in machinery_sources:
                machine_id = str(machine.get("id"))
                machinery_map[machine_id] = machine

            machinery_list = list(machinery_map.values())

            if not keywords:
                matched = machinery_list.copy()
            else:
                matched = []
                for machine in machinery_list:
                    fields = " ".join([
                        str(machine.get("title", "")),
                        str(machine.get("machine_type", "")),
                        str(machine.get("category", "")),
                        str(machine.get("brand", "")),
                        str(machine.get("model", "")),
                        str(machine.get("seller_type", "")),
                        str(machine.get("description", ""))
                    ]).lower()

                    for keyword in keywords:
                        keyword_lower = keyword.lower()
                        if keyword_lower and keyword_lower in fields:
                            matched.append(machine)
                            break

            if location:
                location_lower = location.lower()
                location_matches = [m for m in matched if location_lower in str(m.get("location", "")).lower()]
                if location_matches:
                    matched = location_matches + [m for m in matched if m not in location_matches]

            formatted = []
            for machine in matched[:limit]:
                price = machine.get("price_inr") or machine.get("price")
                formatted.append({
                    "id": machine.get("id"),
                    "card_type": "machinery",
                    "title": machine.get("title"),
                    "machine_type": machine.get("machine_type"),
                    "category": machine.get("category"),
                    "brand": machine.get("brand"),
                    "model": machine.get("model"),
                    "condition": machine.get("condition"),
                    "year_of_manufacture": machine.get("year_of_manufacture"),
                    "price": price,
                    "original_price": machine.get("original_price_inr") or machine.get("original_price"),
                    "depreciation_percentage": machine.get("depreciation_percentage"),
                    "location": machine.get("location"),
                    "listing_type": machine.get("sale_type") or machine.get("listing_type") or "machinery",
                    "seller_company": machine.get("seller_company"),
                    "seller_type": machine.get("seller_type"),
                    "status": machine.get("status"),
                    "views": machine.get("views"),
                    "inquiries": machine.get("inquiries"),
                    "detail_path": f"/machinery/{machine.get('id')}",
                    "compatible_materials": machine.get("compatible_materials"),
                    "negotiable": machine.get("negotiable"),
                    "urgency_note": machine.get("urgency_note"),
                })

            return formatted
    except Exception as e:
        print(f"Error searching machinery listings: {e}")

    return []


# Material associations - materials that can be used together for various applications
MATERIAL_ASSOCIATIONS = {
    # Composite Construction Materials
    "composite_construction": {
        "materials": ["Fly Ash", "Bottom Ash", "Concrete Rubble", "Brick Waste"],
        "use": "Create eco-friendly construction blocks and building materials",
        "ratio": "60% Ash + 25% Concrete + 15% Brick Waste"
    },
    # Bio-Composite Materials
    "bio_composite": {
        "materials": ["Bagasse", "Rice Husk", "Straw/Hay", "Coconut Shell"],
        "use": "Produce bio-composite boards, particle boards, and insulation materials",
        "ratio": "Mix in 2:1:1 ratio for optimal strength",
        "for_business": ["bio_composite"]
    },
    # Biomass for Biofuel (corrected)
    "biomass_biofuel": {
        "materials": ["Bagasse", "Rice Husk", "Straw/Hay", "Coconut Shell", "Food Processing Waste"],
        "use": "Convert to biofuel, briquettes, or biomass pellets for energy generation",
        "ratio": "Equal parts for balanced carbon and energy content",
        "for_business": ["biofuel_energy"]
    },
    # Plastic-Aluminum Composites
    "plastic_aluminum": {
        "materials": ["HDPE Scrap", "PP Scrap", "Aluminum Scrap"],
        "use": "Manufacture composite materials for automotive and packaging industries",
        "ratio": "80% Plastic + 20% Aluminum for lightweight products"
    },
    # Paper-Plastic Composites
    "paper_plastic": {
        "materials": ["Cardboard Bales", "Mixed Paper", "PET Bottles", "LDPE Film"],
        "use": "Create recycled packaging materials and composite boards",
        "ratio": "70% Paper + 30% Plastic for water resistance"
    },
    # Construction Mix
    "construction_mix": {
        "materials": ["Fly Ash", "Steel Scrap", "Concrete Rubble"],
        "use": "Produce reinforced concrete and structural elements",
        "ratio": "10% Fly Ash + 5% Steel reinforcement + 85% Concrete aggregate"
    },
    # Organic Fertilizer Mix
    "organic_compost": {
        "materials": ["Food Processing Waste", "Vegetable Waste", "Bagasse", "Rice Husk"],
        "use": "Generate compost through aerobic decomposition for organic farming",
        "ratio": "40% Food waste + 30% Vegetable + 20% Bagasse + 10% Rice Husk",
        "for_business": ["organic_fertilizer"]
    },
    # Textile Fiber Composites
    "textile_fiber": {
        "materials": ["Cotton Scrap", "Fabric Remnants", "PET Bottles"],
        "use": "Create recycled fiber composites for automotive and furniture",
        "ratio": "50% Cotton + 30% Fabric + 20% PET fibers"
    },
    # Glass-Metal Composites
    "glass_metal": {
        "materials": ["Mixed Glass", "Clear Glass", "Aluminum Scrap", "Steel Scrap"],
        "use": "Produce reflective materials and composite surfaces",
        "ratio": "30% Glass + 40% Aluminum + 30% Steel"
    },
    # Rubber Composite
    "rubber_composite": {
        "materials": ["Tire Scrap", "Rubber Crumb", "Steel Scrap"],
        "use": "Manufacture rubberized asphalt and composite flooring",
        "ratio": "60% Rubber + 40% Steel reinforcement"
    },
}

def extract_business_intent(message: str) -> dict:
    """
    Extract business idea and requirements from user message.
    Returns dict with business type, keywords, location, and required materials.
    """
    message_lower = message.lower()
    
    # Business idea mapping with related materials
    business_map = {
        "plastic_recycling": {
            "keywords": ["plastic", "polymer", "recycling", "hdpe", "ldpe", "pp", "pet", "pvc", "plastic recycling", "recycle plastic"],
            "materials": ["HDPE Scrap", "PET Bottles", "PP Scrap", "LDPE Film"],
            "category": "Plastic Waste",
            "use": "Recycle into pellets, sheets, or new products like containers, bags, pipes"
        },
        "paper_products": {
            "keywords": ["paper", "cardboard", "packaging", "printing"],
            "materials": ["Cardboard Bales", "Mixed Paper", "Newspaper"],
            "category": "Paper & Cardboard",
            "use": "Make packaging boxes, tissue paper, or recycled paper products"
        },
        "construction_materials": {
            "keywords": ["construction", "concrete", "cement", "building"],
            "materials": ["Fly Ash", "Bottom Ash", "Concrete Rubble", "Brick Waste"],
            "category": "Industrial Ash",
            "use": "Use as additives in concrete, or process into building blocks"
        },
        "biofuel_energy": {
            "keywords": ["biofuel", "biomass", "energy", "fuel"],
            "materials": ["Bagasse", "Rice Husk", "Straw/Hay", "Coconut Shell"],
            "category": "Agricultural/Biomass",
            "use": "Convert to biofuel, briquettes, or biomass pellets for energy generation"
        },
        "textile_manufacturing": {
            "keywords": ["textile", "fabric", "clothing", "garment"],
            "materials": ["Cotton Scrap", "Textile Waste"],
            "category": "Textile Waste",
            "use": "Recycle into new fabrics, insulation material, or stuffing"
        },
        "metal_refining": {
            "keywords": ["metal", "steel", "aluminum", "copper", "smelting"],
            "materials": ["Steel Scrap", "Aluminum Scrap", "Copper Wire", "Brass Scrap"],
            "category": "Metal Scrap",
            "use": "Smelt and refine into pure metals for manufacturing"
        },
        "glass_production": {
            "keywords": ["glass", "glassware", "bottles"],
            "materials": ["Clear Glass", "Mixed Glass"],
            "category": "Glass",
            "use": "Melt and remold into new glass products or use as aggregate"
        },
        "rubber_production": {
            "keywords": ["rubber", "tire", "mat"],
            "materials": ["Rubber Crumb", "Tire Waste"],
            "category": "Rubber & Tires",
            "use": "Process into rubber mats, flooring, or raw rubber material"
        }
    }
    
    # Extract location if mentioned
    location = None
    for loc in KNOWN_LOCATIONS:
        if loc in message_lower:
            location = loc
            break
    
    # Find matching business types
    matched_businesses = []
    for business_type, details in business_map.items():
        if any(keyword in message_lower for keyword in details["keywords"]):
            matched_businesses.append({
                "type": business_type,
                "keywords": details["keywords"],
                "materials": details["materials"],
                "category": details["category"],
                "use": details["use"]
            })
    
    return {
        "businesses": matched_businesses,
        "location": location,
        "keywords": [kw for biz in matched_businesses for kw in biz["keywords"]] if matched_businesses else []
    }


def extract_manufacturing_intent(message: str) -> dict:
    """
    Extract manufacturing type and requirements from user message.
    Returns dict with keywords, location, and material categories.
    """
    message_lower = message.lower()
    
    # Manufacturing keywords mapping
    manufacturing_map = {
        "plastic": ["plastic", "polymer", "hdpe", "ldpe", "pp", "pet", "pvc", "plastic manufacturing", "plastic products"],
        "metal": ["metal", "steel", "aluminum", "copper", "brass", "iron", "metalworking", "foundry", "metal products"],
        "construction": ["construction", "concrete", "cement", "building", "fly ash", "ash", "construction material"],
        "paper": ["paper", "cardboard", "packaging", "paper products", "paper manufacturing"],
        "textile": ["textile", "fabric", "clothing", "garment", "textile manufacturing"],
        "biofuel": ["biofuel", "biomass", "bagasse", "agricultural", "crop", "organic", "energy"],
        "glass": ["glass", "glassware", "glass manufacturing"],
        "rubber": ["rubber", "tire", "rubber products"],
    }
    
    # Extract location if mentioned
    location = None
    for loc in KNOWN_LOCATIONS:
        if loc in message_lower:
            location = loc
            break
    
    # Find matching manufacturing types
    keywords = []
    categories = []
    for category, terms in manufacturing_map.items():
        if any(term in message_lower for term in terms):
            keywords.extend(terms[:3])  # Add first 3 terms
            categories.append(category)
    
    # If no specific match, return empty keywords to search all listings
    # The search function will handle empty keywords by returning all listings
    
    return {
        "keywords": list(set(keywords))[:5],  # Unique keywords, max 5
        "location": location,
        "categories": categories
    }


def get_chatbot_response(user_message: str, conversation_history: List[ChatMessage] = None) -> ChatResponse:
    """
    Generate intelligent responses based on user queries about the waste marketplace.
    """
    message_lower = user_message.lower()
    
    # Check for BUSINESS IDEA intent first
    business_indicators = [
        "business idea", "start business", "business venture", "entrepreneurship",
        "want to start", "planning to start", "new business", "looking to start"
    ]
    
    if any(indicator in message_lower for indicator in business_indicators):
        # Extract business intent
        intent = extract_business_intent(user_message)
        
        if intent["businesses"]:
            # Generate comprehensive business advice
            response_parts = []
            response_parts.append("🎯 **Perfect! I can help you start your business!**\n\n")
            
            all_listings = []
            for business in intent["businesses"][:3]:  # Limit to 3 businesses
                business_type_name = business["type"].replace("_", " ").title()
                response_parts.append(f"## 💼 {business_type_name}\n\n")
                response_parts.append(f"**How to use these materials:**\n{business['use']}\n\n")
                
                # Search for available materials
                listings = search_listings_by_keywords(
                    [mat.lower() for mat in business["materials"]],
                    intent["location"],
                    limit=5
                )
                all_listings.extend(listings)
                
                # Check for material associations
                association_applicable = None
                for assoc_name, assoc_data in MATERIAL_ASSOCIATIONS.items():
                    materials_in_assoc = set([m.lower() for m in assoc_data["materials"]])
                    materials_requested = set([m.lower() for m in business["materials"]])
                    if materials_requested.intersection(materials_in_assoc):
                        association_applicable = assoc_data
                        break
                
                if association_applicable:
                    response_parts.append(f"### 🔗 **Material Combination Suggestion**\n\n")
                    response_parts.append(f"**Compatible Materials:**\n")
                    for mat in association_applicable["materials"]:
                        response_parts.append(f"• {mat}\n")
                    response_parts.append(f"\n**Best Use:** {association_applicable['use']}\n\n")
                    response_parts.append(f"**Optimal Ratio:** {association_applicable['ratio']}\n\n")
                    response_parts.append("💡 **Pro Tip:** Using these materials together will create more valuable composite products!\n\n")
                
                if listings:
                    response_parts.append("**📦 Available raw materials on our platform:**\n\n")
                    total_cost = 0
                    
                    for idx, listing in enumerate(listings, 1):
                        quantity = listing.get('quantity', 0)
                        price = listing.get('price', 0)
                        total_value = listing.get('total_value', 0)
                        unit = listing.get('quantity_unit', 'units')
                        
                        response_parts.append(f"**{idx}. {listing['title']}**\n")
                        response_parts.append(f"   • Material: {listing['material_name']}\n")
                        response_parts.append(f"   • Available: {quantity} {unit}\n")
                        response_parts.append(f"   • Price: ₹{price:.2f}/{unit}\n")
                        response_parts.append(f"   • **Lot Value: ₹{total_value:.2f}**\n")
                        response_parts.append(f"   • Location: {listing['location']}\n")
                        response_parts.append(f"   • Seller: {listing.get('seller_company', 'N/A')}\n")
                        response_parts.append(f"\n")
                        
                        # Add to total cost (using lot value for simplicity)
                        total_cost += total_value
                    
                    response_parts.append(f"---\n")
                    response_parts.append(f"### 💰 **TOTAL ESTIMATED COST: ₹{total_cost:.2f}**\n\n")
                    response_parts.append(f"💡 **This includes all available materials above.**\n\n")
                else:
                    response_parts.append(f"⚠️ No materials currently available in this category.\n\n")
            
            if intent["location"]:
                response_parts.append(f"📍 Filtered for location: **{intent['location'].title()}**\n\n")
            
            response_parts.append("**🚀 Next Steps:**\n")
            response_parts.append("1. Review the materials and costs above\n")
            response_parts.append("2. Contact sellers directly through the listing page\n")
            response_parts.append("3. Negotiate bulk pricing if ordering multiple materials\n")
            response_parts.append("4. Plan your manufacturing process based on material specifications\n\n")
            
            response_parts.append("Want more specific guidance? Ask about manufacturing processes or material requirements!")
            
            return ChatResponse(
                message="".join(response_parts),
                suggestions=[
                    "Tell me about manufacturing processes",
                    "What equipment do I need?",
                    "Show materials in different location",
                    "How to calculate ROI?"
                ],
                listings=all_listings if all_listings else []
            )
        else:
            # Business idea but couldn't identify specific type
            return ChatResponse(
                message="I'd love to help you start your business! 🌟\n\nTo give you the best raw material recommendations and cost estimates, please tell me:\n\n1️⃣ **What type of business do you want to start?**\n   (e.g., plastic recycling, paper products, biofuel, construction, etc.)\n\n2️⃣ **What location are you interested in?**\n   (e.g., Mumbai, Delhi, Bangalore)\n\n3️⃣ **Any specific requirements?**\n   (e.g., quantity, quality, certification needs)\n\nOnce I know this, I can suggest the perfect raw materials and calculate total costs! 💰",
                suggestions=[
                    "I want to start a plastic recycling business",
                    "Biofuel business ideas",
                    "Construction material business",
                    "What businesses can I start with waste?"
                ]
            )
    
    # Machinery specific queries
    machinery_keywords = extract_machinery_keywords(user_message)
    if machinery_keywords or "machinery" in message_lower or "equipment" in message_lower:
        location = None
        for loc in KNOWN_LOCATIONS:
            if loc in message_lower:
                location = loc
                break

        search_terms = [kw for kw in machinery_keywords if kw not in GENERIC_MACHINERY_TERMS]
        machinery_results = search_machinery_by_keywords(search_terms, location, limit=5)

        if machinery_results:
            primary_cards = machinery_results[:2]
            additional_results = machinery_results[2:]

            response_lines = ["🛠️ **Here are the machinery options available right now:**\n"]

            for idx, machine in enumerate(machinery_results, 1):
                price = machine.get("price")
                price_str = None
                if isinstance(price, (int, float)):
                    price_str = f"₹{price:,.0f}"
                elif isinstance(price, str) and price.strip():
                    price_str = price

                original_price = machine.get("original_price")
                if isinstance(original_price, (int, float)):
                    original_str = f"₹{original_price:,.0f}"
                elif isinstance(original_price, str) and original_price.strip():
                    original_str = original_price
                else:
                    original_str = None

                depreciation = machine.get("depreciation_percentage")
                if isinstance(depreciation, (int, float)):
                    depreciation_str = f"{depreciation:.1f}% savings"
                else:
                    depreciation_str = None

                response_lines.append(f"**{idx}. {machine.get('title', 'Machinery Listing')}**")
                response_lines.append(f"   • Machine Type: {machine.get('machine_type', 'N/A')}")
                response_lines.append(f"   • Condition: {machine.get('condition', 'N/A')} | Status: {machine.get('status', 'N/A')}")
                response_lines.append(f"   • Location: {machine.get('location', 'N/A')} | Seller: {machine.get('seller_company', 'N/A')}")

                price_parts = []
                if price_str:
                    price_parts.append(price_str)
                if original_str:
                    price_parts.append(f"Original {original_str}")
                if depreciation_str:
                    price_parts.append(depreciation_str)

                if price_parts:
                    response_lines.append("   • Pricing: " + " | ".join(price_parts))
                else:
                    response_lines.append("   • Pricing: Contact for price")

                if machine.get("compatible_materials"):
                    compatible = ", ".join(machine["compatible_materials"])
                    response_lines.append(f"   • Works with: {compatible}")

                response_lines.append(f"   • [View Details →]({machine.get('detail_path', '/')})\n")

            if additional_results:
                response_lines.append("ℹ️ Showing cards for the top 2 matches. See above for full details on additional options.")

            if location:
                response_lines.append(f"\n📍 Filter applied: {location.title()}")

            response_lines.append("\nNeed something else? Ask for a specific machine type or location!")

            return ChatResponse(
                message="\n".join(response_lines),
                suggestions=[
                    "Show more shutdown machinery deals",
                    "Do you have any machines in Mumbai?",
                    "What packages include machinery?"
                ],
                listings=primary_cards
            )
        else:
            return ChatResponse(
                message="I couldn't find machinery that matches those keywords right now. Try specifying the machine type (e.g., shredder, extruder, boiler) or a location to narrow the search.",
                suggestions=[
                    "Show available shredders",
                    "Any machinery auctions running?",
                    "List machines in Delhi"
                ]
            )

    # Check for manufacturing/manufacturing unit/raw material intent
    manufacturing_indicators = [
        "manufacturing", "manufacturing unit", "factory", "production", 
        "raw material", "raw materials", "need material", "need materials",
        "looking for material", "looking for materials", "sourcing", "procure"
    ]
    
    if any(indicator in message_lower for indicator in manufacturing_indicators):
        # Extract intent
        intent = extract_manufacturing_intent(user_message)
        
        # Search for relevant listings (even if no keywords, show all)
        listings = search_listings_by_keywords(
            intent["keywords"] if intent["keywords"] else [], 
            intent["location"],
            limit=5
        )
        
        if listings:
            # Format response with listings
            message = "Great! I found some relevant materials for your manufacturing needs:\n\n"
            
            for idx, listing in enumerate(listings, 1):
                price_str = f"₹{listing['price'] or 0:.2f}"
                if listing.get('total_value'):
                    price_str += f" (Total: ₹{listing['total_value']:.2f})"
                
                message += f"**{idx}. {listing['title']}**\n"
                message += f"   • Material: {listing['material_name']}\n"
                message += f"   • Category: {listing['category']}\n"
                message += f"   • Quantity: {listing['quantity']} {listing['quantity_unit']}\n"
                message += f"   • Price: {price_str} per {listing['quantity_unit']}\n"
                message += f"   • Location: {listing['location']}\n"
                message += f"   • Seller: {listing.get('seller_company', 'N/A')}\n"
                message += f"   • Type: {listing['listing_type'].replace('_', ' ').title()}\n"
                message += f"   • [View Details →](/listing/{listing['id']})\n\n"
            
            message += "💡 **Next Steps:**\n"
            message += "• Click on any listing to see full details\n"
            message += "• Contact sellers directly through the listing page\n"
            message += "• Place orders or bids based on listing type\n"
            
            if intent["location"]:
                message += f"\n📍 Showing materials near {intent['location'].title()}"
            else:
                message += "\n🔍 Want materials from a specific location? Just mention it!"
            
            return ChatResponse(
                message=message,
                suggestions=[
                    "Show me materials in Mumbai",
                    "I need cheaper options",
                    "How do I contact sellers?",
                    "Show me auction listings"
                ],
                listings=listings
            )
        else:
            # No listings found
            return ChatResponse(
                message=f"I searched for materials matching your requirements but couldn't find exact matches in our current listings.\n\n💡 **Suggestions:**\n• Try searching with different keywords on the Listings page\n• Check all available categories\n• Browse by location to find nearby suppliers\n• Contact us if you need specific materials\n\nWould you like me to show you all available materials in a specific category?",
                suggestions=[
                    "Show all plastic materials",
                    "Show all metal scrap",
                    "What materials are available?",
                    "Browse all listings"
                ]
            )
    
    # Continue with existing responses...
    # Context-aware responses
    if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
        return ChatResponse(
            message="Hello! 👋 I'm your waste material marketplace assistant. I can help you with:\n\n• Finding waste materials\n• Understanding how to list materials\n• Learning about auctions and bidding\n• Navigating the platform\n• Answering questions about the marketplace\n\nWhat would you like to know?",
            suggestions=["How do I list materials?", "How does bidding work?", "What materials are available?"]
        )
    
    elif any(word in message_lower for word in ["list", "sell", "create listing", "post"]):
        return ChatResponse(
            message="To list waste materials on our marketplace:\n\n1️⃣ **Sign up** as a seller account\n2️⃣ **Navigate** to your dashboard\n3️⃣ **Click** 'Create New Listing'\n4️⃣ **Fill in** details:\n   - Material name and description\n   - Quantity and unit\n   - Price or set as auction\n   - Location\n   - Availability dates\n\n5️⃣ **Submit** your listing for review\n\nListings can be fixed-price or auction-based. Would you like to know more about either option?",
            suggestions=["What's the difference between fixed price and auction?", "How long does listing approval take?"]
        )
    
    elif any(word in message_lower for word in ["buy", "purchase", "order", "how to buy"]):
        return ChatResponse(
            message="Buying waste materials is simple:\n\n**For Fixed-Price Listings:**\n1️⃣ Browse available materials\n2️⃣ Click on a listing to view details\n3️⃣ Enter desired quantity\n4️⃣ Place your order\n5️⃣ Wait for seller confirmation\n\n**For Auction Listings:**\n1️⃣ Find auction listings\n2️⃣ View current highest bid\n3️⃣ Place your bid\n4️⃣ Monitor until auction ends\n\n💡 Tip: Check the seller's company info and material quality ratings before purchasing!",
            suggestions=["How does bidding work?", "What payment methods are accepted?"]
        )
    
    elif any(word in message_lower for word in ["auction", "bid", "bidding", "how to bid"]):
        return ChatResponse(
            message="Our auction system allows real-time bidding:\n\n🎯 **How it works:**\n• Sellers create auction listings with a starting bidשר\n• Buyers place bids higher than the current highest bid\n• Auctions have an end time - highest这是我们 bid at that time wins\n• Real-time updates via WebSocket\n\n⚡ **Tips for bidding:**\n• Set a maximum budget beforehand\n• Bid early to establish interest\n• Monitor auctions closely near end time\n• Your bid must be higher than current highest\n\n💰 **Winning:**\nWhen auction ends, you'll be notified if you won and can proceed with payment.",
            suggestions=["Can I retract a bid?", "What happens if I win an auction?"]
        )
    
    elif any(word in message_lower for word in ["material", "materials", "what materials", "available"]):
        return ChatResponse(
            message="We have a wide variety of waste materials available:\n\n📦 **Categories:**\n• Agricultural/Biomass (bagasse, crop residue)\n• Industrial Ash (fly ash, bottom ash)\n• Plastic Waste (HDPE, LDPE, PP)\n• Metal Scrap (aluminum, steel, copper)\n• Paper & Cardboard\n• Construction & Demolition waste\n• Glass waste\n• Textile Waste\n• Rubber & Tires\n• Organic/Food Waste\n\n🔍 You can browse all materials using our search and filter system. Need help finding something specific?",
            suggestions=["How do I search for materials?", "What are the most popular materials?"]
        )
    
    elif any(word in message_lower for word in ["search", "filter", "find", "browse"]):
        return ChatResponse(
            message="Our search and filter system helps you find exactly what you need:\n\n🔍 **Search options:**\n• Material name (e.g., 'fly ash', 'plastic')\n• Location\n• Category\n• Price range\n• Listing type (fixed price or auction)\n\n💡 **Tips:**\n• Use the search bar at the top of listings page\n• Combine multiple filters for precise results\n• Check the map view for nearby materials\n• Save searches for quick access later\n\nTry it out on the Listings page!",
            suggestions=["How do I save a search?", "Can I get notifications for new listings?"]
        )
    
    elif any(word in message_lower for word in ["price", "cost", "expensive", "cheap", "pricing"]):
        return ChatResponse(
            message="Pricing on our marketplace:\n\n💰 **Pricing Models:**\n• **Fixed Price:** Set price per unit, shown upfront\n• **Auction:** Starting bid set, final price determined by bidding\n\n💵 **Factors affecting price:**\n• Material quality and grade\n• Quantity available (bulk discounts may apply)\n• Location (transportation costs)\n• Market demand\n• Material type and rarity\n\n📊 Prices are shown per unit (tons, kg, etc.) and total value for the lot.\n\nWould you like to know how to negotiate prices with sellers?",
            suggestions=["How do I contact sellers?", "Are there bulk discounts?"]
        )
    
    elif any(word in message_lower for word in ["contact", "seller", "message", "communicate"]):
        return ChatResponse(
            message="Contacting sellers:\n\n💬 **Ways to communicate:**\n• View seller company info on listing page\n• Send inquiries through the listing inquiry feature\n• Check seller ratings and reviews\n\n📧 **Inquiry feature:**\n• Click 'Contact Seller' on any listing\n• Send a message with your questions\n• Receive responses via email or dashboard notifications\n\n⭐ **Before contacting:**\n• Review the listing details thoroughly\n• Check seller's response time and ratings\n• Prepare specific questions about material quality, quantity, or logistics\n\nNeed help with something else?",
            suggestions=["How do I see seller ratings?", "What information should I include in an inquiry?"]
        )
    
    elif any(word in message_lower for word in ["account", "profile", "dashboard", "my account"]):
        return ChatResponse(
            message="Your account dashboard provides comprehensive insights:\n\n👤 **For Sellers:**\n• View all your listings and their status\n• Track sales and revenue\n• Manage orders and inquiries\n• See auction performance\n• Analytics and statistics\n\n🛒 **For Buyers:**\n• View your orders and purchase history\n• Track your bids and auction activity\n• Saved listings and searches\n• Inquiries you've sent\n\n🔐 **Account Settings:**\n• Update profile information\n• Change password\n• Manage notifications\n• View transaction history\n\nAccess your dashboard from the top navigation menu!",
            suggestions=["How do I update my profile?", "What notifications can I receive?"]
        )
    
    elif any(word in message_lower for word in ["help", "support", "question", "problem"]):
        return ChatResponse(
            message="I'm here to help! 🌟\n\n**Common topics I can assist with:**\n• Listing materials for sale\n• Browsing and buying materials\n• Understanding auctions and bidding\n• Account management\n• Searching and filtering\n• Platform navigation\n\n**If you need further assistance:**\n• Check our FAQ section (link in footer)\n• Contact support via email: support@wastemarket.com\n• Review our Help Center articles\n\nJust ask me anything about the marketplace and I'll do my best to help!",
            suggestions=["How do I report a problem?", "Where is the FAQ section?"]
        )
    
    elif any(word in message_lower for word in ["thank", "thanks", "appreciate"]):
        return ChatResponse(
            message="You're welcome! 😊\n\nI'm always here to help you navigate the waste material marketplace. Feel free to ask if you have any other questions!\n\nHappy trading! ♻️",
            suggestions=["How do I get started?", "What are the benefits of using this platform?"]
        )
    
    elif any(word in message_lower for word in ["benefits", "why", "advantage", "why use"]):
        return ChatResponse(
            message="Why use our waste material marketplace? 🌟\n\n✅ **For Sellers:**\n• Turn waste into revenue\n• Reach larger buyer network\n• Flexible pricing options\n• Easy listing management\n• Real-time analytics\n\n✅ **For Buyers:**\n• Wide variety of materials\n• Competitive pricing\n• Quality verified sellers\n• Easy search and comparison\n• Secure transactions\n\n🌍 **Environmental Impact:**\n• Promotes circular economy\n• Reduces landfill waste\n• Supports sustainable practices\n• Contributes to ESG goals\n\nReady to get started?",
            suggestions=["How do I sign up?", "Is it free to list materials?"]
        )
    
    else:
        # Default response with helpful suggestions
        return ChatResponse(
            message=f"I understand you're asking about '{user_message}'. Let me help you with our waste material marketplace!\n\nI can assist you with:\n• Finding and listing materials\n• Understanding auctions and bidding\n• Navigating the platform\n• Account management\n• And much more!\n\nTry asking me something like:\n• 'How do I list materials?'\n• 'How does bidding work?'\n• 'What materials are available?'\n\nOr be more specific about what you'd like to know!",
            suggestions=["How do I list materials?", "What materials are available?", "How does bidding work?"]
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    """
    Chat endpoint with hybrid Watson integration:
    - Watson Orchestrate Agent for waste data queries (knowledge base)
    - Watsonx.ai for general queries
    - Rule-based fallback if both unavailable
    """
    try:
        if not request.message or not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        current_user = _get_user_from_request(http_request)
        user_role = current_user.get("role") if current_user else None

        if not current_user and request.user_role:
            current_user = {
                "role": request.user_role,
                "email": request.user_email,
                "username": request.user_username,
                "company_name": request.user_company,
            }
            user_role = request.user_role
            logger.info("👤 Using request-provided user context (no auth token detected)")
        if user_role:
            logger.info(f"👤 Chatbot invoked by user role: {user_role}")

        flow_key = _get_listing_flow_key(current_user)
        seller_intent = _should_start_listing_flow(request.message)

        if user_role == "seller" and flow_key:
            # Continue ongoing listing flow if present
            existing_flow = LISTING_FLOW_SESSIONS.get(flow_key)
            if existing_flow:
                flow_response = _handle_listing_flow_message(flow_key, current_user, request.message)
                if flow_response:
                    return flow_response

        if seller_intent:
            if not current_user:
                return ChatResponse(
                    message="You're almost there! Please sign in as a seller so I can publish the listing on your behalf.",
                    suggestions=["Log in", "How do I become a seller?"],
                )

            if user_role != "seller":
                return ChatResponse(
                    message="Listing creation is available for seller accounts. Switch to your seller profile (or apply to become one) and ask me again when you're ready!",
                    suggestions=["How do I become a seller?", "Show me seller benefits"],
                )

            structured = _call_watson_listing_parser(request.message)

            if not flow_key:
                flow_key = _get_listing_flow_key(current_user)
                if not flow_key:
                    flow_key = f"seller-{current_user.get('id') or current_user.get('username') or datetime.utcnow().timestamp()}"

            if structured:
                LISTING_FLOW_SESSIONS[flow_key] = {
                    "step_index": LISTING_FLOW_TOTAL_STEPS,
                    "data": structured,
                    "started_at": datetime.utcnow().isoformat(),
                    "pending_confirmation": True,
                }
                preview = _format_structured_listing_preview(structured)
                return ChatResponse(
                    message="Great! I'll collect the details to publish your listing.\n\n" + preview,
                    suggestions=["Yes, publish it", "No, start over"],
                )

            _start_listing_flow(flow_key)
            prompt = _get_step_instruction(LISTING_FLOW_FIELDS[0], 0)
            return ChatResponse(
                message="Great! I'll collect the details to publish your listing.\n\n" + prompt,
                suggestions=_default_listing_flow_suggestions(),
            )

        # Try Watson services first if available
        if WATSON_AVAILABLE and get_watson_service:
            watson_service = get_watson_service()
            
            # Check if watson services are enabled
            if watson_service.orchestrate_enabled or watson_service.watsonx_enabled:
                logger.info("🤖 Using Watson services for response")
                message_lower = request.message.lower()
                
                # Prepare context data (listings, materials, etc.)
                context_data = {}
                keywords = extract_keywords_from_message(request.message)
                
                if keywords:
                    listings = search_listings_by_keywords(keywords, limit=5)
                    if listings:
                        context_data["listings"] = listings

                # Add machinery context if applicable
                machinery_keywords = extract_machinery_keywords(request.message)
                if machinery_keywords or "machinery" in message_lower or "equipment" in message_lower:
                    search_terms = [kw for kw in machinery_keywords if kw not in GENERIC_MACHINERY_TERMS]
                    machinery_location = None
                    for loc in KNOWN_LOCATIONS:
                        if loc in message_lower:
                            machinery_location = loc
                            break
                    machinery_results = search_machinery_by_keywords(search_terms, machinery_location, limit=5)
                    if machinery_results:
                        context_data["machinery"] = machinery_results
                
                # Generate AI response
                ai_response = watson_service.generate_response(
                    message=request.message,
                    conversation_history=[
                        {"role": msg.role, "content": msg.content} 
                        for msg in request.conversation_history
                    ],
                    context_data=context_data if context_data else None,
                    user_role=user_role
                )
                
                if ai_response:
                    logger.info("✅ Returned AI-generated response from Watson")
                    listings_payload = []
                    machinery_context = context_data.get("machinery")
                    if machinery_context:
                        listings_payload.extend(machinery_context[:2])
                    if len(listings_payload) < 2:
                        material_context = context_data.get("listings")
                        if material_context:
                            listings_payload.extend(material_context[: 2 - len(listings_payload)])

                    return ChatResponse(
                        message=ai_response,
                        suggestions=[
                            "Tell me about waste materials",
                            "What are the prices?",
                            "How do I start a business?",
                        ],
                        listings=listings_payload
                    )
                else:
                    logger.warning("⚠️  Watson returned no response, falling back to rules")
        
        # Fallback to rule-based response
        logger.info("📝 Using rule-based response (fallback)")
        response = get_chatbot_response(request.message, request.conversation_history)
        return response
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")


@router.get("/suggestions")
async def get_suggestions():
    """
    Get default conversation starter suggestions.
    """
    return {
        "suggestions": [
            "How do I list materials?",
            "What materials are available?",
            "How does bidding work?",
            "How do I contact sellers?",
            "What are the benefits of this platform?"
        ]
    }
