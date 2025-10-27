from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.listing import ListingType, ListingStatus


class ListingBase(BaseModel):
    title: str
    description: str
    material_name: str
    quantity: float
    quantity_unit: str = "tons"
    price: float
    listing_type: ListingType
    location: str
    availability_from: datetime
    availability_to: datetime


class ListingCreate(ListingBase):
    images: Optional[List[str]] = []


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    material_name: Optional[str] = None
    quantity: Optional[float] = None
    quantity_unit: Optional[str] = None
    price: Optional[float] = None
    listing_type: Optional[ListingType] = None
    status: Optional[ListingStatus] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None
    availability_from: Optional[datetime] = None
    availability_to: Optional[datetime] = None


class ListingResponse(ListingBase):
    id: int
    status: ListingStatus
    images: List[str]
    seller_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

