# Extended Data Structure Guide

## Overview

The `waste_streams_dashboard_data.json` file now includes **extended data** beyond waste materials, adding:
- ✅ **Machinery Listings** (5 regular + 12 shutdown)
- ✅ **Company Shutdowns** (5 companies liquidating)
- ✅ **Material-Machinery Associations**
- ✅ **Bundled Packages** (complete setups)
- ✅ **Chatbot Recommendations** (for business scenarios)
- ✅ **Target Industries** (investment guidance)

## New Data Sections

### 1. Waste Material Listings (20 items)
Key changes from old structure:
- Field renamed: `listing_type` → `sale_type`
- Location: `waste_material_listings` instead of `listings`

**Status Breakdown:**
- Active: 1 (Rubber Crumb)
- Pending: 5 listings
- Sold: 9 listings
- Expired: 5 listings

### 2. Machinery Listings (5 items)
Regular equipment sales from companies upgrading:

**Example:**
```json
{
  "id": "MACH001",
  "title": "Dual-Shaft Shredder - Coparm DS-2000",
  "machine_type": "Dual-Shaft Shredder",
  "category": "Processing & Shredding Equipment",
  "price_inr": 1850000,
  "original_price_inr": 4500000,
  "depreciation_percentage": 58.89,
  "compatible_materials": ["HDPE Scrap", "PET Bottles", "PP Scrap"],
  "condition": "Excellent",
  "year_of_manufacture": 2016
}
```

### 3. Company Shutdowns (5 companies)
Complete business liquidations with multiple machinery:

**Companies:**
1. **Maharashtra Textiles Manufacturing Ltd** (Mumbai) - 15 machines
2. **Delhi Plastic Processing Industries** (Delhi) - 12 machines
3. **Karnataka Paper Mills Limited** (Bangalore) - 18 machines
4. **Gujarat Food Processing Corp** (Ahmedabad) - 10 machines
5. **Tamil Nadu Metal Works Pvt Ltd** (Chennai) - 20 machines

**Shutdown Reasons:**
- Business closure (competition/costs)
- Owner retirement
- Environmental compliance
- Financial distress
- Business relocation

### 4. Shutdown Machinery (12 items)
All machinery from liquidating companies with:
- Urgency levels (Very High, High, Medium)
- Liquidation deadlines
- Bulk discount offers
- Installation support
- Training included

**Special Features:**
- `bundle_discount`: "Buy all 8 looms get 20% discount"
- `auction_details`: Real-time bidding info
- `urgency_note`: "URGENT: Must vacate by Nov 10"
- `includes_molds`: Tooling included

### 5. Material-Machinery Associations
Smart connections between materials and processing equipment:

**Example:**
```json
{
  "material_name": "HDPE Scrap",
  "compatible_machinery": [
    {
      "machine_type": "Dual-Shaft Shredder",
      "primary_use": "Size reduction",
      "process": "Shreds HDPE into manageable pieces"
    },
    {
      "machine_type": "Twin Screw Extruder",
      "primary_use": "Pellet production",
      "process": "Converts clean HDPE into pellets"
    },
    {
      "machine_type": "Injection Molding Machine",
      "primary_use": "Product manufacturing",
      "process": "Creates finished products from recycled HDPE"
    }
  ],
  "business_opportunities": [
    "Recycled plastic pellet production",
    "Plastic pipe manufacturing",
    "Plastic lumber/furniture"
  ]
}
```

### 6. Bundled Packages (3 complete setups)
**PKG001**: Complete Textile Manufacturing Setup
- **Company**: Maharashtra Textiles Manufacturing Ltd
- **Total Value**: ₹2.5 Cr
- **Discounted**: ₹2.12 Cr (15% off)
- **Savings**: ₹37.5 Lakh
- **Includes**: Spinning machines, looms, compressors, material handling
- **Ready to Operate**: Yes (45 days setup + 15 days training)

**PKG002**: Complete Plastic Bottle Manufacturing Plant
- **Company**: Delhi Plastic Processing Industries
- **Total Value**: ₹1.85 Cr
- **Discounted**: ₹1.48 Cr (20% off)
- **Savings**: ₹37 Lakh
- **Includes**: Injection molding, blow molding, chiller

**PKG003**: Complete Beverage Bottling Unit
- **Company**: Gujarat Food Processing Corp (DISTRESS SALE)
- **Total Value**: ₹1.5 Cr
- **Discounted**: ₹1.12 Cr (**25% off**)
- **Savings**: ₹37.5 Lakh
- **Urgent**: Bank auction alternative
- **Includes**: Complete bottling line 12K bottles/hr, RO plant

### 7. Chatbot Recommendations (5 business scenarios)
Pre-configured business advice:

