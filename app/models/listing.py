"""
Listing models - Using simple enums for JSON storage
"""
import enum


class ListingStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    INACTIVE = "inactive"


class ListingType(str, enum.Enum):
    FIXED_PRICE = "fixed_price"
    AUCTION = "auction"

