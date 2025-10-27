from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.order import Order
from app.models.auction import Auction
from app.utils.auth import get_admin_user
import json

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    total_users = db.query(User).count()
    total_listings = db.query(Listing).count()
    total_orders = db.query(Order).count()
    active_auctions = db.query(Auction).filter(Auction.is_active == True).count()
    
    total_revenue = db.query(func.sum(Order.total_price)).filter(
        Order.status == "completed"
    ).scalar() or 0
    
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_listings = db.query(Listing).order_by(Listing.created_at.desc()).limit(5).all()
    
    for listing in recent_listings:
        listing.images = json.loads(listing.images) if listing.images else []
    
    return {
        "total_users": total_users,
        "total_listings": total_listings,
        "total_orders": total_orders,
        "active_auctions": active_auctions,
        "total_revenue": float(total_revenue),
        "recent_users": recent_users,
        "recent_listings": recent_listings
    }


@router.get("/users")
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/listings")
def get_all_listings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    listings = db.query(Listing).offset(skip).limit(limit).all()
    for listing in listings:
        listing.images = json.loads(listing.images) if listing.images else []
    return listings


@router.get("/orders")
def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    orders = db.query(Order).offset(skip).limit(limit).all()
    return orders


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/listings/{listing_id}")
def delete_listing_admin(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    db.delete(listing)
    db.commit()
    
    return {"message": "Listing deleted successfully"}

