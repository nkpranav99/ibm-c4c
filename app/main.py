from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, Base

# Import routers
from app.routers import auth, listings, orders, auctions, dashboard, admin
from app.routers import websocket

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Waste Material Marketplace API",
    description="Backend API for waste material marketplace with auction functionality",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

