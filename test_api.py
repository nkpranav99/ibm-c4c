"""
Example API testing script
You need to have requests installed: pip install requests
"""
import requests
import json

BASE_URL = "http://localhost:8000"


def test_api():
    print("=" * 60)
    print("Testing Waste Material Marketplace API")
    print("=" * 60)
    
    # Test health endpoint
    print("\n1. Testing Health Endpoint")
    print("-" * 60)
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
        print("Make sure the server is running!")
        return
    
    # Register a test user
    print("\n2. Registering Test User")
    print("-" * 60)
    register_data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
        "company_name": "Test Industries",
        "role": "seller"
    }
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        if response.status_code == 201:
            print("✓ User registered successfully")
            user_data = response.json()
            print(f"  User ID: {user_data['id']}")
            print(f"  Email: {user_data['email']}")
            print(f"  Role: {user_data['role']}")
        else:
            print(f"✗ Failed to register user: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Login
    print("\n3. Testing Login")
    print("-" * 60)
    login_data = {
        "username": "test@example.com",
        "password": "testpass123"
    }
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            data=login_data
        )
        if response.status_code == 200:
            print("✓ Login successful")
            token_data = response.json()
            token = token_data['access_token']
            print(f"  Token: {token[:20]}...")
            
            # Test authenticated endpoint
            print("\n4. Testing Authenticated Endpoint (Get Current User)")
            print("-" * 60)
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
            if response.status_code == 200:
                print("✓ Authenticated request successful")
                print(f"  Current user: {response.json()['email']}")
            
            # Test creating a listing
            print("\n5. Creating Test Listing")
            print("-" * 60)
            listing_data = {
                "title": "Organic Waste Material",
                "description": "High-quality organic waste available in bulk",
                "material_name": "Bagasse",
                "quantity": 50.0,
                "quantity_unit": "tons",
                "price": 5000.0,
                "listing_type": "fixed_price",
                "location": "Mumbai, Maharashtra",
                "availability_from": "2024-01-01T00:00:00",
                "availability_to": "2024-12-31T23:59:59",
                "images": []
            }
            response = requests.post(
                f"{BASE_URL}/api/listings",
                json=listing_data,
                headers=headers
            )
            if response.status_code == 201:
                print("✓ Listing created successfully")
                listing = response.json()
                print(f"  Listing ID: {listing['id']}")
                print(f"  Title: {listing['title']}")
                print(f"  Price: ${listing['price']}")
            
            # Test getting listings
            print("\n6. Fetching Listings")
            print("-" * 60)
            response = requests.get(f"{BASE_URL}/api/listings")
            if response.status_code == 200:
                listings = response.json()
                print(f"✓ Found {len(listings)} listings")
                for listing in listings[:3]:  # Show first 3
                    print(f"  - {listing['title']} (${listing['price']})")
            
        else:
            print(f"✗ Login failed: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test dashboard
    print("\n7. Testing Dashboard Endpoints")
    print("-" * 60)
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{BASE_URL}/api/dashboard/seller",
            headers=headers
        )
        if response.status_code == 200:
            print("✓ Seller dashboard data retrieved")
            dashboard = response.json()
            print(f"  Total Listings: {dashboard['total_listings']}")
            print(f"  Active Listings: {dashboard['active_listings']}")
            print(f"  Total Sales: ${dashboard['total_sales']}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "=" * 60)
    print("API Testing Complete!")
    print("=" * 60)
    print("\nAccess the API documentation at:")
    print(f"  Swagger UI: {BASE_URL}/docs")
    print(f"  ReDoc: {BASE_URL}/redoc")


if __name__ == "__main__":
    test_api()

