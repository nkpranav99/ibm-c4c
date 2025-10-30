from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timedelta
from app.schemas.auction import AuctionResponse, BidCreate, BidResponse
from app.utils.auth import get_current_active_user
from app.utils.mock_storage import (
    get_auction_by_listing_id, get_auction_by_id,
    create_auction, update_auction,
    get_bids_by_auction, create_bid,
    get_listing_by_id, load_auctions, load_bids, save_bids
)
import json

router = APIRouter(prefix="/api/auctions", tags=["Auctions"])


@router.get("/active")
def get_active_auctions(skip: int = 0, limit: int = 100):
    """Get active auctions"""
    # For JSON storage, return empty list or sample data
    # Auctions can be added through the create endpoint
    return []


@router.get("/{listing_id}")
def get_auction_for_listing(listing_id: int):
    """Get auction for a specific listing"""
    auction = get_auction_by_listing_id(listing_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("/{auction_id}/bid", status_code=status.HTTP_201_CREATED)
def place_bid(auction_id: int, bid: BidCreate, current_user=Depends(get_current_active_user)):
    """Place a bid on an auction"""
    auction = get_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Check if auction is active
    if not auction.get('is_active', True):
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    # Check auction end time
    end_time = datetime.fromisoformat(auction['end_time'].replace('Z', '+00:00'))
    if datetime.utcnow() > end_time:
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    # Get listing to check seller
    listing = get_listing_by_id(auction['listing_id'])
    if listing['seller_id'] == current_user.get('id'):
        raise HTTPException(status_code=400, detail="Cannot bid on your own auction")
    
    # Validate bid amount
    current_highest = auction.get('current_highest_bid', auction.get('starting_bid', 0))
    if bid.amount <= current_highest:
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be higher than current highest bid (${current_highest})"
        )
    
    # Update all previous bids to not winning
    bids = load_bids()
    for existing_bid in bids:
        if existing_bid.get('auction_id') == auction_id:
            existing_bid['is_winning'] = False
    save_bids(bids)
    
    # Create new bid
    new_bid = create_bid({
        'amount': bid.amount,
        'auction_id': auction_id,
        'bidder_id': current_user.get('id'),
        'is_winning': True
    })
    
    # Update auction with new highest bid
    update_auction(auction_id, {'current_highest_bid': bid.amount})
    
    return new_bid


@router.get("/{auction_id}/bids")
def get_auction_bids(auction_id: int):
    """Get all bids for an auction"""
    bids = get_bids_by_auction(auction_id)
    # Sort by amount descending
    bids.sort(key=lambda x: x.get('amount', 0), reverse=True)
    return bids
