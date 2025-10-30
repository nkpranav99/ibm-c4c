# JSON File Storage Guide

## Overview

This application now uses **JSON file storage** instead of PostgreSQL database. All data is stored in simple JSON files in the `data/` directory.

## Why JSON Storage?

- **No database setup required** - No need to install, configure, or run PostgreSQL
- **Simpler development** - All data is human-readable JSON files
- **Easy debugging** - You can directly view and edit data files
- **Portable** - Easy to backup and restore by copying the `data/` folder
- **Perfect for development and small deployments**

## Data Storage Location

All data is stored in: `data/`

### Data Files

- `data/users.json` - User accounts (buyers, sellers, admins)
- `data/listings.json` - Waste material listings
- `data/orders.json` - Orders placed by buyers
- `data/auctions.json` - Auction details
- `data/bids.json` - Bids on auctions

## Setup Instructions

### 1. Initialize Data

Run the setup script to create initial data files:

```bash
python setup_json_data.py
```

This will:
- Load existing listings from mock data
- Create an admin user (email: `admin@example.com`, password: `secret`)
- Set up all necessary data files

### 2. Start the Server

```bash
# Activate virtual environment
source c4c/bin/activate  # or source venv/bin/activate

# Start the server
uvicorn app.main:app --reload
```

### 3. Access the API

- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Default Admin User

```
Email: admin@example.com
Password: secret
```

**⚠️ Change this password in production!**

## Managing Users

### Create a New User via API

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user123",
    "password": "password123",
    "company_name": "My Company",
    "role": "seller"
  }'
```

### View Users Manually

```bash
cat data/users.json
```

## Managing Data

### View Data

All data files are in the `data/` directory. You can:

```bash
# View users
cat data/users.json

# View listings
cat data/listings.json

# View orders
cat data/orders.json
```

### Backup Data

Simply copy the `data/` directory:

```bash
cp -r data data_backup
```

### Restore Data

Copy the backup back:

```bash
cp -r data_backup/* data/
```

### Reset Data

Delete all data and reinitialize:

```bash
rm -rf data/*
python setup_json_data.py
```

## Configuration

The application uses JSON storage when `DISABLE_DB = True` in `app/config.py`:

```python
DISABLE_DB: bool = True
```

## Data Structure

### User Example

```json
{
  "id": 1,
  "email": "admin@example.com",
  "username": "admin",
  "hashed_password": "$2b$12$...",
  "company_name": "Admin Company",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00",
  "updated_at": null
}
```

### Listing Example

```json
{
  "id": 1,
  "title": "HDPE Plastic Waste",
  "description": "Clean HDPE scrap...",
  "material_name": "HDPE",
  "quantity": 100.0,
  "quantity_unit": "tons",
  "price": 500.0,
  "listing_type": "fixed_price",
  "status": "active",
  "location": "Mumbai",
  "images": [],
  "seller_id": 1,
  "created_at": "2025-01-01T00:00:00",
  "updated_at": null
}
```

## Limitations

- **Concurrent writes**: JSON storage doesn't handle concurrent writes well. Use only for single-server deployments.
- **No transactions**: Changes are not atomic.
- **Performance**: Suitable for small to medium datasets (< 10,000 records per file).
- **Not production-ready**: For high-traffic production apps, use a proper database.

## Migration to Database

If you later need to migrate to PostgreSQL or another database:

1. The data models remain the same
2. Set `DISABLE_DB = False` in `app/config.py`
3. Update `DATABASE_URL` in `.env`
4. Run database migrations
5. Import data from JSON files

## Troubleshooting

### Data files not found

Run the setup script:

```bash
python setup_json_data.py
```

### Permissions error

Make sure the `data/` directory is writable:

```bash
chmod 755 data/
```

### Data corruption

If data files become corrupted, reset them:

```bash
rm data/*.json
python setup_json_data.py
```

### Server won't start

Check that all required files exist:

```bash
ls -la data/
```

You should see:
- users.json
- listings.json
- orders.json
- auctions.json
- bids.json

## Next Steps

1. ✅ Run `python setup_json_data.py` to initialize data
2. ✅ Start the server with `uvicorn app.main:app --reload`
3. ✅ Access http://localhost:8000/docs to explore the API
4. ✅ Login with admin credentials or register a new user
5. ✅ Start using the application!

## Need Help?

- Check `QUICKSTART.md` for basic usage
- Check `SETUP_GUIDE.md` for detailed setup instructions
- View API documentation at http://localhost:8000/docs

