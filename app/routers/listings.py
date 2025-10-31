from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.schemas.listing import ListingCreate, ListingUpdate, ListingResponse, ListingSubmission
from app.utils.auth import get_current_active_user, get_seller_user
from app.config import settings
import json
from pathlib import Path

router = APIRouter(prefix="/api/listings", tags=["Listings"])

DATA_PATH = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"


def load_master_data() -> dict:
    with open(DATA_PATH, "r") as f:
        return json.load(f)


def save_master_data(data: dict):
    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)


def format_listing(listing: dict) -> dict:
    return {
        "id": listing.get("id"),
        "title": listing.get("title"),
        "description": listing.get("description")
        or f"{listing.get('material_name', '')} - Premium Quality Waste Material available in {listing.get('location', '')}",
        "material_name": listing.get("material_name"),
        "category": listing.get("category"),
        "quantity": listing.get("quantity"),
        "quantity_unit": listing.get("unit"),
        "price": listing.get("price_per_unit"),
        "total_value": listing.get("total_value"),
        "listing_type": listing.get("sale_type"),
        "sale_type": listing.get("sale_type"),
        "category_type": listing.get("category_type", "raw_material"),
        "status": listing.get("status"),
        "location": listing.get("location"),
        "images": listing.get("images", []),
        "seller_company": listing.get("seller_company"),
        "date_posted": listing.get("date_posted"),
        "views": listing.get("views", 0),
        "inquiries": listing.get("inquiries", 0),
        "availability_from": listing.get("availability_from", listing.get("date_posted")),
        "availability_to": listing.get("availability_to", "2026-12-31T00:00:00Z"),
        "condition": listing.get("condition"),
    }


@router.get("")
def get_listings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    material_name: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    listing_type: Optional[str] = None
):
    # Using JSON storage (always enabled)
    if True:
        master_data = load_master_data()
        listings = master_data.get("waste_material_listings", [])
        
        # For demo/POC: Show ALL listings to showcase all 20 materials
        # No filtering - show everything including expired listings
        # In production, you would filter: listings = [l for l in listings if l.get("status") == "active"]
        
        # Apply filters
        if search:
            search_lower = search.lower()
            listings = [l for l in listings if 
                       search_lower in l.get("title", "").lower() or 
                       search_lower in l.get("material_name", "").lower() or
                       search_lower in l.get("category", "").lower()]
        
        if material_name:
            material_lower = material_name.lower()
            listings = [l for l in listings if material_lower in l.get("material_name", "").lower()]
        
        if location:
            location_lower = location.lower()
            listings = [l for l in listings if location_lower in l.get("location", "").lower()]
        
        if listing_type:
            listings = [l for l in listings if l.get("sale_type") == listing_type]
        
        if min_price is not None:
            listings = [l for l in listings if l.get("price_per_unit", 0) >= min_price]
        
        if max_price is not None:
            listings = [l for l in listings if l.get("price_per_unit", 0) <= max_price]
        
        # Convert to expected format
        formatted_listings = [format_listing(listing) for listing in listings]

        # Apply pagination
        formatted_listings = formatted_listings[skip:skip + limit]
        return formatted_listings


@router.get("/{listing_id}")
def get_listing(listing_id: int):
    # Using JSON storage (always enabled)
    if True:
        master_data = load_master_data()
        listings = master_data.get("waste_material_listings", [])
        listing = next((l for l in listings if l.get("id") == listing_id), None)
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        return format_listing(listing)
    
    raise HTTPException(status_code=404, detail="Listing not found")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_listing(listing: ListingSubmission, current_user = Depends(get_seller_user)):
    master_data = load_master_data()
    listings = master_data.get("waste_material_listings", [])

    new_id = max((item.get("id", 0) for item in listings), default=0) + 1
    seller_company = listing.seller_company or current_user.get("company_name") or current_user.get("username") or "Independent Seller"
    date_posted = datetime.utcnow().date().isoformat()

    new_listing = {
        "id": new_id,
        "listing_type": "waste_material",
        "title": listing.title,
        "material_name": listing.material_name,
        "category": listing.category,
        "quantity": listing.quantity,
        "unit": listing.unit,
        "price_per_unit": listing.price_per_unit,
        "total_value": round(listing.quantity * listing.price_per_unit, 2),
        "sale_type": listing.sale_type,
        "status": "pending",
        "location": listing.location,
        "seller_company": seller_company,
        "date_posted": date_posted,
        "views": 0,
        "inquiries": 0,
    }

    if listing.description:
        new_listing["description"] = listing.description
    if listing.images:
        new_listing["images"] = listing.images

    listings.append(new_listing)
    master_data["waste_material_listings"] = listings
    save_master_data(master_data)

    return format_listing(new_listing)


# PUT and DELETE endpoints removed - using JSON storage only
# These endpoints would need to be reimplemented using mock_storage functions
