from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

from app.models.order import SellerApplicationStatus


class ListingSummary(BaseModel):
    listing_id: int
    title: str
    status: str
    listing_type: str
    quantity: float
    quantity_unit: str
    price: float
    location: Optional[str] = None
    condition: Optional[str] = None


class SellerApplicationBase(BaseModel):
    marketplace_name: str = Field(..., max_length=255)
    contact_email: EmailStr
    company_name: Optional[str] = Field(None, max_length=255)
    experience_level: str = Field(..., max_length=50)
    material_focus: Optional[str] = Field(None, max_length=1000)

    listing_title: str = Field(..., max_length=255)
    listing_description: Optional[str] = Field(None, max_length=2000)
    listing_material_name: str = Field(..., max_length=255)
    listing_category: str = Field(..., max_length=255)
    listing_quantity: float = Field(..., gt=0)
    listing_quantity_unit: str = Field(..., max_length=50)
    listing_price: float = Field(..., ge=0)
    listing_sale_type: str = Field(..., pattern="^(fixed_price|auction)$")
    listing_location: str = Field(..., max_length=255)
    listing_condition: str = Field(..., pattern="^(new|like_new|refurbished|used|needs_repair)$")
    listing_category_type: str = Field(..., pattern="^(raw_material|machinery)$")


class SellerApplicationRequest(SellerApplicationBase):
    pass


class SellerApplicationResponse(SellerApplicationBase):
    id: int
    user_id: int
    status: SellerApplicationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    listing_id: Optional[int] = None
    listing_status: Optional[str] = None
    listing: Optional[ListingSummary] = None

    class Config:
        from_attributes = True


