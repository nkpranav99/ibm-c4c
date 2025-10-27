from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    INACTIVE = "inactive"


class ListingType(str, enum.Enum):
    FIXED_PRICE = "fixed_price"
    AUCTION = "auction"


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    material_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    quantity_unit = Column(String, default="tons")  # tons, kg, etc.
    price = Column(Float, nullable=False)
    listing_type = Column(Enum(ListingType), default=ListingType.FIXED_PRICE)
    status = Column(Enum(ListingStatus), default=ListingStatus.ACTIVE)
    location = Column(String, nullable=False)
    images = Column(Text)  # JSON array of image paths
    availability_from = Column(DateTime(timezone=True), nullable=False)
    availability_to = Column(DateTime(timezone=True), nullable=False)
    
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    seller = relationship("User", back_populates="listings")
    orders = relationship("Order", back_populates="listing", cascade="all, delete-orphan")
    auctions = relationship("Auction", back_populates="listing", cascade="all, delete-orphan", uselist=False)

