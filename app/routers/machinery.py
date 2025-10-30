from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.utils.auth import get_current_active_user
from app.config import settings
import json
from pathlib import Path

router = APIRouter(prefix="/api/machinery", tags=["Machinery"])


def get_mock_or_current_user():
    # In mock mode, return a minimal user object without validating a token
    if getattr(settings, "DISABLE_DB", False):
        return {"id": 1, "role": "buyer"}
    return Depends(get_current_active_user)


@router.get("")
def get_machinery(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    machine_type: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    seller_type: Optional[str] = None
):
    """Get all machinery listings including regular and shutdown machinery"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    # Get both regular and shutdown machinery
    regular_machinery = master_data.get("machinery_listings", [])
    shutdown_machinery = master_data.get("all_shutdown_machinery", [])
    all_machinery = regular_machinery + shutdown_machinery
    
    # Apply filters
    if search:
        search_lower = search.lower()
        all_machinery = [m for m in all_machinery if 
                        search_lower in m.get("title", "").lower() or 
                        search_lower in m.get("machine_type", "").lower() or
                        search_lower in m.get("category", "").lower() or
                        search_lower in m.get("brand", "").lower()]
    
    if machine_type:
        all_machinery = [m for m in all_machinery if machine_type.lower() in m.get("machine_type", "").lower()]
    
    if category:
        all_machinery = [m for m in all_machinery if category.lower() in m.get("category", "").lower()]
    
    if location:
        location_lower = location.lower()
        all_machinery = [m for m in all_machinery if location_lower in m.get("location", "").lower()]
    
    if min_price is not None:
        all_machinery = [m for m in all_machinery if m.get("price_inr", 0) >= min_price]
    
    if max_price is not None:
        all_machinery = [m for m in all_machinery if m.get("price_inr", 0) <= max_price]
    
    if condition:
        all_machinery = [m for m in all_machinery if condition.lower() in m.get("condition", "").lower()]
    
    if seller_type:
        seller_type_lower = seller_type.lower()
        all_machinery = [m for m in all_machinery if seller_type_lower in m.get("seller_type", "").lower()]
    
    # Apply pagination
    all_machinery = all_machinery[skip:skip + limit]
    return all_machinery


@router.get("/shutdown")
def get_shutdown_machinery(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """Get only shutdown/liquidation machinery"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    shutdown_machinery = master_data.get("all_shutdown_machinery", [])
    return shutdown_machinery[skip:skip + limit]


@router.get("/packages")
def get_bundled_packages():
    """Get bundled packages (complete setups with discounts)"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    packages = master_data.get("bundled_packages", [])
    return packages


@router.get("/shutdown-companies")
def get_shutdown_companies():
    """Get companies that are liquidating"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    companies = master_data.get("company_shutdowns", [])
    return companies


@router.get("/{machinery_id}")
def get_machinery_detail(machinery_id: str):
    """Get details of a specific machinery"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    # Check in regular machinery
    regular_machinery = master_data.get("machinery_listings", [])
    machinery = next((m for m in regular_machinery if m.get("id") == machinery_id), None)
    
    # If not found, check in shutdown machinery
    if not machinery:
        shutdown_machinery = master_data.get("all_shutdown_machinery", [])
        machinery = next((m for m in shutdown_machinery if m.get("id") == machinery_id), None)
    
    if not machinery:
        raise HTTPException(status_code=404, detail="Machinery not found")
    
    return machinery


@router.get("/associations/{material_name}")
def get_compatible_machinery(material_name: str):
    """Get machinery that can process a specific material"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    associations = master_data.get("material_machinery_associations", [])
    
    material_assoc = next(
        (assoc for assoc in associations if assoc.get("material_name", "").lower() == material_name.lower()),
        None
    )
    
    if not material_assoc:
        raise HTTPException(status_code=404, detail=f"No machinery found for material: {material_name}")
    
    return material_assoc


@router.get("/stats/summary")
def get_machinery_stats():
    """Get summary statistics of machinery listings"""
    mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
    with open(mock_path, "r") as f:
        master_data = json.load(f)
    
    summary = master_data.get("summary_metrics", {})
    shutdown_summary = master_data.get("shutdown_companies_summary", {})
    
    regular_machinery = master_data.get("machinery_listings", [])
    shutdown_machinery = master_data.get("all_shutdown_machinery", [])
    
    return {
        "total_regular_machinery": len(regular_machinery),
        "total_shutdown_machinery": len(shutdown_machinery),
        "total_machinery": len(regular_machinery) + len(shutdown_machinery),
        "active_machinery_listings": summary.get("active_machinery_listings", 0),
        "total_machinery_listings": summary.get("total_machinery_listings", 0),
        "shutdown_companies": summary.get("shutdown_companies", 0),
        "liquidation_machinery_count": summary.get("liquidation_machinery_count", 0),
        "urgent_deals_count": summary.get("urgent_deals_count", 0),
        "total_estimated_value_inr": shutdown_summary.get("total_estimated_value_inr", 0),
        "average_discount_percentage": shutdown_summary.get("average_discount_percentage", 0)
    }

