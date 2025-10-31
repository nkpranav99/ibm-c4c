from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

# Import routers
from app.routers import auth, listings, dashboard, chatbot, seller

# Import machinery router
try:
    from app.routers import machinery
    INCLUDE_MACHINERY = True
except Exception:
    INCLUDE_MACHINERY = False

# Conditional imports for routers that may not work with JSON storage yet
try:
    from app.routers import orders
    INCLUDE_ORDERS = True
except Exception:
    INCLUDE_ORDERS = False

try:
    from app.routers import auctions
    INCLUDE_AUCTIONS = True
except Exception:
    INCLUDE_AUCTIONS = False

try:
    from app.routers import admin
    INCLUDE_ADMIN = True
except Exception:
    INCLUDE_ADMIN = False

try:
    from app.routers import websocket
    INCLUDE_WEBSOCKET = True
except Exception:
    INCLUDE_WEBSOCKET = False

app = FastAPI(
    title="Waste Material Marketplace API",
    description="Backend API for waste material marketplace with auction functionality",
    version="1.0.0"
)

# Configure CORS - Explicitly allow localhost origins for XHR/fetch requests
# This fixes CORS errors for all API endpoints
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3001"
]

# Use FastAPI's built-in CORS middleware with explicit configuration
# This ensures CORS headers are set for all XHR/fetch requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
    max_age=600,
)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers (only ones that work with JSON storage)
app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(dashboard.router)
app.include_router(chatbot.router)
app.include_router(seller.router)

if INCLUDE_MACHINERY:
    app.include_router(machinery.router)

if INCLUDE_ORDERS:
    app.include_router(orders.router)
if INCLUDE_AUCTIONS:
    app.include_router(auctions.router)
if INCLUDE_ADMIN:
    app.include_router(admin.router)
if INCLUDE_WEBSOCKET:
    app.include_router(websocket.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Waste Material Marketplace API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
