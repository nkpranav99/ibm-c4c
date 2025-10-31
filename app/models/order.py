"""
Order models - Using simple enums for JSON storage
"""
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    PROCESSING = "processing"


class SellerApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"

