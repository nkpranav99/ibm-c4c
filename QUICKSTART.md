# Quick Start Guide

## Setup in 5 Minutes

### 1. Install Dependencies

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Set Up Database

#### Option A: Using PostgreSQL (Recommended)

```bash
# Install PostgreSQL (if not installed)
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# macOS:
brew install postgresql

# Start PostgreSQL service
sudo systemctl start postgresql  # Linux
# OR
brew services start postgresql  # macOS

# Create database
createdb waste_marketplace

# Update DATABASE_URL in config.py or create .env file
```

#### Option B: Quick Test with SQLite (for testing only)

Update `app/database.py` temporarily:
```python
engine = create_engine("sqlite:///./waste_marketplace.db")
```

### 3. Run Database Setup

```bash
python setup_db.py
```

This creates all necessary tables. Optionally create an admin user:
```bash
python setup_db.py admin@example.com adminpass123
```

### 4. Start the Server

```bash
# Using the start script
./start.sh

# OR directly with uvicorn
uvicorn app.main:app --reload
```

The API will be running at `http://localhost:8000`

### 5. Test the API

#### Using the test script:
```bash
python test_api.py
```

#### Or using curl:

```bash
# Health check
curl http://localhost:8000/health

# Register a user
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user",
    "password": "password123",
    "company_name": "My Company",
    "role": "buyer"
  }'

# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"
```

### 6. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload

# Run with specific host/port
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run database setup
python setup_db.py

# Test API
python test_api.py
```

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/waste_marketplace
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Troubleshooting

### Database Connection Error
- Make sure PostgreSQL is running
- Check your DATABASE_URL in config.py or .env
- Verify database credentials

### Port Already in Use
```bash
# Use a different port
uvicorn app.main:app --reload --port 8001
```

### Import Errors
```bash
# Make sure you're in the correct directory
# Install dependencies
pip install -r requirements.txt
```

## Next Steps

1. Explore the API with Swagger UI at `/docs`
2. Try creating test users, listings, and orders
3. Test the auction functionality with WebSockets
4. Integrate with your frontend application

## API Endpoints Summary

### Public Endpoints
- `GET /` - API information
- `GET /health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected Endpoints (require JWT token)
- `GET /api/auth/me` - Current user info
- `GET /api/listings` - Browse listings
- `POST /api/listings` - Create listing
- `POST /api/orders` - Create order
- `POST /api/auctions/{id}/bid` - Place bid
- `GET /api/dashboard/seller` - Seller dashboard
- `GET /api/dashboard/buyer` - Buyer dashboard
- And many more...

See `README.md` for complete API documentation.

