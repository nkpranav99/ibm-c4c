from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.order import OrderStatus
from app.schemas.listing import ListingResponse


class OrderBase(BaseModel):
    quantity: float
    total_price: float
    buyer_notes: Optional[str] = None


class OrderCreate(OrderBase):
    listing_id: int


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    buyer_notes: Optional[str] = None


class OrderResponse(OrderBase):
    id: int
    status: OrderStatus
    listing_id: int
    buyer_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

