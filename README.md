# Waste Material Marketplace API

A comprehensive FastAPI backend for a waste material marketplace platform where companies can list, buy, and auction industrial waste materials.

## Features

### Core Features
- **User Authentication**: JWT-based authentication with role-based access control (Admin, Seller, Buyer)
- **Waste Material Listings**: Companies can create, edit, and manage waste material listings
- **Marketplace**: Browse and search listings with advanced filters
- **Auction System**: Real-time bidding system with WebSocket support
- **Order Management**: Complete order lifecycle management
- **Dashboard**: Separate dashboards for sellers and buyers with analytics
- **Admin Panel**: Comprehensive admin interface for platform management

### Authentication
- User registration with email and username
- JWT token-based authentication
- Role-based access control (Admin, Seller, Buyer)
- Secure password hashing with bcrypt

### Listings
- Create listings with material details, quantity, price, and location
- Support for fixed price and auction-type listings
- Image upload support
- Advanced search and filtering (material type, location, price range)
- Listing status management (active, sold, inactive)

### Auction System
- Real-time bidding with WebSocket support
- Automatic bid validation (must be higher than current highest bid)
- Time-based auction ending
- Winner selection and notification
- View current highest bid and remaining time

### Order Management
- Direct order placement for fixed-price listings
- Order status tracking (pending, confirmed, completed, cancelled)
- Seller and buyer order views
- Order history and analytics

### Dashboard
- **Seller Dashboard**: View listings, track sales, manage orders, monitor auctions
- **Buyer Dashboard**: View orders, track bids, see purchase history
- Analytics and statistics for both user types

### Admin Panel
- User management
- Listing management and approval
- Platform-wide statistics and analytics
- User activation/deactivation

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT (python-jose)
- **WebSockets**: FastAPI WebSocket for real-time bidding
- **File Uploads**: Python-multipart for handling file uploads
- **Validation**: Pydantic v2

## Setup Instructions

### Prerequisites
- Python 3.9+
- PostgreSQL 12+
- pip

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up PostgreSQL database**
```bash
# Create database
createdb waste_marketplace

# Or using PostgreSQL client
psql -U postgres
CREATE DATABASE waste_marketplace;
```

5. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your database credentials and secret key
```

6. **Run database migrations**
```bash
# The tables will be created automatically on first run
# For production, use Alembic migrations
```

7. **Run the application**
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Listings
- `POST /api/listings` - Create new listing
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/{id}` - Get listing by ID
- `PUT /api/listings/{id}` - Update listing
- `DELETE /api/listings/{id}` - Delete listing

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get buyer's orders
- `GET /api/orders/my-orders` - Get seller's orders (for listings owned by seller)
- `GET /api/orders/{id}` - Get order by ID
- `PUT /api/orders/{id}` - Update order status

### Auctions
- `GET /api/auctions/active` - Get active auctions
- `GET /api/auctions/{listing_id}` - Get auction for listing
- `POST /api/auctions/{listing_id}/create-auction` - Create auction for listing
- `POST /api/auctions/{auction_id}/bid` - Place bid
- `GET /api/auctions/{auction_id}/bids` - Get all bids for auction
- `POST /api/auctions/{auction_id}/end` - End auction

### Dashboard
- `GET /api/dashboard/seller` - Get seller dashboard data
- `GET /api/dashboard/buyer` - Get buyer dashboard data
- `GET /api/dashboard/seller/listings` - Get seller's listings
- `GET /api/dashboard/buyer/my-bids` - Get buyer's bids

### Admin
- `GET /api/admin/stats` - Get admin statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/listings` - Get all listings
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/users/{id}/toggle-active` - Toggle user active status
- `DELETE /api/admin/listings/{id}` - Delete listing (admin)

### WebSocket
- `WS /ws/auction/{auction_id}` - Real-time bidding for auctions

## Usage Examples

### Register User
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "username": "seller",
    "password": "password123",
    "company_name": "ABC Industries",
    "role": "seller"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=seller@example.com&password=password123"
```

### Create Listing
```bash
curl -X POST "http://localhost:8000/api/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Bagasse from Sugarcane",
    "description": "High quality bagasse available",
    "material_name": "Bagasse",
    "quantity": 100,
    "quantity_unit": "tons",
    "price": 5000,
    "listing_type": "fixed_price",
    "location": "Mumbai, India",
    "availability_from": "2024-01-01T00:00:00",
    "availability_to": "2024-12-31T23:59:59"
  }'
```

### Place Bid
```bash
curl -X POST "http://localhost:8000/api/auctions/1/bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 5500,
    "auction_id": 1
  }'
```

## Database Schema

### Users Table
- id, email, username, hashed_password, company_name, role, is_active, timestamps

### Listings Table
- id, title, description, material_name, quantity, quantity_unit, price, listing_type, status, location, images, availability_dates, seller_id, timestamps

### Orders Table
- id, quantity, total_price, status, buyer_notes, listing_id, buyer_id, timestamps

### Auctions Table
- id, starting_bid, current_highest_bid, end_time, is_active, listing_id, winner_id, timestamps

### Bids Table
- id, amount, is_winning, auction_id, bidder_id, created_at

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control
- CORS configuration
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy ORM

## Development

### Running in Development Mode
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Code Structure
```
app/
├── models/          # SQLAlchemy database models
├── schemas/         # Pydantic models for validation
├── routers/         # API route handlers
├── utils/           # Utility functions (auth, etc.)
├── database.py      # Database connection
├── config.py        # Configuration settings
└── main.py          # FastAPI application entry point
```

## Production Deployment

1. Set strong `SECRET_KEY` in environment variables
2. Use production database (PostgreSQL)
3. Configure proper CORS origins
4. Enable HTTPS
5. Use environment variables for sensitive data
6. Set up proper logging
7. Use a production ASGI server (e.g., Gunicorn with Uvicorn workers)

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Testing

To test the API:
1. Use the Swagger UI at `/docs` for interactive testing
2. Use tools like Postman or curl for API testing
3. Example WebSocket client code can be added for auction testing

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

