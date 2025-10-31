from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict

from app.schemas.seller_application import (
    SellerApplicationRequest,
    SellerApplicationResponse,
    ListingSummary,
)
from app.utils.auth import get_current_active_user, get_seller_user
from app.utils import mock_storage
from app.config import settings


router = APIRouter(prefix="/api/seller", tags=["Seller"])


def build_listing_summary(listing: dict) -> ListingSummary:
    return ListingSummary(
        listing_id=listing.get("id"),
        title=listing.get("title"),
        status=listing.get("status"),
        listing_type=listing.get("category_type") or listing.get("listing_type"),
        quantity=float(listing.get("quantity") or 0),
        quantity_unit=listing.get("quantity_unit") or listing.get("unit") or "unit",
        price=float(listing.get("price") or listing.get("price_per_unit") or 0),
        location=listing.get("location"),
        condition=listing.get("condition"),
    )


def get_mock_or_active_user():
    if getattr(settings, "DISABLE_DB", False):
        return {
            "id": 1,
            "role": "buyer",
            "email": "mock-buyer@example.com",
            "company_name": "Mock Industries",
            "username": "mock_buyer",
        }
    return get_current_active_user()


def get_mock_or_seller_user():
    if getattr(settings, "DISABLE_DB", False):
        return {
            "id": 1,
            "role": "seller",
            "email": "mock-seller@example.com",
            "company_name": "Mock Seller Co",
            "username": "mock_seller",
        }
    return get_seller_user()


@router.post("/applications", response_model=SellerApplicationResponse, status_code=status.HTTP_201_CREATED)
def submit_seller_application(
    application: SellerApplicationRequest,
    current_user: Dict = Depends(get_mock_or_active_user),
):
    latest_application = mock_storage.get_latest_application_for_user(current_user.get('id'))
    if latest_application and latest_application.get('status') in {"pending", "under_review"}:
        raise HTTPException(status_code=400, detail="An application is already under review")

    listing = mock_storage.create_listing_from_application(current_user.get('id'), application.dict())
    listing_summary = build_listing_summary(listing)

    stored_application = mock_storage.create_seller_application({
        'user_id': current_user.get('id'),
        'marketplace_name': application.marketplace_name,
        'contact_email': application.contact_email,
        'company_name': application.company_name,
        'experience_level': application.experience_level,
        'material_focus': application.material_focus,
        'listing_title': application.listing_title,
        'listing_description': application.listing_description,
        'listing_material_name': application.listing_material_name,
        'listing_category': application.listing_category,
        'listing_quantity': application.listing_quantity,
        'listing_quantity_unit': application.listing_quantity_unit,
        'listing_price': application.listing_price,
        'listing_sale_type': application.listing_sale_type,
        'listing_location': application.listing_location,
        'listing_condition': application.listing_condition,
        'listing_category_type': application.listing_category_type,
        'status': 'approved',
        'listing_id': listing.get('id'),
        'listing_status': listing.get('status'),
        'listing': listing_summary.model_dump(),
    })

    response_payload = {**stored_application, 'listing': listing_summary.model_dump()}
    return response_payload


@router.get("/applications/me", response_model=SellerApplicationResponse)
def get_my_application(current_user: Dict = Depends(get_mock_or_active_user)):
    latest_application = mock_storage.get_latest_application_for_user(current_user.get('id'))
    if not latest_application:
        raise HTTPException(status_code=404, detail="No seller application found")

    if latest_application.get('listing_id') and not latest_application.get('listing'):
        listing = next(
            (l for l in mock_storage.load_listings() if l.get('id') == latest_application.get('listing_id')),
            None,
        )
        if listing:
            latest_application['listing'] = build_listing_summary(listing).model_dump()

    return latest_application


@router.get("/insights")
def get_seller_insights(current_user: Dict = Depends(get_mock_or_seller_user)):
    seller_id = current_user.get('id')
    if not seller_id:
        raise HTTPException(status_code=400, detail="Unable to determine seller ID")
    return mock_storage.compute_seller_insights(seller_id)


