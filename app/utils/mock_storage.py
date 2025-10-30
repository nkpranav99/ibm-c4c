"""
JSON-based file storage for all application data
Replaces SQLAlchemy database with simple JSON files
"""
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from app.models.user import UserRole


# Base storage directory
STORAGE_DIR = Path(__file__).resolve().parents[2] / "data"
STORAGE_DIR.mkdir(exist_ok=True)

# JSON file paths
USERS_FILE = STORAGE_DIR / "users.json"
LISTINGS_FILE = STORAGE_DIR / "listings.json"
ORDERS_FILE = STORAGE_DIR / "orders.json"
AUCTIONS_FILE = STORAGE_DIR / "auctions.json"
BIDS_FILE = STORAGE_DIR / "bids.json"


class JSONStorage:
    """Simple JSON-based storage with file persistence"""
    
    @staticmethod
    def load(file_path: Path) -> List[Dict]:
        """Load data from JSON file"""
        if not file_path.exists():
            return []
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    @staticmethod
    def save(file_path: Path, data: List[Dict]):
        """Save data to JSON file"""
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    @staticmethod
    def get_next_id(data_list: List[Dict]) -> int:
        """Generate next sequential ID"""
        if not data_list:
            return 1
        return max(item.get('id', 0) for item in data_list) + 1


# User storage
def load_users() -> List[Dict]:
    """Load all users from JSON"""
    return JSONStorage.load(USERS_FILE)

def save_users(users: List[Dict]):
    """Save users to JSON"""
    JSONStorage.save(USERS_FILE, users)

def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email"""
    users = load_users()
    return next((u for u in users if u.get('email') == email), None)

def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Get user by ID"""
    users = load_users()
    return next((u for u in users if u.get('id') == user_id), None)

def get_user_by_username(username: str) -> Optional[Dict]:
    """Get user by username"""
    users = load_users()
    return next((u for u in users if u.get('username') == username), None)

def create_user(user_data: Dict) -> Dict:
    """Create a new user"""
    users = load_users()
    new_user = {
        'id': JSONStorage.get_next_id(users),
        **user_data,
        'created_at': datetime.now().isoformat(),
        'updated_at': None
    }
    users.append(new_user)
    save_users(users)
    return new_user

def update_user(user_id: int, user_data: Dict) -> Optional[Dict]:
    """Update an existing user"""
    users = load_users()
    for i, user in enumerate(users):
        if user.get('id') == user_id:
            users[i] = {**user, **user_data, 'updated_at': datetime.now().isoformat()}
            save_users(users)
            return users[i]
    return None


# Listing storage
def load_listings() -> List[Dict]:
    """Load all listings from JSON"""
    return JSONStorage.load(LISTINGS_FILE)

def save_listings(listings: List[Dict]):
    """Save listings to JSON"""
    JSONStorage.save(LISTINGS_FILE, listings)

def get_listing_by_id(listing_id: int) -> Optional[Dict]:
    """Get listing by ID"""
    listings = load_listings()
    return next((l for l in listings if l.get('id') == listing_id), None)

def create_listing(listing_data: Dict) -> Dict:
    """Create a new listing"""
    listings = load_listings()
    new_listing = {
        'id': JSONStorage.get_next_id(listings),
        **listing_data,
        'created_at': datetime.now().isoformat(),
        'updated_at': None
    }
    listings.append(new_listing)
    save_listings(listings)
    return new_listing

def update_listing(listing_id: int, listing_data: Dict) -> Optional[Dict]:
    """Update an existing listing"""
    listings = load_listings()
    for i, listing in enumerate(listings):
        if listing.get('id') == listing_id:
            listings[i] = {**listing, **listing_data, 'updated_at': datetime.now().isoformat()}
            save_listings(listings)
            return listings[i]
    return None


# Order storage
def load_orders() -> List[Dict]:
    """Load all orders from JSON"""
    return JSONStorage.load(ORDERS_FILE)

def save_orders(orders: List[Dict]):
    """Save orders to JSON"""
    JSONStorage.save(ORDERS_FILE, orders)

def get_order_by_id(order_id: int) -> Optional[Dict]:
    """Get order by ID"""
    orders = load_orders()
    return next((o for o in orders if o.get('id') == order_id), None)

def get_orders_by_user(user_id: int) -> List[Dict]:
    """Get all orders for a user"""
    orders = load_orders()
    return [o for o in orders if o.get('buyer_id') == user_id]

def create_order(order_data: Dict) -> Dict:
    """Create a new order"""
    orders = load_orders()
    new_order = {
        'id': JSONStorage.get_next_id(orders),
        **order_data,
        'created_at': datetime.now().isoformat(),
        'updated_at': None
    }
    orders.append(new_order)
    save_orders(orders)
    return new_order


# Auction storage
def load_auctions() -> List[Dict]:
    """Load all auctions from JSON"""
    return JSONStorage.load(AUCTIONS_FILE)

def save_auctions(auctions: List[Dict]):
    """Save auctions to JSON"""
    JSONStorage.save(AUCTIONS_FILE, auctions)

def get_auction_by_id(auction_id: int) -> Optional[Dict]:
    """Get auction by ID"""
    auctions = load_auctions()
    return next((a for a in auctions if a.get('id') == auction_id), None)

def get_auction_by_listing_id(listing_id: int) -> Optional[Dict]:
    """Get auction by listing ID"""
    auctions = load_auctions()
    return next((a for a in auctions if a.get('listing_id') == listing_id), None)

def create_auction(auction_data: Dict) -> Dict:
    """Create a new auction"""
    auctions = load_auctions()
    new_auction = {
        'id': JSONStorage.get_next_id(auctions),
        **auction_data,
        'created_at': datetime.now().isoformat(),
        'updated_at': None
    }
    auctions.append(new_auction)
    save_auctions(auctions)
    return new_auction

def update_auction(auction_id: int, auction_data: Dict) -> Optional[Dict]:
    """Update an existing auction"""
    auctions = load_auctions()
    for i, auction in enumerate(auctions):
        if auction.get('id') == auction_id:
            auctions[i] = {**auction, **auction_data, 'updated_at': datetime.now().isoformat()}
            save_auctions(auctions)
            return auctions[i]
    return None


# Bid storage
def load_bids() -> List[Dict]:
    """Load all bids from JSON"""
    return JSONStorage.load(BIDS_FILE)

def save_bids(bids: List[Dict]):
    """Save bids to JSON"""
    JSONStorage.save(BIDS_FILE, bids)

def get_bid_by_id(bid_id: int) -> Optional[Dict]:
    """Get bid by ID"""
    bids = load_bids()
    return next((b for b in bids if b.get('id') == bid_id), None)

def get_bids_by_auction(auction_id: int) -> List[Dict]:
    """Get all bids for an auction"""
    bids = load_bids()
    return [b for b in bids if b.get('auction_id') == auction_id]

def get_bids_by_user(user_id: int) -> List[Dict]:
    """Get all bids by a user"""
    bids = load_bids()
    return [b for b in bids if b.get('bidder_id') == user_id]

def create_bid(bid_data: Dict) -> Dict:
    """Create a new bid"""
    bids = load_bids()
    new_bid = {
        'id': JSONStorage.get_next_id(bids),
        **bid_data,
        'created_at': datetime.now().isoformat(),
        'is_winning': False
    }
    bids.append(new_bid)
    save_bids(bids)
    return new_bid


