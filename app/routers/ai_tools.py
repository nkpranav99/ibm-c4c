from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
from app.config import settings
from app.services.watson_service import get_watson_service
import json
import os

router = APIRouter(prefix="/api/ai", tags=["ai-tools"])


@router.get("/demo/info")
def get_demo_info():
    sample_prompts = [
        "I need 20 tons of HDPE scrap in Mumbai under ₹40/kg",
        "Compare top 3 PET suppliers near Pune by price and ESG",
        "Draft an RFQ for 10 tons recycled aluminum with ISRI specs",
        "Estimate carbon impact for moving 5 tons of cardboard 150km",
    ]
    return {
        "demo": True,
        "orchestrate_enabled": settings.WATSON_ENABLED,
        "watsonx_enabled": settings.WATSONX_ENABLED,
        "sample_prompts": sample_prompts,
    }


@router.post("/rfq/build")
async def build_rfq(
    title: Optional[str] = Form(None),
    material: Optional[str] = Form(None),
    quantity_tons: Optional[float] = Form(None),
    max_price_per_kg: Optional[float] = Form(None),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    spec_file: Optional[UploadFile] = File(None),
):
    extracted: Dict[str, Any] = {}
    if spec_file is not None:
        # Lightweight stub: try to read text, otherwise ignore
        try:
            content = (await spec_file.read()).decode("utf-8", errors="ignore")
            # naive cues
            if "HDPE" in content.upper() and not material:
                material = "HDPE"
            if "PET" in content.upper() and not material:
                material = "PET"
            extracted["raw_preview"] = content[:500]
        except Exception:
            pass

    rfq = {
        "title": title or f"RFQ for {material or 'material'}",
        "material": material or "HDPE",
        "quantity_tons": quantity_tons or 10.0,
        "max_price_per_kg": max_price_per_kg or 40.0,
        "location": location or "Mumbai",
        "terms": {
            "incoterms": "EXW",
            "payment": "Net 15",
            "quality": "Supplier certifications required; moisture < 2%",
        },
        "notes": notes or "",
        "derived_from_file": spec_file.filename if spec_file else None,
        "extracted": extracted,
    }

    # Suggested recipients (mock) from data/users.json if present
    suggestions: List[Dict[str, Any]] = []
    users_path = os.path.join("data", "users.json")
    if os.path.exists(users_path):
        try:
            with open(users_path, "r", encoding="utf-8") as f:
                users = json.load(f)
                for u in users:
                    if u.get("role") == "seller":
                        suggestions.append(
                            {
                                "supplier_id": u.get("id"),
                                "name": u.get("name"),
                                "trust_score": u.get("trust_score", 0.72),
                                "esg_score": u.get("esg_score", 0.64),
                            }
                        )
        except Exception:
            pass

    return {"rfq": rfq, "suggested_suppliers": suggestions[:5]}


@router.post("/suppliers/compare")
def compare_suppliers(payload: Dict[str, Any]):
    supplier_ids: List[str] = payload.get("supplier_ids", [])
    criteria: List[str] = payload.get("criteria", ["price", "distance", "trust", "esg"])  # noqa

    # Load mock listings/users to derive metrics
    users_index: Dict[str, Dict[str, Any]] = {}
    users_path = os.path.join("data", "users.json")
    if os.path.exists(users_path):
        try:
            with open(users_path, "r", encoding="utf-8") as f:
                for u in json.load(f):
                    users_index[str(u.get("id"))] = u
        except Exception:
            pass

    comparisons: List[Dict[str, Any]] = []
    for sid in supplier_ids:
        u = users_index.get(str(sid), {})
        comparisons.append(
            {
                "supplier_id": sid,
                "name": u.get("name", f"Supplier {sid}"),
                "price_per_kg": u.get("avg_price", 38.0),
                "distance_km": u.get("distance_km", 45),
                "trust_score": u.get("trust_score", 0.75),
                "esg_score": u.get("esg_score", 0.62),
                "on_time_rate": u.get("on_time_rate", 0.9),
                "certifications": u.get("certifications", ["ISO 9001"]),
                "explain": {
                    "price": "Based on last 30 listings",
                    "distance": "Approximate from profile location",
                    "trust": "Composite of reviews, returns, disputes",
                    "esg": "Self-declared + 3rd party if available",
                },
            }
        )

    return {"criteria": criteria, "suppliers": comparisons}


@router.post("/insights/carbon")
def carbon_estimate(payload: Dict[str, Any]):
    material = payload.get("material", "HDPE")
    weight_tons = float(payload.get("weight_tons", 10.0))
    distance_km = float(payload.get("distance_km", 100.0))
    mode = payload.get("mode", "truck")

    # very rough factors (kg CO2e per ton-km)
    factors = {"truck": 0.1, "rail": 0.02, "ship": 0.01}
    factor = factors.get(mode, 0.1)
    transport = weight_tons * distance_km * factor

    # simple material processing offset (placeholders)
    recycled_offsets = {"HDPE": -300, "PET": -250, "ALUMINUM": -900}
    offset = recycled_offsets.get(material.upper(), -150)

    total_kg_co2e = transport + offset
    return {
        "material": material,
        "weight_tons": weight_tons,
        "distance_km": distance_km,
        "mode": mode,
        "transport_kg_co2e": round(transport, 2),
        "processing_offset_kg_co2e": round(offset, 2),
        "total_kg_co2e": round(total_kg_co2e, 2),
        "explain": {
            "transport": f"{factor} kg CO2e per ton-km × {weight_tons} × {distance_km}",
            "offset": "Placeholder recycled-material credit",
        },
    }


