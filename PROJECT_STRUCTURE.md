# Project Structure

## Directory Overview

```
proj/
├── app/
│   ├── __init__.py              # Package initialization
│   ├── main.py                  # FastAPI application entry point
│   ├── config.py                # Configuration settings
│   ├── database.py              # Database connection and session management
│   │
│   ├── models/                  # SQLAlchemy database models
│   │   ├── __init__.py
│   │   ├── user.py             # User model (Admin, Seller, Buyer)
│   │   ├── listing.py           # Waste material listings
│   │   ├── order.py             # Orders for fixed-price listings
│   │   └── auction.py          # Auctions and bids
│   │
│   ├── schemas/                 # Pydantic validation models
│   │   ├── __init__.py
│   │   ├── auth.py             # Authentication schemas
│   │   ├── listing.py          # Listing schemas (Create, Update, Response)
│   │   ├── order.py            # Order schemas
│   │   └── auction.py          # Auction and bid schemas
│   │
│   ├── routers/                 # API route handlers
│   │   ├── __init__.py
│   │   ├── auth.py             # Authentication endpoints (register, login)
│   │   ├── listings.py         # Listing CRUD operations
│   │   ├── orders.py           # Order management
│   │   ├── auctions.py         # Auction and bidding
│   │   ├── dashboard.py        # User dashboards (seller & buyer)
│   │   ├── admin.py            # Admin panel endpoints
│   │   └── websocket.py        # WebSocket for real-time bidding
│   │
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   └── auth.py             # JWT, password hashing, authentication
│   │
│   └── middleware/              # Custom middleware (empty for now)
│
├── uploads/                     # Directory for uploaded files
├── requirements.txt             # Python dependencies
├── alembic.ini                  # Database migration configuration
├── setup_db.py                 # Database setup script
├── test_api.py                 # API testing script
├── start.sh                    # Server start script
├── env_template.txt            # Environment variables template
├── .gitignore                  # Git ignore rules
├── README.md                   # Complete documentation
├── QUICKSTART.md               # Quick setup guide
└── PROJECT_STRUCTURE.md        # This file

```

## Key Files Explained

### app/main.py
- **Purpose**: Main FastAPI application
- **Key Features**:
  - CORS middleware configuration
  - Static file serving for uploads
  - Router registration
  - Root and health check endpoints

### app/models/
Database models using SQLAlchemy ORM:
- **user.py**: Users with roles (Admin, Seller, Buyer)
- **listing.py**: Waste material listings with types (fixed_price, auction)
- **order.py**: Orders for fixed-price purchases
- **auction.py**: Auctions and bids with real-time support

### app/routers/
API endpoint handlers organized by feature:
- **auth.py**: Registration, login, current user
- **listings.py**: Create, read, update, delete listings with search/filter
- **orders.py**: Order creation and management
- **auctions.py**: Auction creation, bidding, ending auctions
- **dashboard.py**: Analytics for sellers and buyers
- **admin.py**: Admin management endpoints
- **websocket.py**: Real-time bidding via WebSockets

### app/utils/auth.py
Authentication utilities:
- Password hashing and verification
- JWT token creation
- User authentication decorators
- Role-based access control helpers

## API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user

### Listings (`/api/listings`)
- `GET /` - Browse listings with filters
- `GET /{id}` - Get listing details
- `POST /` - Create listing
- `PUT /{id}` - Update listing
- `DELETE /{id}` - Delete listing

### Orders (`/api/orders`)
- `GET /` - Get buyer's orders
- `GET /my-orders` - Get seller's orders
- `GET /{id}` - Get order details
- `POST /` - Create order
- `PUT /{id}` - Update order status

### Auctions (`/api/auctions`)
- `GET /active` - Get active auctions
- `GET /{listing_id}` - Get auction for listing
- `POST /{listing_id}/create-auction` - Create auction
- `POST /{auction_id}/bid` - Place bid
- `GET /{auction_id}/bids` - Get all bids
- `POST /{auction_id}/end` - End auction

### Dashboard (`/api/dashboard`)
- `GET /seller` - Seller analytics
- `GET /buyer` - Buyer analytics
- `GET /seller/listings` - Seller's listings
- `GET /buyer/my-bids` - Buyer's bids

### Admin (`/api/admin`)
- `GET /stats` - Platform statistics
- `GET /users` - Get all users
- `GET /listings` - Get all listings
- `GET /orders` - Get all orders
- `PUT /users/{id}/toggle-active` - Toggle user status
- `DELETE /listings/{id}` - Delete listing (admin)

### WebSocket
- `WS /ws/auction/{auction_id}` - Real-time bidding

## Data Flow

### User Registration & Login
1. User registers → Creates password hash → Stores in DB
2. User logs in → Validates credentials → Returns JWT token
3. Subsequent requests include JWT token in Authorization header

### Listing Creation & Management
1. Seller creates listing → Validates data → Stores in DB
2. Buyers can search and filter listings
3. Buyers can create orders or place bids

### Auction Flow
1. Seller creates auction listing with end time
2. Buyers connect via WebSocket for real-time updates
3. Buyers place bids → Validates amount → Updates highest bid
4. WebSocket broadcasts bid to all connected clients
5. When auction ends → Winner selected → Order created

### Order Management
1. Buyer places order for fixed-price listing
2. Seller sees order in their dashboard
3. Seller updates order status (confirmed, completed)
4. Both parties can track order progress

## Database Schema

### Users Table
- id (PK), email, username, hashed_password
- company_name, role, is_active
- timestamps (created_at, updated_at)

### Listings Table
- id (PK), title, description, material_name
- quantity, quantity_unit, price
- listing_type (fixed_price/auction), status (active/sold/inactive)
- location, images (JSON), availability dates
- seller_id (FK), timestamps

### Orders Table
- id (PK), quantity, total_price, status
- buyer_notes, listing_id (FK), buyer_id (FK)
- timestamps

### Auctions Table
- id (PK), starting_bid, current_highest_bid
- end_time, is_active, listing_id (FK, unique)
- winner_id (FK), timestamps

### Bids Table
- id (PK), amount, is_winning
- auction_id (FK), bidder_id (FK)
- created_at

## Security Features

1. **Password Hashing**: bcrypt with salt
2. **JWT Authentication**: Secure token-based auth
3. **Role-Based Access Control**: Admin, Seller, Buyer roles
4. **Input Validation**: Pydantic schemas for all requests
5. **SQL Injection Prevention**: SQLAlchemy ORM
6. **CORS Configuration**: Restricted origins
7. **Authorization Checks**: Verify user owns resource before modification

## Running the Application

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up database
python setup_db.py

# 3. Start server
uvicorn app.main:app --reload

# 4. Test API
python test_api.py
```

## Adding New Features

### To add a new endpoint:
1. Add route to appropriate router in `app/routers/`
2. Add Pydantic schema in `app/schemas/` if needed
3. Update `app/main.py` if new router created

### To add a new model:
1. Create model in `app/models/`
2. Add to `app/models/__init__.py`
3. Create Pydantic schemas in `app/schemas/`
4. Run database setup or create migration

### To add a new utility:
1. Add to `app/utils/`
2. Import where needed

## Testing

- Use the Swagger UI at `/docs` for interactive testing
- Run `python test_api.py` for automated tests
- Use Postman or curl for API testing
- Test WebSocket connections with a WebSocket client

