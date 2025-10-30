from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.database import engine, Base

# Import routers
from app.routers import auth, listings, orders, auctions, dashboard, admin, chatbot
from app.routers import websocket

# Create database tables (skip in mock mode)
if not getattr(settings, "DISABLE_DB", False):
    Base.metadata.create_all(bind=engine)

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

# Include routers
app.include_router(auth.router)
app.include_router(listings.router)
app.include_router(orders.router)
app.include_router(auctions.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(chatbot.router)
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
