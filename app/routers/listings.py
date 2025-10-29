from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingUpdate, ListingResponse
from app.utils.auth import get_current_active_user
from app.config import settings
import json
from pathlib import Path

router = APIRouter(prefix="/api/listings", tags=["Listings"])


@router.post("", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
def create_listing(listing: ListingCreate, db: Session = Depends(get_db), 
                   current_user: User = Depends(get_current_active_user)):
    db_listing = Listing(
        **listing.dict(exclude={'images'}),
        images=json.dumps(listing.images),
        seller_id=current_user.id
    )
    db.add(db_listing)
    db.commit()
    db.refresh(db_listing)
    
    # Convert images back to list for response
    db_listing.images = json.loads(db_listing.images) if db_listing.images else []
    
    return db_listing


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
    # Use mock data if DB is disabled
    if getattr(settings, "DISABLE_DB", False):
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
    
    # Original database query for when DB is enabled
    # This will only execute if DB is enabled, so we need db dependency
    def _get_listings_from_db():
        db = next(get_db())
        try:
            query = db.query(Listing).filter(Listing.status == "active")
            
            if search:
                query = query.filter(
                    or_(
                        Listing.title.ilike(f"%{search}%"),
                        Listing.description.ilike(f"%{search}%"),
                        Listing.material_name.ilike(f"%{search}%")
                    )
                )
            
            if material_name:
                query = query.filter(Listing.material_name.ilike(f"%{material_name}%"))
            
            if location:
                query = query.filter(Listing.location.ilike(f"%{location}%"))
            
            if min_price is not None:
                query = query.filter(Listing.price >= min_price)
            
            if max_price is not None:
                query = query.filter(Listing.price <= max_price)
            
            if listing_type:
                query = query.filter(Listing.listing_type == listing_type)
            
            listings = query.offset(skip).limit(limit).all()
            
            # Convert images from JSON string to list
            for listing in listings:
                listing.images = json.loads(listing.images) if listing.images else []
            
            return listings
        finally:
            db.close()
    
    return _get_listings_from_db()


@router.get("/{listing_id}")
def get_listing(listing_id: int):
    # Use mock data if DB is disabled
    if getattr(settings, "DISABLE_DB", False):
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
    
    # Original database query
    db = next(get_db())
    try:
        listing = db.query(Listing).filter(Listing.id == listing_id).first()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        listing.images = json.loads(listing.images) if listing.images else []
        return listing
    finally:
        db.close()


@router.put("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: int,
    listing_update: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.seller_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this listing")
    
    update_data = listing_update.dict(exclude_unset=True)
    if 'images' in update_data:
        update_data['images'] = json.dumps(update_data['images'])
    
    for key, value in update_data.items():
        setattr(listing, key, value)
    
    db.commit()
    db.refresh(listing)
    
    listing.images = json.loads(listing.images) if listing.images else []
    return listing


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.seller_id != current_user.id and current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this listing")
    
    db.delete(listing)
    db.commit()
    
    return None
