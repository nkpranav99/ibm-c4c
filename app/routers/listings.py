from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.schemas.listing import ListingCreate, ListingUpdate, ListingResponse
from app.utils.auth import get_current_active_user
from app.config import settings
import json
from pathlib import Path

router = APIRouter(prefix="/api/listings", tags=["Listings"])


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
        mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
        with open(mock_path, "r") as f:
            master_data = json.load(f)
        
        listings = master_data.get("listings", [])
        
        # For demo/POC: Show active and pending listings (more products to showcase)
        # You can change this to just "active" for production
        listings = [l for l in listings if l.get("status") in ["active", "pending"]]
        
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
            listings = [l for l in listings if l.get("listing_type") == listing_type]
        
        if min_price is not None:
            listings = [l for l in listings if l.get("price_per_unit", 0) >= min_price]
        
        if max_price is not None:
            listings = [l for l in listings if l.get("price_per_unit", 0) <= max_price]
        
        # Convert to expected format
        formatted_listings = []
        for listing in listings:
            formatted_listings.append({
                "id": listing.get("id"),
                "title": listing.get("title"),
                "description": f"{listing.get('material_name', '')} - Premium Quality Waste Material available in {listing.get('location', '')}",
                "material_name": listing.get("material_name"),
                "category": listing.get("category"),
                "quantity": listing.get("quantity"),
                "quantity_unit": listing.get("unit"),
                "price": listing.get("price_per_unit"),
                "total_value": listing.get("total_value"),
                "listing_type": listing.get("listing_type"),
                "status": listing.get("status"),
                "location": listing.get("location"),
                "images": [],
                "seller_company": listing.get("seller_company"),
                "date_posted": listing.get("date_posted"),
                "views": listing.get("views", 0),
                "inquiries": listing.get("inquiries", 0)
            })
        
        # Apply pagination
        formatted_listings = formatted_listings[skip:skip + limit]
        return formatted_listings


@router.get("/{listing_id}")
def get_listing(listing_id: int):
    # Using JSON storage (always enabled)
    if True:
        mock_path = Path(__file__).resolve().parents[2] / "mock_data" / "waste_streams_dashboard_data.json"
        with open(mock_path, "r") as f:
            master_data = json.load(f)
        
        listings = master_data.get("listings", [])
        listing = next((l for l in listings if l.get("id") == listing_id), None)
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Convert to expected format
        return {
            "id": listing.get("id"),
            "title": listing.get("title"),
            "description": f"{listing.get('material_name', '')} - Premium Quality Waste Material available in {listing.get('location', '')}",
            "material_name": listing.get("material_name"),
            "category": listing.get("category"),
            "quantity": listing.get("quantity"),
            "quantity_unit": listing.get("unit"),
            "price": listing.get("price_per_unit"),
            "total_value": listing.get("total_value"),
            "listing_type": listing.get("listing_type"),
            "status": listing.get("status"),
            "location": listing.get("location"),
            "images": [],
            "seller_company": listing.get("seller_company"),
            "date_posted": listing.get("date_posted"),
            "views": listing.get("views", 0),
            "inquiries": listing.get("inquiries", 0),
            "availability_from": listing.get("date_posted"),
            "availability_to": "2026-12-31T00:00:00Z"
        }
    
    raise HTTPException(status_code=404, detail="Listing not found")


# PUT and DELETE endpoints removed - using JSON storage only
# These endpoints would need to be reimplemented using mock_storage functions
