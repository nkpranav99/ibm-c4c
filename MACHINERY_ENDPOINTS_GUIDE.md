# Machinery Endpoints Guide

## ✅ New Endpoints Available

All machinery endpoints are now live and working!

### 1. **Get All Machinery** - `/api/machinery`

Returns both regular and shutdown machinery with filtering.

**Query Parameters:**
- `skip`, `limit` - Pagination
- `search` - Search by title, machine type, category, brand
- `machine_type` - Filter by machine type
- `category` - Filter by category
- `location` - Filter by location
- `min_price`, `max_price` - Price range
- `condition` - Filter by condition (Excellent, Good, Fair)
- `seller_type` - Filter by seller type

**Example:**
```bash
curl http://localhost:8000/api/machinery?limit=10
curl http://localhost:8000/api/machinery?category=Plastic
curl http://localhost:8000/api/machinery?min_price=1000000&max_price=5000000
```

**Returns:** Array of 17 machinery items (5 regular + 12 shutdown)

### 2. **Get Shutdown Machinery Only** - `/api/machinery/shutdown`

Returns only machinery from liquidating companies.

**Example:**
```bash
curl http://localhost:8000/api/machinery/shutdown?limit=12
```

**Returns:** Array of 12 shutdown machinery items

### 3. **Get Bundled Packages** - `/api/machinery/packages`

Returns complete business setups with bulk discounts.

**Example:**
```bash
curl http://localhost:8000/api/machinery/packages
```

**Returns:** 3 bundled packages:
- PKG001: Complete Textile Setup - 15% off (₹37.5L savings)
- PKG002: Plastic Bottle Plant - 20% off (₹37L savings)  
- PKG003: Beverage Bottling Unit - 25% off (₹37.5L savings)

### 4. **Get Shutdown Companies** - `/api/machinery/shutdown-companies`

Returns companies that are liquidating.

**Example:**
```bash
curl http://localhost:8000/api/machinery/shutdown-companies
```

**Returns:** 5 companies with:
- Company name, location, urgency level
- Machinery count, estimated value
- Contact info, liquidation deadline
- Bulk discount percentage

### 5. **Get Machinery Detail** - `/api/machinery/{machinery_id}`

Get details of a specific machinery.

**Example:**
```bash
curl http://localhost:8000/api/machinery/MACH001
curl http://localhost:8000/api/machinery/MACH_SD004
```

**Returns:** Complete machinery details including:
- Price, condition, year
- Compatible materials
- Target industries
- Auction details (if applicable)
- Urgency notes

### 6. **Get Compatible Machinery** - `/api/machinery/associations/{material_name}`

Find machinery that can process a specific material.

**Example:**
```bash
curl http://localhost:8000/api/machinery/associations/HDPE%20Scrap
curl http://localhost:8000/api/machinery/associations/Bagasse
```

**Returns:** Material association with:
- Compatible machinery types
- Primary use cases
- Target industries
- Processing details
- Business opportunities

### 7. **Get Machinery Stats** - `/api/machinery/stats/summary`

Get summary statistics.

**Example:**
```bash
curl http://localhost:8000/api/machinery/stats/summary
```

**Returns:**
```json
{
  "total_regular_machinery": 5,
  "total_shutdown_machinery": 12,
  "total_machinery": 17,
  "active_machinery_listings": 42,
  "total_machinery_listings": 50,
  "shutdown_companies": 5,
  "liquidation_machinery_count": 75,
  "urgent_deals_count": 12,
  "total_estimated_value_inr": 118500000,
  "average_discount_percentage": 20
}
```

## Sample Machinery Data

### Regular Machinery (5 items)
1. **Dual-Shaft Shredder** - Coparm DS-2000 - ₹18.5L
2. **Pulp Processing Line** - Andritz APM-500 - ₹35L
3. **Twin Screw Extruder** - Berstorff ZE-60 - ₹28L
4. **Carbonization Furnace** - Beston BST-10 - ₹15L
5. **Hydraulic Baler** - Macfab MB-60 - ₹9.5L

### Shutdown Machinery (12 items)
1. **Textile Spinning Machine** - Rieter G35 - ₹85L
2. **Plastic Injection Molding** - Haitian Mars 250 - ₹35L
3. **Blow Molding Machine** - Krones Contiform - ₹72L (Auction)
4. **Paper Making Machine** - Voith PM-2000 - ₹1.2Cr
5. **Bottling Line** - Krones VK-72 - ₹85L (DISTRESS SALE)
6. **CNC Laser Cutter** - Trumpf TruLaser - ₹95L (Auction)
7. Plus 6 more...

## Key Features

### 💰 Bulk Discounts
- Textile Setup: 15% off (₹37.5L savings)
- Plastic Plant: 20% off (₹37L savings)
- Bottling Unit: **25% off** (₹37.5L savings)

### ⚡ Urgent Deals
- **Very High Urgency**: Must sell by November 10-15
- **Distress Sales**: Bank auction alternatives
- **Time-Limited**: Liquidation deadlines

### 🔧 Complete Setups
- Ready-to-operate plants
- Training included
- Installation support
- All auxiliary equipment
- Spare parts inventory

### 🤝 Special Features
- `bundle_discount`: "Buy all 8 looms get 20% discount"
- `auction_details`: Real-time bidding
- `includes_molds`: Tooling included
- `training_included`: Operator training
- `negotiable`: Price flexibility

## Integration Examples

### For Frontend Dashboard

```javascript
// Get all machinery for the dashboard
const machinery = await fetch('/api/machinery?limit=10');

// Get urgent deals
const urgent = await fetch('/api/machinery?seller_type=Complete Shutdown');

// Get bundles
const packages = await fetch('/api/machinery/packages');

// Get compatible machinery for a material
const compatible = await fetch('/api/machinery/associations/HDPE Scrap');
```

### For Chatbot Integration

```python
# Get machinery for a material
response = requests.get('/api/machinery/associations/Bagasse')

# Suggest bundles
packages = requests.get('/api/machinery/packages')

# Find specific machinery
shredder = requests.get('/api/machinery/MACH001')
```

## Status

✅ All endpoints created and tested  
✅ Regular machinery: 5 items  
✅ Shutdown machinery: 12 items  
✅ Bundled packages: 3  
✅ Company shutdowns: 5  
✅ Material associations: Working  
✅ Filtering: All parameters working  
✅ Stats: Complete summary available  

## Next Steps

1. ⏳ Update frontend to display machinery
2. ⏳ Add machinery search functionality
3. ⏳ Integrate material-machinery recommendations in chatbot
4. ⏳ Create machinery detail pages
5. ⏳ Add urgency badges for shutdown sales

## Testing

All endpoints tested and verified:
- ✅ `/api/machinery` - 17 items returned
- ✅ `/api/machinery/shutdown` - 12 items
- ✅ `/api/machinery/packages` - 3 packages
- ✅ `/api/machinery/shutdown-companies` - 5 companies
- ✅ `/api/machinery/associations/HDPE Scrap` - Associations working
- ✅ `/api/machinery/stats/summary` - Stats correct

**The machinery API is fully functional!** 🎉