@router.get("/market/overview")
def market_overview():
    # Try to read failover dashboard trends for quick visuals
    path = os.path.join("failover-data", "waste_streams_dashboard_data.json")
    alt_path = os.path.join("mock_data", "waste_streams_dashboard_data.json")
    dataset = {}
    for p in [path, alt_path]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    dataset = json.load(f)
                break
            except Exception:
                pass
    # Provide a small subset for performance
    return {
        "highlights": dataset.get("highlights", [])[:10] if isinstance(dataset, dict) else [],
        "price_trends": dataset.get("price_trends", {}) if isinstance(dataset, dict) else {},
        "supply_hotspots": dataset.get("supply_hotspots", [])[:20] if isinstance(dataset, dict) else [],
        "alerts": [
            {"type": "price_drop", "material": "PET", "region": "Pune", "delta": -6.2},
            {"type": "new_supply", "material": "HDPE", "region": "Mumbai", "qty_tons": 40},
        ],
    }


@router.post("/negotiation/action")
def negotiation_action(payload: Dict[str, Any]):
    action = payload.get("action", "negotiate_price")
    listing = payload.get("listing", {})
    supplier = payload.get("supplier", {})
    target_price = payload.get("target_price")

    base = {
        "recipient": supplier.get("name", "Supplier"),
        "listing_title": listing.get("title", "your listing"),
    }

    if action == "negotiate_price":
        message = (
            f"Hello {base['recipient']}, for {base['listing_title']}, could you offer ₹{target_price or 'XX'}/kg? "
            "We can confirm pickup this week and prepay 20% on agreement."
        )
        rationale = [
            "Recent market price declined ~4% week-over-week",
            "Short-haul pickup reduces logistics cost",
        ]
    elif action == "request_certifications":
        message = (
            f"Hello {base['recipient']}, please share current certifications (ISO 9001/14001, any EPR docs) "
            "and 3 recent quality reports for due diligence."
        )
        rationale = ["Compliance and quality validation prior to RFQ award"]
    elif action == "propose_pickup":
        message = (
            f"Hello {base['recipient']}, proposing pickup window Fri 10:00–14:00. "
            "We will bring pallets and cover loading. Please confirm."
        )
        rationale = ["Optimizing for carrier availability and distance"]
    else:
        message = f"Draft a professional message to {base['recipient']} regarding {base['listing_title']}."
        rationale = ["Generic action"]

    return {
        "action": action,
        "draft_message": message,
        "rationale": rationale,
        "requires_approval": True,
    }


@router.post("/kb/qa")
def kb_qa(payload: Dict[str, Any]):
    question: str = payload.get("question", "")
    kb_context: Dict[str, Any] = payload.get("context", {})

    # Try watson hybrid service if available; otherwise return simple stub
    answer = None
    try:
        svc = get_watson_service()
        answer = svc.generate_response(question, conversation_history=[], context_data=kb_context)
    except Exception:
        answer = None

    if not answer:
        answer = (
            "Based on current policy documents, exports require appropriate permits and EPR compliance. "
            "Ensure material classification matches HS code and retain manifests."
        )

    citations = [
        {"title": "Waste Export Policy", "source": "uploads/policies/waste_export_policy.pdf", "confidence": 0.82},
        {"title": "EPR Guidelines 2024", "source": "uploads/policies/epr_2024.pdf", "confidence": 0.77},
    ]
    return {"question": question, "answer": answer, "citations": citations}


@router.post("/chat/stream")
def chat_stream(payload: Dict[str, Any]):
    message: str = payload.get("message", "")
    context: Dict[str, Any] = payload.get("context", {})

    # Simple server-sent style chunking (no real SSE headers here, but chunked response)
    chunks = [
        "Thinking about your request...\n",
        "Finding relevant suppliers and price trends...\n",
        "Drafting an answer...\n",
        f"Final: For '{message}', consider HDPE suppliers within 50km and target ₹38–41/kg.\n",
    ]

    def generator():
        for c in chunks:
            yield c

    return StreamingResponse(generator(), media_type="text/plain")


@router.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    # Stub: return a fake transcript preview
    content = await file.read()
    length = len(content)
    return {"transcript": "Hello, I need 10 tons of HDPE next week.", "bytes": length}


@router.post("/i18n/translate")
def translate_text(payload: Dict[str, Any]):
    text = payload.get("text", "")
    target = payload.get("target", "hi-IN")
    # Minimal stub; echo with tag
    return {"target": target, "translated": f"[{target}] {text}"}


