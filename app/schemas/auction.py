from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.auth import UserResponse


class AuctionResponse(BaseModel):
    id: int
    starting_bid: float
    current_highest_bid: Optional[float]
    end_time: datetime
    is_active: bool
    listing_id: int
    winner_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    bids: Optional[List['BidResponse']] = []

    class Config:
        from_attributes = True


class BidCreate(BaseModel):
    amount: float
    auction_id: int


class BidResponse(BaseModel):
    id: int
    amount: float
    is_winning: bool
    auction_id: int
    bidder_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Update forward references
AuctionResponse.model_rebuild()

