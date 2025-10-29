from fastapi import APIRouter, Depends
from app.utils.auth import get_current_active_user
from app.config import settings
import json
from pathlib import Path

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def get_mock_or_current_user():
    # In mock mode, return a minimal user object without validating a token
    if getattr(settings, "DISABLE_DB", False):
        return {"id": 1, "role": "seller"}
    return Depends(get_current_active_user)

@router.get("/seller")
def get_seller_dashboard(current_user = Depends(get_mock_or_current_user)):
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "dashboard_seller.json"
    master_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        data = json.load(f)
    # Enrich with master analytics if available
    if master_path.exists():
        try:
            with open(master_path, "r") as mf:
                master = json.load(mf)
            data["analytics"] = master
        except Exception:
            pass
    return data


@router.get("/buyer")
def get_buyer_dashboard(current_user = Depends(get_mock_or_current_user)):
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "dashboard_buyer.json"
    master_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        data = json.load(f)
    # Enrich with master analytics if available
    if master_path.exists():
        try:
            with open(master_path, "r") as mf:
                master = json.load(mf)
            data["analytics"] = master
        except Exception:
            pass
    return data


@router.get("/seller/listings")
def get_seller_listings(current_user = Depends(get_mock_or_current_user)):
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "seller_listings.json"
    with open(mock_path, "r") as f:
        data = json.load(f)
    return data


@router.get("/buyer/my-bids")
def get_my_bids(current_user = Depends(get_mock_or_current_user)):
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "buyer_bids.json"
    with open(mock_path, "r") as f:
        data = json.load(f)
    return data

