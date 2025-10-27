from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.order import Order
from app.models.listing import Listing
from app.models.user import User
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.utils.auth import get_current_active_user

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate, db: Session = Depends(get_db), 
                 current_user: User = Depends(get_current_active_user)):
    # Verify listing exists and is active
    listing = db.query(Listing).filter(Listing.id == order.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")
    
    if listing.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot order your own listing")
    
    # For fixed price listings, create order directly
    if listing.listing_type.value == "fixed_price":
        db_order = Order(
            quantity=order.quantity,
            total_price=order.total_price,
            buyer_notes=order.buyer_notes,
            listing_id=order.listing_id,
            buyer_id=current_user.id
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        return db_order
    else:
        raise HTTPException(status_code=400, detail="This listing is an auction. Please place a bid instead.")


@router.get("", response_model=List[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Users can only see their own orders
    orders = db.query(Order).filter(Order.buyer_id == current_user.id).offset(skip).limit(limit).all()
    return orders


@router.get("/my-orders", response_model=List[OrderResponse])
def get_my_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get orders for user's listings (as seller)
    orders = db.query(Order).join(Listing).filter(
        Listing.seller_id == current_user.id
    ).offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db), 
              current_user: User = Depends(get_current_active_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user is authorized to view this order
    listing = db.query(Listing).filter(Listing.id == order.listing_id).first()
    if order.buyer_id != current_user.id and listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization - seller can update order status
    listing = db.query(Listing).filter(Listing.id == order.listing_id).first()
    if listing.seller_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
    
    update_data = order_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)
    
    db.commit()
    db.refresh(order)
    return order