**SC001**: Paper manufacturing from agricultural waste
- Materials: Bagasse, Rice Husk, Straw
- Machinery: Pulp processing + Paper machine
- Investment: ₹35L - ₹3.5Cr
- ROI: 18-36 months

**SC002**: Plastic recycling business
- Materials: HDPE, PET, PP scrap
- Machinery: Shredder + Extruder
- Investment: ₹40L - ₹1.2Cr
- ROI: 12-24 months

**SC003**: Activated carbon from coconut shells
- Material: Coconut Shell
- Machinery: Carbonization furnace
- Investment: ₹15L - ₹50L
- ROI: 24-48 months

**SC004**: Complete bottling plant (urgent)
- Package: PKG003
- Investment: ₹1.12 Cr
- Ready: Immediately
- Urgency: Very High

**SC005**: Textile business setup
- Package: PKG001
- Investment: ₹2.12 Cr
- Complete: Spinning + Weaving

### 8. Target Industries (7 industries)
Detailed guidance for each industry:

| Industry | Materials | Machinery | Market Size | Investment | ROI Months |
|----------|-----------|-----------|-------------|------------|------------|
| Paper Manufacturing | Bagasse, Cardboard | Pulp processing | Medium-Large | ₹25L-1.5Cr | 18-36 |
| Plastic Recycling | HDPE, PET, PP | Shredders, Extruders | Large | ₹15L-1Cr | 12-24 |
| Biofuel Manufacturing | Bagasse, Rice Husk | Briquetting, Pelletizing | Growing | ₹30L-2Cr | 24-48 |
| Construction Materials | Fly Ash, Concrete | Brick making, Blocks | Very Large | ₹10L-80L | 15-30 |
| Metal Recycling | Steel, Aluminum | Shears, Baling | Large | ₹20L-2.5Cr | 18-36 |
| Textile Manufacturing | PET, Cotton | Spinning, Weaving | Very Large | ₹50L-3Cr | 30-48 |
| Beverage Bottling | PET, Glass | Bottling lines | Very Large | ₹50L-2.5Cr | 20-40 |

## Summary Metrics

```json
{
  "total_waste_listings": 20,
  "active_waste_listings": 5,
  "sold_waste_listings": 8,
  "total_machinery_listings": 50,
  "active_machinery_listings": 42,
  "shutdown_companies": 5,
  "liquidation_machinery_count": 75,
  "urgent_deals_count": 12
}
```

## Key Features for Chatbot

### Material-Machine Matching
The chatbot can now suggest:
1. **Materials** → Which machines to buy
2. **Machines** → Which materials to process
3. **Business Ideas** → Complete package recommendations

### Example Conversation:
**User**: "I want to start a plastic recycling business"

**Chatbot Response:**
```
🎯 Plastic Recycling Business Setup

📦 **Recommended Materials:**
• HDPE Scrap
• PET Bottles
• PP Scrap

🔧 **Essential Equipment:**
1. Dual-Shaft Shredder (₹18.5L) - MACH001
2. Twin Screw Extruder (₹28L) - MACH003
3. Injection Molding Machine (₹35L) - MACH_SD004 (from shutdown)

💰 **Total Investment**: ₹40L - ₹1.2Cr
📊 **ROI**: 12-24 months

💡 **Business Model**: Collect plastic waste → Shred → Extrude pellets → 
Manufacture products → Sell to automotive/packaging

🚀 **Or Consider**: Complete Plastic Plant Package (PKG002) 
Save ₹37 Lakh with 20% bulk discount!
```

## Next Steps

1. ✅ Update listings router (DONE)
2. ⏳ Add machinery endpoints
3. ⏳ Update chatbot to use machinery associations
4. ⏳ Add shutdown company listings
5. ⏳ Create bundled package recommendations

## Files Updated

- ✅ `app/routers/listings.py` - Now uses `waste_material_listings`
- ⏳ `app/routers/chatbot.py` - Needs machinery recommendation logic
- ⏳ Create `app/routers/machinery.py` - New endpoint for machinery
- ⏳ Update `app/routers/dashboard.py` - Include machinery stats

## Testing

```bash
# Test waste listings
curl http://localhost:8000/api/listings

# Test single listing
curl http://localhost:8000/api/listings/13

# Test chatbot with machinery request
curl -X POST http://localhost:8000/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to start a plastic recycling business. What equipment do I need?"}'
```

## Benefits

🎯 **Smart Recommendations**: Chatbot knows which machines work with which materials
💰 **Cost Savings**: Bulk discounts on complete packages
⚡ **Urgent Deals**: Distress sales at 25% discounts
📊 **Investment Guidance**: ROI estimates for each industry
🔄 **Complete Solutions**: Materials + Machines + Business plan

The extended data creates a **complete circular economy marketplace**! ♻️

