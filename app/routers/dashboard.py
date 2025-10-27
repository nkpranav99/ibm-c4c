from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.order import Order
from app.models.auction import Auction, Bid
from app.schemas.listing import ListingResponse
from app.schemas.order import OrderResponse
from app.schemas.auction import AuctionResponse
from app.utils.auth import get_current_active_user
import json

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/seller")
def get_seller_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Seller's listings
    listings = db.query(Listing).filter(Listing.seller_id == current_user.id).all()
    for listing in listings:
        listing.images = json.loads(listing.images) if listing.images else []
    
    # Active listings count
    active_listings = [l for l in listings if l.status == "active"]
    
    # Total sales
    total_sales = db.query(func.sum(Order.total_price)).join(Listing).filter(
        Listing.seller_id == current_user.id,
        Order.status == "completed"
    ).scalar() or 0
    
    # Pending orders
    pending_orders = db.query(Order).join(Listing).filter(
        Listing.seller_id == current_user.id,
        Order.status == "pending"
    ).all()
    
    # Active auctions
    active_auctions = db.query(Auction).join(Listing).filter(
        Listing.seller_id == current_user.id,
        Auction.is_active == True
    ).all()
    
    return {
        "total_listings": len(listings),
        "active_listings": len(active_listings),
        "sold_listings": len([l for l in listings if l.status == "sold"]),
        "total_sales": float(total_sales),
        "pending_orders": len(pending_orders),
        "active_auctions": len(active_auctions),
        "recent_listings": [
            {
                "id": l.id,
                "title": l.title,
                "status": l.status,
                "created_at": l.created_at
            } for l in listings[-5:]
        ],
        "recent_orders": [
            {
                "id": o.id,
                "quantity": o.quantity,
                "total_price": o.total_price,
                "status": o.status,
                "created_at": o.created_at
            } for o in pending_orders[-5:]
        ]
    }


@router.get("/buyer")
def get_buyer_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Buyer's orders
    orders = db.query(Order).filter(Order.buyer_id == current_user.id).all()
    
    # Total spent
    total_spent = db.query(func.sum(Order.total_price)).filter(
        Order.buyer_id == current_user.id,
        Order.status == "completed"
    ).scalar() or 0
    
    # Active bids
    active_bids = db.query(Bid).join(Auction).filter(
        Bid.bidder_id == current_user.id,
        Auction.is_active == True
    ).all()
    
    # Winning bids
    winning_bids = db.query(Bid).filter(
        Bid.bidder_id == current_user.id,
        Bid.is_winning == True
    ).all()
    
    return {
        "total_orders": len(orders),
        "completed_orders": len([o for o in orders if o.status == "completed"]),
        "pending_orders": len([o for o in orders if o.status == "pending"]),
        "total_spent": float(total_spent),
        "active_bids": len(active_bids),
        "winning_bids": len(winning_bids),
        "recent_orders": [
            {
                "id": o.id,
                "quantity": o.quantity,
                "total_price": o.total_price,
                "status": o.status,
                "created_at": o.created_at
            } for o in orders[-5:]
        ],
        "recent_bids": [
            {
                "id": b.id,
                "amount": b.amount,
                "is_winning": b.is_winning,
                "created_at": b.created_at
            } for b in active_bids[-5:]
        ]
    }


@router.get("/seller/listings")
def get_seller_listings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    listings = db.query(Listing).filter(Listing.seller_id == current_user.id).all()
    for listing in listings:
        listing.images = json.loads(listing.images) if listing.images else []
    return listings


@router.get("/buyer/my-bids")
def get_my_bids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    bids = db.query(Bid).join(Auction).filter(
        Bid.bidder_id == current_user.id
    ).order_by(Bid.created_at.desc()).all()
    return bids

