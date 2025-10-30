"""
User models - Using simple enum for JSON storage
"""
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"

