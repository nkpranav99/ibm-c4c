# Complete Setup Guide - Waste Material Marketplace

This guide will help you set up both the backend and frontend for the Waste Material Marketplace.

## Architecture Overview

- **Backend**: FastAPI (Python) - Running on port 8000
- **Frontend**: Next.js (React/TypeScript) - Running on port 3000
- **Database**: PostgreSQL

## Prerequisites

1. **Python 3.9+** for backend
2. **Node.js 18+** for frontend
3. **PostgreSQL** for database
4. **Git** (optional)

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd /path/to/project
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up Database

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
# OR
brew services start postgresql  # macOS
```

#### Create Database
```bash
createdb waste_marketplace
```

#### Update Database URL
Edit `app/config.py` or create `.env` file:
```python
DATABASE_URL=postgresql://user:password@localhost:5432/waste_marketplace
```

### 5. Run Database Setup
```bash
# Create tables and optional admin user
python setup_db.py admin@example.com adminpass123
```

### 6. Start Backend Server
```bash
uvicorn app.main:app --reload
```

Backend will be running at: http://localhost:8000

### 7. Test Backend
```bash
# Visit API documentation
open http://localhost:8000/docs

# Or run test script
python test_api.py
```

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment (Optional)
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start Development Server
```bash
npm run dev
# or
yarn dev
```

Frontend will be running at: http://localhost:3000

## Running Both Services

### Option 1: Manual (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd /path/to/project
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd /path/to/project/frontend
npm run dev
```

### Option 2: Using npm scripts (Recommended)

Create a root `package.json`:
```json
{
  "name": "waste-marketplace",
  "scripts": {
    "dev:backend": "cd /path/to/project && source venv/bin/activate && uvicorn app.main:app --reload",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "setup:backend": "pip install -r requirements.txt && python setup_db.py",
    "setup:frontend": "cd frontend && npm install",
    "setup": "npm run setup:backend && npm run setup:frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Then run:
```bash
npm run dev
```

## Verification

### Check Backend
1. Visit http://localhost:8000
2. Should see: "Welcome to Waste Material Marketplace API"
3. Visit http://localhost:8000/docs for Swagger UI

### Check Frontend
1. Visit http://localhost:3000
2. Should see landing page with hero section
3. Click "Sign Up" to create an account

## Common Issues & Solutions

### Backend Issues

**Issue**: `Module not found: 'app'`
```bash
# Make sure you're in the project root directory
# And virtual environment is activated
```

**Issue**: `Database connection refused`
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -l | grep waste_marketplace

# Create database if needed
createdb waste_marketplace
```

**Issue**: `Port 8000 already in use`
```bash
# Kill the process or use different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Issue**: `Cannot connect to API`
```bash
# Check backend is running
curl http://localhost:8000/health

# Check CORS settings in backend
# Should allow http://localhost:3000
```

**Issue**: `Module not found: '@/*'`
```bash
# Check tsconfig.json paths configuration
# Reinstall dependencies
npm install
```

**Issue**: `npm command not found`
```bash
# Install Node.js and npm
# Visit: https://nodejs.org/
```

## Database Schema

The following tables are created automatically:

- **users** - User accounts
- **listings** - Waste material listings
- **orders** - Orders
- **auctions** - Auctions
- **bids** - Bids

## API Endpoints

### Public Endpoints
- `GET /` - API info
- `GET /health` - Health check
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login

### Protected Endpoints
- `GET /api/auth/me` - Current user
- `GET /api/listings` - Browse listings
- `POST /api/listings` - Create listing
- `POST /api/orders` - Create order
- `POST /api/auctions/{id}/bid` - Place bid
- `GET /api/dashboard/seller` - Seller dashboard
- `GET /api/dashboard/buyer` - Buyer dashboard

## User Roles

- **Buyer** - Browse and purchase materials
- **Seller** - List materials and manage listings
- **Admin** - Platform management and admin panel

## First Steps After Setup

1. **Register a Test User**
   - Visit http://localhost:3000/signup
   - Choose role (Buyer or Seller)

2. **Create a Listing** (if Seller)
   - Login and navigate to dashboard
   - Create a new listing

3. **Browse Listings** (if Buyer)
   - Visit http://localhost:3000/listings
   - Search and filter materials

4. **Place an Order or Bid**
   - Click on a listing
   - Place order or bid

5. **Check Dashboard**
   - View analytics and recent activity

## Production Deployment

### Backend
- Set strong `SECRET_KEY`
- Use production database
- Enable HTTPS
- Configure proper CORS

### Frontend
```bash
npm run build
npm start
```

### Recommended Hosting
- **Backend**: Railway, Render, AWS EC2
- **Frontend**: Vercel, Netlify, AWS Amplify
- **Database**: AWS RDS, Supabase, Neon

## Troubleshooting

Run these commands to diagnose issues:

```bash
# Check backend
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3000

# Check database
psql waste_marketplace -c "\dt"

# Check Python environment
which python
python --version

# Check Node environment
node --version
npm --version
```

## Additional Resources

- Backend README: `README.md`
- Frontend README: `frontend/README.md`
- API Documentation: http://localhost:8000/docs
- Next.js Docs: https://nextjs.org/docs
- FastAPI Docs: https://fastapi.tiangolo.com

## Support

For issues or questions:
1. Check error logs in console
2. Review API documentation
3. Test API endpoints directly
4. Check database connection
5. Verify environment variables

## Success Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 3000
- [ ] Database connected
- [ ] Can access http://localhost:8000/docs
- [ ] Can access http://localhost:3000
- [ ] Can register a user
- [ ] Can login
- [ ] Can create a listing
- [ ] Can browse listings
- [ ] Can place an order

Happy coding! 🚀

