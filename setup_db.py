"""
Database setup script to create initial tables and optionally create a superuser
"""
from app.database import engine, Base
from app.models import User, Listing, Order, Auction, Bid
from app.utils.auth import get_password_hash
from sqlalchemy.orm import Session
from app.models.user import UserRole


def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully")


def create_admin_user(email: str, password: str, username: str = "admin"):
    """Create an admin user"""
    with Session(engine) as db:
        # Check if admin already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"✗ User with email {email} already exists")
            return
        
        # Create admin user
        admin_user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print(f"✓ Admin user created: {email}")
        print(f"  Username: {username}")
        print(f"  Role: Admin")


if __name__ == "__main__":
    import sys
    
    print("Setting up database...")
    create_tables()
    
    # Create admin user if credentials provided
    if len(sys.argv) >= 3:
        email = sys.argv[1]
        password = sys.argv[2]
        username = sys.argv[3] if len(sys.argv) > 3 else "admin"
        create_admin_user(email, password, username)
        print("\nYou can now login as admin with these credentials.")
    else:
        print("\nTo create an admin user, run:")
        print("python setup_db.py <email> <password> [username]")


