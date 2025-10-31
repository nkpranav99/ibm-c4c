from datetime import datetime
from pathlib import Path
import csv
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.models.order import OrderStatus
from app.schemas.order import OrderResponse
from app.utils.auth import get_current_active_user
from app.utils.mock_storage import load_orders as storage_load_orders, save_orders as storage_save_orders

router = APIRouter(prefix="/api/orders", tags=["Orders"])

MOCK_DATA_PATH = Path(__file__).resolve().parents[2] / "mock_data" / "orders.csv"


def _bootstrap_orders_if_needed() -> List[Dict]:
    orders = storage_load_orders()
    if orders:
        return orders

    if not MOCK_DATA_PATH.exists():
        return orders

    bootstrapped_orders: List[Dict] = []
    with open(MOCK_DATA_PATH, newline="") as csvfile:
        reader = csv.DictReader(csvfile)
        for idx, row in enumerate(reader, start=1):
            created_at = datetime.fromisoformat(f"{row['order_date']}T09:00:00")
            bootstrapped_orders.append(
                {
                    "id": idx,
                    "external_id": row["order_id"],
                    "listing_id": int(row["listing_id"]),
                    "status": row["status"].lower(),
                    "quantity": float(row["quantity"]),
                    "unit": row["unit"],
                    "total_price": float(row["total_amount_inr"]),
                    "buyer_notes": None,
                    "buyer_id": idx,
                    "buyer_company": row["buyer_company"],
                    "seller_company": row["seller_company"],
                    "material_name": row["material_name"],
                    "price_per_unit": float(row["price_per_unit"]),
                    "payment_status": row["payment_status"],
                    "delivery_location": row["delivery_location"],
                    "created_at": created_at.isoformat(),
                    "updated_at": created_at.isoformat(),
                }
            )

    if bootstrapped_orders:
        storage_save_orders(bootstrapped_orders)
        return bootstrapped_orders

    return orders


def _load_orders() -> List[Dict]:
    orders = _bootstrap_orders_if_needed()
    # Ensure status values align with enum when possible
    for order in orders:
        status_value = (order.get("status") or "").lower().strip()
        if status_value not in {status.value for status in OrderStatus}:
            order["status"] = OrderStatus.PENDING.value
    return orders


def _coerce_order(payload: Dict) -> OrderResponse:
    try:
        status = OrderStatus(payload.get("status", "pending"))
    except ValueError:
        status = OrderStatus.PENDING

    created_at_raw = payload.get("created_at")
    updated_at_raw = payload.get("updated_at")

    created_at = (
        datetime.fromisoformat(created_at_raw)
        if isinstance(created_at_raw, str)
        else created_at_raw or datetime.utcnow()
    )
    updated_at = (
        datetime.fromisoformat(updated_at_raw)
        if isinstance(updated_at_raw, str) and updated_at_raw
        else None
    )

    return OrderResponse(
        id=int(payload.get("id", 0)),
        listing_id=int(payload.get("listing_id", 0)),
        quantity=float(payload.get("quantity", 0)),
        total_price=float(payload.get("total_price", 0)),
        buyer_notes=payload.get("buyer_notes"),
        status=status,
        buyer_id=int(payload.get("buyer_id", 0)),
        created_at=created_at,
        updated_at=updated_at,
    )


def _filter_orders_for_company(
    orders: List[Dict],
    company_name: str,
    perspective: str,
) -> List[Dict]:
    if not company_name:
        return orders

    key = "buyer_company" if perspective == "buyer" else "seller_company"
    filtered = [order for order in orders if order.get(key, "").lower() == company_name.lower()]
    return filtered or orders


def _get_mock_user(role: str) -> Dict:
    if getattr(settings, "DISABLE_DB", False):
        if role == "seller":
            return {
                "id": 501,
                "role": "seller",
                "company_name": "Metal Recyclers Pvt Ltd",
            }
        if role == "admin":
            return {
                "id": 1,
                "role": "admin",
                "company_name": "Admin Company",
            }
        return {
            "id": 401,
            "role": "buyer",
            "company_name": "CircularEconomy Inc",
        }
    return get_current_active_user()


def get_buyer_user():
    user = _get_mock_user("buyer")
    if user.get("role") not in {"buyer", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Buyer access required")
    return user


def get_seller_user():
    user = _get_mock_user("seller")
    if user.get("role") not in {"seller", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seller access required")
    return user


def get_view_user():
    if getattr(settings, "DISABLE_DB", False):
        return _get_mock_user("admin")
    return get_current_active_user()


@router.get("", response_model=List[OrderResponse])
def get_orders(current_user: Dict = Depends(get_buyer_user)):
    orders = _load_orders()
    orders = _filter_orders_for_company(orders, current_user.get("company_name", ""), "buyer")
    return [_coerce_order(order) for order in orders]


@router.get("/my-orders", response_model=List[OrderResponse])
def get_my_orders(current_user: Dict = Depends(get_seller_user)):
    orders = _load_orders()
    orders = _filter_orders_for_company(orders, current_user.get("company_name", ""), "seller")
    return [_coerce_order(order) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, current_user: Dict = Depends(get_view_user)):
    orders = _load_orders()
    match = next((order for order in orders if int(order.get("id", 0)) == order_id), None)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if current_user.get("role") not in {"admin", "seller", "buyer"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this order")

    return _coerce_order(match)


@router.post("", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
def create_order():
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Order creation is disabled in the demo environment",
    )


@router.put("/{order_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
def update_order(order_id: int):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Order updates are disabled in the demo environment",
    )