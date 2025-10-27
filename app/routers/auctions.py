from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from app.database import get_db
from app.models.auction import Auction, Bid
from app.models.listing import Listing
from app.models.user import User
from app.schemas.auction import AuctionResponse, BidCreate, BidResponse
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/api/auctions", tags=["Auctions"])


@router.get("/active", response_model=List[AuctionResponse])
def get_active_auctions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    auctions = db.query(Auction).filter(
        Auction.is_active == True,
        Auction.end_time > datetime.utcnow()
    ).offset(skip).limit(limit).all()
    return auctions


@router.get("/{listing_id}", response_model=AuctionResponse)
def get_auction_for_listing(listing_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.listing_id == listing_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("/{auction_id}/bid", response_model=BidResponse, status_code=status.HTTP_201_CREATED)
def place_bid(
    auction_id: int,
    bid: BidCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if not auction.is_active:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    if datetime.utcnow() > auction.end_time:
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    # Check if bidder is not the seller
    listing = db.query(Listing).filter(Listing.id == auction.listing_id).first()
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot bid on your own auction")
    
    # Validate bid amount
    if bid.amount <= (auction.current_highest_bid or auction.starting_bid):
        raise HTTPException(
            status_code=400, 
            detail=f"Bid must be higher than current highest bid (${auction.current_highest_bid or auction.starting_bid})"
        )
    
    # Update all previous bids to not winning
    db.query(Bid).filter(Bid.auction_id == auction_id).update({"is_winning": False})
    
    # Create new bid
    db_bid = Bid(
        amount=bid.amount,
        auction_id=auction_id,
        bidder_id=current_user.id,
        is_winning=True
    )
    
    # Update auction with new highest bid
    auction.current_highest_bid = bid.amount
    
    db.add(db_bid)
    db.commit()
    db.refresh(db_bid)
    
    return db_bid


@router.get("/{auction_id}/bids", response_model=List[BidResponse])
def get_auction_bids(auction_id: int, db: Session = Depends(get_db)):
    bids = db.query(Bid).filter(Bid.auction_id == auction_id).order_by(Bid.amount.desc()).all()
    return bids


@router.post("/{listing_id}/create-auction", response_model=AuctionResponse, status_code=status.HTTP_201_CREATED)
def create_auction_for_listing(
    listing_id: int,
    starting_bid: float,
    duration_hours: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create auction for this listing")
    
    # Check if auction already exists
    existing = db.query(Auction).filter(Auction.listing_id == listing_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Auction already exists for this listing")
    
    end_time = datetime.utcnow() + timedelta(hours=duration_hours)
    
    auction = Auction(
        starting_bid=starting_bid,
        current_highest_bid=starting_bid,
        end_time=end_time,
        listing_id=listing_id
    )
    
    db.add(auction)
    db.commit()
    db.refresh(auction)
    
    return auction


@router.post("/{auction_id}/end", response_model=AuctionResponse)
def end_auction(
    auction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    listing = db.query(Listing).filter(Listing.id == auction.listing_id).first()
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to end this auction")
    
    # Find winning bid
    winning_bid = db.query(Bid).filter(
        Bid.auction_id == auction_id,
        Bid.is_winning == True
    ).first()
    
    if winning_bid:
        auction.winner_id = winning_bid.bidder_id
        listing.status = "sold"
    
    auction.is_active = False
    db.commit()
    db.refresh(auction)
    
    return auction

