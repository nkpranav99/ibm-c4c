from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.auction import BidCreate
from app.utils.auth import get_current_active_user
from app.utils.mock_storage import (
    create_bid,
    get_auction_by_id,
    get_auction_by_listing_id,
    get_bids_by_auction,
    get_listing_by_id,
    load_auctions,
    load_bids,
    load_master_data,
    load_listings,
    update_auction,
    save_auctions,
    save_bids,
)

router = APIRouter(prefix="/api/auctions", tags=["Auctions"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


SEED_AUCTIONS: List[Dict] = [
    {
        "listing_id": 5,
        "starting_bid": 25000.0,
        "current_highest_bid": 38250.0,
        "bid_count": 7,
        "hours_elapsed": 10,
        "hours_until_close": 6,
        "seller_company": "Sustainable Materials Co",
        "seller_contact": "sales@sustainablematerials.example.com",
        "watchers": 32,
        "featured": True,
    },
    {
        "listing_id": 7,
        "starting_bid": 550000.0,
        "current_highest_bid": 602500.0,
        "bid_count": 5,
        "hours_elapsed": 26,
        "hours_until_close": 3,
        "seller_company": "Urban Waste Management",
        "seller_contact": "auctions@urbanwaste.example.com",
        "watchers": 21,
        "featured": False,
    },
    {
        "listing_id": 8,
        "starting_bid": 145000.0,
        "current_highest_bid": 161000.0,
        "bid_count": 9,
        "hours_elapsed": 4,
        "hours_until_close": 18,
        "seller_company": "ReSource Trading",
        "seller_contact": "contact@resourcetrading.example.com",
        "watchers": 27,
        "featured": True,
    },
    {
        "listing_id": 9,
        "starting_bid": 110000.0,
        "current_highest_bid": 131500.0,
        "bid_count": 4,
        "hours_elapsed": 8,
        "hours_until_close": 12,
        "seller_company": "CircularEconomy Inc",
        "seller_contact": "trading@circulareconomy.example.com",
        "watchers": 18,
        "featured": False,
    },
    {
        "listing_id": 10,
        "starting_bid": 480000.0,
        "current_highest_bid": 0.0,
        "bid_count": 0,
        "hours_elapsed": 2,
        "hours_until_close": 24,
        "seller_company": "GreenTech Industries",
        "seller_contact": "auctions@greentech.example.com",
        "watchers": 14,
        "featured": False,
    },
]


def _seed_auctions_if_needed() -> List[Dict]:
    auctions = load_auctions()
    if auctions:
        return _refresh_auction_state(auctions)

    now = _utcnow()
    seeded: List[Dict] = []
    for idx, config in enumerate(SEED_AUCTIONS, start=1):
        listing = get_listing_by_id(config["listing_id"]) or {}
        start_time = now - timedelta(hours=config.get("hours_elapsed", 6))
        end_time = now + timedelta(hours=config.get("hours_until_close", 6))
        seeded.append(
            {
                "id": idx,
                "listing_id": config["listing_id"],
                "starting_bid": float(config.get("starting_bid", 0)),
                "current_highest_bid": float(config.get("current_highest_bid") or 0),
                "bid_count": int(config.get("bid_count", 0)),
                "buy_now_price": float(listing.get("total_value", 0) * 1.05) if listing else None,
                "end_time": _iso(end_time),
                "start_time": _iso(start_time),
                "is_active": True,
                "winner_id": None,
                "created_at": _iso(start_time),
                "updated_at": _iso(start_time),
                "seller_company": config.get("seller_company"),
                "seller_contact": config.get("seller_contact"),
                "watchers": config.get("watchers", 0),
                "featured": config.get("featured", False),
                "listing_title": listing.get("title"),
                "material_name": listing.get("material_name"),
                "category": listing.get("category"),
                "quantity": listing.get("quantity"),
                "quantity_unit": listing.get("quantity_unit"),
                "location": listing.get("location"),
                "image": (listing.get("images") or [None])[0],
            }
        )

    save_auctions(seeded)
    return seeded


def _refresh_auction_state(auctions: List[Dict]) -> List[Dict]:
    now = _utcnow()
    changed = False
    for auction in auctions:
        raw_end = auction.get("end_time")
        if isinstance(raw_end, str):
            if raw_end.endswith("Z"):
                end_time = datetime.fromisoformat(raw_end.replace("Z", "+00:00"))
            else:
                end_time = datetime.fromisoformat(raw_end)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
        else:
            end_time = raw_end or now
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)

        active = end_time > now
        if auction.get("is_active") != active:
            auction["is_active"] = active
            changed = True

        if auction.get("bid_count") is None:
            auction["bid_count"] = 0
            changed = True

        if auction.get("current_highest_bid") is None:
            auction["current_highest_bid"] = float(auction.get("starting_bid", 0))
            changed = True

    if changed:
        save_auctions(auctions)
    return auctions


def _total_value_from_listing(listing: Dict) -> float:
    try:
        total_value = float(listing.get("total_value") or 0)
    except (TypeError, ValueError):
        total_value = 0.0

    if total_value:
        return total_value

    try:
        quantity = float(listing.get("quantity") or 0)
    except (TypeError, ValueError):
        quantity = 0.0

    try:
        unit_price = float(listing.get("price_per_unit") or listing.get("price") or 0)
    except (TypeError, ValueError):
        unit_price = 0.0

    return round(quantity * unit_price, 2) if quantity and unit_price else 0.0


def _merge_with_virtual_auctions(auctions: List[Dict]) -> List[Dict]:
    """Augment persisted auctions with virtual auctions derived from listing data."""

    master_data = load_master_data()
    listings = master_data.get("waste_material_listings") if isinstance(master_data, dict) else None
    if not listings:
        return auctions

    existing_listing_ids = {
        auction.get("listing_id")
        for auction in auctions
        if auction.get("listing_id") is not None
    }

    virtual_auctions: List[Dict] = []
    now = _utcnow()

    for listing in listings:
        sale_type = (listing.get("sale_type") or listing.get("listing_type") or "").strip().lower()
        if sale_type not in {"auction", "for auction"}:
            continue

        listing_id = listing.get("id")
        if listing_id is None or listing_id in existing_listing_ids:
            continue

        status = (listing.get("status") or "").strip().lower()
        if status in {"inactive", "cancelled"}:
            continue

        total_value = _total_value_from_listing(listing)
        starting_bid = total_value * 0.55 if total_value else float(listing.get("price_per_unit") or 0) or 1.0
        current_highest = max(starting_bid * 1.1, starting_bid + max(total_value * 0.05, 1.0)) if starting_bid else 0.0

        inquiries = listing.get("inquiries") or 0
        views = listing.get("views") or 0
        try:
            bid_count = max(1, int(inquiries) // 2)
        except (TypeError, ValueError):
            bid_count = 1

        try:
            watchers = max(5, int(views) // 3)
        except (TypeError, ValueError):
            watchers = 5

        start_offset = (int(listing_id) % 6) + 1
        end_offset = (int(listing_id) % 24) + 6
        start_time = now - timedelta(hours=start_offset)
        end_time = now + timedelta(hours=end_offset)

        quantity_unit = listing.get("unit") or listing.get("quantity_unit")
        images = listing.get("images") or []

        virtual_auctions.append(
            {
                "id": 1000 + int(listing_id),
                "listing_id": listing_id,
                "starting_bid": round(max(starting_bid, 1.0), 2),
                "current_highest_bid": round(max(current_highest, starting_bid), 2),
                "bid_count": bid_count,
                "buy_now_price": round(total_value, 2) if total_value else None,
                "end_time": _iso(end_time),
                "start_time": _iso(start_time),
                "is_active": end_time > now and status not in {"expired"},
                "winner_id": None,
                "created_at": _iso(start_time),
                "updated_at": _iso(start_time),
                "seller_company": listing.get("seller_company"),
                "seller_contact": listing.get("seller_contact"),
                "watchers": watchers,
                "featured": bool(int(listing_id) % 3 == 0),
                "listing_title": listing.get("title"),
                "material_name": listing.get("material_name"),
                "category": listing.get("category"),
                "quantity": listing.get("quantity"),
                "quantity_unit": quantity_unit,
                "location": listing.get("location"),
                "image": images[0] if images else None,
            }
        )

    if not virtual_auctions:
        return auctions

    return auctions + virtual_auctions


def _build_listing_index() -> Dict[int, Dict]:
    index: Dict[int, Dict] = {}

    try:
        for listing in load_listings():
            listing_id = listing.get("id")
            if listing_id is None:
                continue
            index[int(listing_id)] = dict(listing)
    except Exception:
        pass

    master_data = load_master_data()
    if isinstance(master_data, dict):
        for listing in master_data.get("waste_material_listings", []):
            listing_id = listing.get("id")
            if listing_id is None:
                continue
            combined = dict(listing)
            if listing_id in index:
                # Allow persisted listing fields (status updates, etc.) to override master defaults
                combined.update(index[listing_id])
            sale_type = combined.get("sale_type")
            listing_type_value = combined.get("listing_type")
            if listing_type_value and isinstance(listing_type_value, str):
                lt_lower = listing_type_value.strip().lower()
                if lt_lower in {"auction", "fixed_price"}:
                    sale_type = listing_type_value
            if sale_type:
                combined["sale_type"] = sale_type
                combined.setdefault("listing_type", sale_type)

            quantity_unit = combined.get("quantity_unit") or combined.get("unit")
            if quantity_unit:
                combined["quantity_unit"] = quantity_unit
            index[int(listing_id)] = combined

    return index


def _apply_listing_context(auctions: List[Dict]) -> List[Dict]:
    listing_index = _build_listing_index()
    inactive_statuses = {"sold", "inactive", "cancelled", "expired", "completed"}

    for auction in auctions:
        listing_id = auction.get("listing_id")
        if listing_id is None:
            continue

        listing: Optional[Dict] = listing_index.get(int(listing_id))
        if not listing:
            continue

        sale_type = (listing.get("sale_type") or listing.get("listing_type") or "").strip().lower()
        if sale_type not in {"auction", "for auction"}:
            continue

        status = (listing.get("status") or "").strip().lower()
        auction["status"] = status or auction.get("status")
        auction["listing_title"] = listing.get("title") or auction.get("listing_title")
        auction["material_name"] = listing.get("material_name") or auction.get("material_name")
        auction["category"] = listing.get("category") or auction.get("category")
        auction["quantity"] = listing.get("quantity") or auction.get("quantity")
        auction["quantity_unit"] = (
            listing.get("unit")
            or listing.get("quantity_unit")
            or auction.get("quantity_unit")
        )
        auction["location"] = listing.get("location") or auction.get("location")
        images = listing.get("images")
        if images:
            auction["image"] = images[0]

        total_value = _total_value_from_listing(listing)
        if total_value and not auction.get("buy_now_price"):
            auction["buy_now_price"] = round(total_value, 2)

        auction["is_active"] = status not in inactive_statuses

    return auctions


def _get_all_seeded() -> List[Dict]:
    auctions = _seed_auctions_if_needed()
    refreshed = _refresh_auction_state(auctions)
    merged = _merge_with_virtual_auctions(refreshed)
    return _apply_listing_context(merged)


@router.get("/active")
def get_active_auctions(skip: int = 0, limit: int = 100):
    """Return active auction lots for the live marketplace view."""
    auctions = _get_all_seeded()
    auctions.sort(key=lambda item: (
        0 if item.get("is_active", False) else 1,
        item.get("end_time"),
    ))
    return auctions[skip : skip + limit]


@router.get("/{listing_id}")
def get_auction_for_listing(listing_id: int):
    auctions = _get_all_seeded()
    auction = next((a for a in auctions if a.get("listing_id") == listing_id), None)
    if not auction:
        auction = get_auction_by_listing_id(listing_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("/{auction_id}/bid", status_code=status.HTTP_201_CREATED)
def place_bid(auction_id: int, bid: BidCreate, current_user=Depends(get_current_active_user)):
    """Place a bid on an auction"""
    auctions = _get_all_seeded()
    auction = next((a for a in auctions if a.get("id") == auction_id), None)
    if not auction:
        auction = get_auction_by_id(auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Check if auction is active
    if not auction.get('is_active', True):
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    # Check auction end time
    end_time = datetime.fromisoformat(auction['end_time'].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > end_time:
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    # Get listing to check seller
    listing = get_listing_by_id(auction['listing_id'])
    if listing['seller_id'] == current_user.get('id'):
        raise HTTPException(status_code=400, detail="Cannot bid on your own auction")
    
    # Validate bid amount
    current_highest = auction.get('current_highest_bid', auction.get('starting_bid', 0))
    if bid.amount <= current_highest:
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be higher than current highest bid (${current_highest})"
        )
    
    # Update all previous bids to not winning
    bids = load_bids()
    for existing_bid in bids:
        if existing_bid.get('auction_id') == auction_id:
            existing_bid['is_winning'] = False
    save_bids(bids)
    
    # Create new bid
    new_bid = create_bid({
        'amount': bid.amount,
        'auction_id': auction_id,
        'bidder_id': current_user.get('id'),
        'is_winning': True
    })
    
    # Update auction with new highest bid
    update_auction(auction_id, {'current_highest_bid': bid.amount})
    
    return new_bid


@router.get("/{auction_id}/bids")
def get_auction_bids(auction_id: int):
    """Get all bids for an auction"""
    bids = get_bids_by_auction(auction_id)
    # Sort by amount descending
    bids.sort(key=lambda x: x.get('amount', 0), reverse=True)
    return bids
