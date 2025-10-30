# Router Updates for JSON Storage

The following routers still need to be updated to remove SQLAlchemy dependencies:
- admin.py
- auctions.py  
- orders.py
- websocket.py
- listings.py (partially done)

These routers currently use DISABLE_DB flag to fall back to mock data, but they should be fully converted to use JSON storage instead.

For now, the application will work in mock/JSON mode since DISABLE_DB=True.

