"""
Initialize JSON data files from mock data
"""
import json
from pathlib import Path
from app.utils.mock_storage import JSONStorage, USERS_FILE, LISTINGS_FILE
from datetime import datetime

def setup_initial_data():
    """Copy mock data to JSON storage"""
    
    # Copy listings from mock data
    mock_path = Path(__file__).resolve().parent / "mock_data" / "waste_streams_dashboard_data.json"
    if mock_path.exists():
        with open(mock_path, 'r') as f:
            mock_data = json.load(f)
        
        listings = mock_data.get("listings", [])
        
        # Convert mock listing format to our storage format
        converted_listings = []
        for listing in listings:
            converted_listings.append({
                'id': listing.get('id'),
                'title': listing.get('title'),
                'description': f"{listing.get('material_name', '')} - Premium Quality Waste Material available in {listing.get('location', '')}",
                'material_name': listing.get('material_name'),
                'category': listing.get('category'),
                'quantity': listing.get('quantity'),
                'quantity_unit': listing.get('unit', 'tons'),
                'price': listing.get('price_per_unit'),
                'total_value': listing.get('total_value'),
                'listing_type': listing.get('listing_type', 'fixed_price'),
                'status': listing.get('status', 'active'),
                'location': listing.get('location'),
                'images': listing.get('images', []),
                'seller_id': listing.get('seller_id', 1),  # Default to user 1
                'created_at': listing.get('date_posted', datetime.now().isoformat()),
                'updated_at': None
            })
        
        # Save to JSON storage
        JSONStorage.save(LISTINGS_FILE, converted_listings)
        print(f"✓ Loaded {len(converted_listings)} listings from mock data")
    
    # Create an admin user if users.json doesn't exist
    if not USERS_FILE.exists():
        admin_user = {
            'id': 1,
            'email': 'admin@example.com',
            'username': 'admin',
            'hashed_password': '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  # secret
            'company_name': 'Admin Company',
            'role': 'admin',
            'is_active': True,
            'created_at': datetime.now().isoformat(),
            'updated_at': None
        }
        JSONStorage.save(USERS_FILE, [admin_user])
        print("✓ Created admin user (email: admin@example.com, password: secret)")
    
    # Create empty arrays for other data files
    from app.utils.mock_storage import ORDERS_FILE, AUCTIONS_FILE, BIDS_FILE
    if not ORDERS_FILE.exists() or ORDERS_FILE.stat().st_size == 0:
        JSONStorage.save(ORDERS_FILE, [])
    if not AUCTIONS_FILE.exists() or AUCTIONS_FILE.stat().st_size == 0:
        JSONStorage.save(AUCTIONS_FILE, [])
    if not BIDS_FILE.exists() or BIDS_FILE.stat().st_size == 0:
        JSONStorage.save(BIDS_FILE, [])
    print("✓ Created empty data files for orders, auctions, and bids")
    
    print("\n✓ JSON data setup complete!")
    print(f"✓ Data stored in: {Path(__file__).resolve().parent / 'data'}")

if __name__ == "__main__":
    setup_initial_data()

