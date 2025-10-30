'use client'

import React, { useEffect, useState } from 'react'
import { listingsAPI, machineryAPI } from '../../lib/api'
import Link from 'next/link'

const categories = [
  'All Categories',
  'Agricultural/Biomass',
  'Industrial Ash',
  'Plastic Waste',
  'Metal Scrap',
  'Paper & Cardboard',
  'Construction & Demolition',
  'Glass',
  'Textile Waste',
  'Rubber & Tires',
  'Organic/Food Waste'
]

const machineryCategories = [
  'All Categories',
  'Processing & Shredding Equipment',
  'Paper & Pulp Equipment',
  'Manufacturing Equipment',
  'Agricultural & Biomass Processing',
  'Compaction & Baling',
  'Textile Manufacturing Equipment',
  'Plastic Manufacturing Equipment',
  'Food Processing Equipment',
  'Metal Cutting Equipment',
  'Metal Forming Equipment',
  'Utility Equipment',
  'Cooling Equipment',
  'Steam Generation Equipment',
  'Water Treatment Equipment'
]

const machineryConditions = [
  'All Conditions',
  'Excellent',
  'Good',
  'Fair'
]

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [material, setMaterial] = useState('')
  const [category, setCategory] = useState('')
  const [listingType, setListingType] = useState('')
  const [activeTab, setActiveTab] = useState('materials') // 'materials' or 'machinery'
  const [showAllButton, setShowAllButton] = useState(false)
  
  // Machinery-specific filters
  const [machineCategory, setMachineCategory] = useState('')
  const [machineCondition, setMachineCondition] = useState('')
  const [machineBrand, setMachineBrand] = useState('')
  const [machineType, setMachineType] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  
  // Package data for syncing
  const [packages, setPackages] = useState([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)

  useEffect(() => {
    if (activeTab === 'materials') {
      loadListings()
    } else {
      loadMachinery()
    }
  }, [search, location, material, category, listingType, activeTab, 
      machineCategory, machineCondition, machineBrand, machineType, minPrice, maxPrice])

  const loadListings = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (location) params.location = location
      if (material) params.material_name = material
      if (listingType) params.listing_type = listingType
      if (category && category !== 'All Categories') params.search = category
      
      console.log('Fetching listings with params:', params)
      const data = await listingsAPI.getAll(params)
      console.log('Received listings:', data?.length || 0, data)
      setListings(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load listings:', error)
      console.error('Error details:', error?.response?.data || error?.message)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const loadMachinery = async () => {
    try {
      setLoading(true)
      const params = { limit: 100 }
      if (search) params.search = search
      if (location) params.location = location
      if (machineCategory) params.category = machineCategory
      if (machineCondition) params.condition = machineCondition
      if (machineBrand) params.search = machineBrand // Brand search
      if (machineType) params.machine_type = machineType
      if (minPrice) params.min_price = parseFloat(minPrice)
      if (maxPrice) params.max_price = parseFloat(maxPrice)
      
      console.log('Fetching machinery with params:', params)
      
      // Fetch packages data first if not already loaded
      if (!packagesLoaded) {
        try {
          const packagesData = await machineryAPI.getPackages()
          setPackages(packagesData)
          setPackagesLoaded(true)
          console.log('Loaded packages:', packagesData.length)
        } catch (err) {
          console.error('Failed to load packages:', err)
        }
      }
      
      // Fetch machinery data
      const data = await machineryAPI.getAll(params)
      console.log('Received machinery:', data?.length || 0, data)
      
      // Fetch packages again to ensure we have the latest data for enrichment
      const currentPackages = packages.length > 0 ? packages : await machineryAPI.getPackages()
      
      // Enrich machinery items with package information
      const enrichedData = data.map(item => {
        // Find which package this machine belongs to
        const packageInfo = currentPackages.find(pkg => 
          pkg.included_machinery_ids && pkg.included_machinery_ids.includes(item.id)
        )
        
        if (packageInfo) {
          return {
            ...item,
            package_id: packageInfo.package_id,
            package_name: packageInfo.package_name,
            package_discount: packageInfo.savings_percentage,
            is_part_of_package: true
          }
        }
        return item
      })
      
      setListings(Array.isArray(enrichedData) ? enrichedData : [])
    } catch (error) {
      console.error('Failed to load machinery:', error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  const getCategoryEmoji = (cat) => {
    const emojis = {
      'Agricultural/Biomass': '🌾',
      'Industrial Ash': '⚡',
      'Plastic Waste': '♻️',
      'Metal Scrap': '⚙️',
      'Paper & Cardboard': '📦',
      'Construction & Demolition': '🏗️',
      'Glass': '🪟',
      'Textile Waste': '👕',
      'Rubber & Tires': '🚗',
      'Organic/Food Waste': '🍎'
    }
    return emojis[cat] || '📦'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Tabs */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Marketplace</h1>
          <p className="text-lg text-gray-600">Discover premium materials and machinery for your business</p>
          
          {/* Tab Selector */}
          <div className="mt-6 flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'materials'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌾 Waste Materials
            </button>
            <button
              onClick={() => setActiveTab('machinery')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'machinery'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔧 Machinery & Equipment
            </button>
          </div>
        </div>

        {/* Enhanced Filters - Only show for materials tab */}
        {activeTab === 'materials' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Search & Filter</h2>
            <div className="grid md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="🔍 Search materials..."
                className="input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="📍 Location"
                className="input-field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <input
                type="text"
                placeholder="🔧 Material type"
                className="input-field"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
              <select
                className="input-field"
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="fixed_price">💰 Fixed Price</option>
                <option value="auction">🎯 Auction</option>
              </select>
            </div>
          </div>
        )}
        
        {/* Machinery Info Banner */}
        {activeTab === 'machinery' && (
          <>
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">🔧 Industrial Machinery & Equipment</h2>
                  <p className="text-gray-600">
                    Browse {listings.length} machines including regular equipment and liquidation sales
                  </p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Regular Machinery
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Shutdown Liquidation
                    </span>
                  </div>
                </div>
                <Link href="/packages" className="btn-primary">
                  View Bundled Packages →
                </Link>
              </div>
            </div>

            {/* Machinery Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">🔍 Filter Machinery</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="🔍 Search by name or brand..."
                  className="input-field"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="input-field"
                  value={machineCategory}
                  onChange={(e) => setMachineCategory(e.target.value)}
                >
                  {machineryCategories.map((cat) => (
                    <option key={cat} value={cat === 'All Categories' ? '' : cat}>{cat}</option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={machineCondition}
                  onChange={(e) => setMachineCondition(e.target.value)}
                >
                  {machineryConditions.map((cond) => (
                    <option key={cond} value={cond === 'All Conditions' ? '' : cond}>{cond}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="📍 Location"
                  className="input-field"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-4 gap-4 mt-4">
                <input
                  type="text"
                  placeholder="🏭 Brand (e.g., Coparm, Andritz)"
                  className="input-field"
                  value={machineBrand}
                  onChange={(e) => setMachineBrand(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="🔧 Machine Type"
                  className="input-field"
                  value={machineType}
                  onChange={(e) => setMachineType(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="💰 Min Price (₹ Lakhs)"
                  className="input-field"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="💰 Max Price (₹ Lakhs)"
                  className="input-field"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              {(search || location || machineCategory || machineCondition || machineBrand || machineType || minPrice || maxPrice) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSearch('')
                      setLocation('')
                      setMachineCategory('')
                      setMachineCondition('')
                      setMachineBrand('')
                      setMachineType('')
                      setMinPrice('')
                      setMaxPrice('')
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Item Count and Clear Filters */}
        {activeTab === 'materials' && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {listings.length} {listings.length === 1 ? 'product' : 'products'} available
            </span>
            {(search || location || material || category || listingType) && (
              <button
                onClick={() => {
                  setSearch('')
                  setLocation('')
                  setMaterial('')
                  setCategory('')
                  setListingType('')
                }}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        
        {activeTab === 'machinery' && (
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {listings.length} {listings.length === 1 ? 'machine' : 'machines'} available
            </span>
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSearch('')
                setLocation('')
                setMaterial('')
                setCategory('')
                setListingType('')
              }}
              className="btn-primary"
            >
              Show All Listings
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {listings.map((item) => (
              <Link
                key={item.id}
                href={activeTab === 'materials' ? `/listing/${item.id}` : '#'}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Image/Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {activeTab === 'materials' ? (
                      <span className="text-6xl">{getCategoryEmoji(item.category)}</span>
                    ) : (
                      <span className="text-6xl">🔧</span>
                    )}
                  </div>
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {activeTab === 'materials' ? (
                      <>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow ${
                          item.listing_type === 'auction' 
                            ? 'bg-yellow-400 text-yellow-900' 
                            : 'bg-green-500 text-white'
                        }`}>
                          {item.listing_type === 'auction' ? '🎯 Auction' : '💰 Fixed Price'}
                        </span>
                        {item.category && (
                          <span className="px-3 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full shadow">
                            {item.category}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow ${
                          item.seller_type?.includes('Shutdown') 
                            ? 'bg-red-500 text-white' 
                            : item.sale_type === 'auction'
                            ? 'bg-yellow-400 text-yellow-900'
                            : 'bg-purple-500 text-white'
                        }`}>
                          {item.seller_type?.includes('Shutdown') ? '🚨 Liquidation' : item.sale_type === 'auction' ? '🎯 Auction' : '💰 Fixed'}
                        </span>
                        {item.machine_type && (
                          <span className="px-3 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full shadow truncate max-w-[150px]">
                            {item.machine_type}
                          </span>
                        )}
                        {item.is_part_of_package && (
                          <span className="px-3 py-1 text-xs font-bold bg-green-500 text-white rounded-full shadow animate-pulse">
                            📦 Part of Package • Save {item.package_discount}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition">
                    {item.title || item.material_name}
                  </h3>
                  
                  {activeTab === 'materials' ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold text-primary-600">
                          ₹{item.price?.toLocaleString() || item.price_per_unit?.toLocaleString() || '0'}
                        </span>
                        <span className="text-sm text-gray-500">per {item.quantity_unit || 'unit'}</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">Quantity:</span>
                          <span>{item.quantity?.toLocaleString()} {item.quantity_unit}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">Location:</span>
                          <span>📍 {item.location}</span>
                        </div>
                        {item.total_value && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-20">Total Value:</span>
                            <span className="font-semibold text-primary-600">₹{item.total_value.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold text-purple-600">
                          ₹{(item.price_inr / 100000).toFixed(1)}L
                        </span>
                        {item.original_price_inr && (
                          <span className="text-sm text-gray-400 line-through">
                            ₹{(item.original_price_inr / 100000).toFixed(1)}L
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        {item.brand && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-24">Brand:</span>
                            <span>{item.brand}</span>
                          </div>
                        )}
                        {item.condition && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-24">Condition:</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.condition === 'Excellent' ? 'bg-green-100 text-green-800' :
                              item.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {item.condition}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-24">Location:</span>
                          <span>📍 {item.location}</span>
                        </div>
                        {item.year_of_manufacture && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-24">Year:</span>
                            <span>{item.year_of_manufacture}</span>
                          </div>
                        )}
                        {item.depreciation_percentage && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium w-24">Discount:</span>
                            <span className="font-semibold text-green-600">{item.depreciation_percentage.toFixed(1)}% off</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                      {/* Package Info - for machinery */}
                      {activeTab === 'machinery' && item.is_part_of_package && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">📦</span>
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-green-800 mb-1">Part of Complete Package</p>
                              <p className="text-sm text-green-700 font-medium">{item.package_name}</p>
                              <Link href="/packages" className="text-xs text-green-600 hover:text-green-800 underline mt-1 inline-block">
                                View Complete Package →
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seller Info */}
                      {item.seller_company && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500">Seller</p>
                          <p className="text-sm font-medium text-gray-700">{item.seller_company}</p>
                        </div>
                      )}

                  {/* Engagement Stats */}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    {item.views && (
                      <span>👁️ {item.views} views</span>
                    )}
                    {item.inquiries && (
                      <span>💬 {item.inquiries} inquiries</span>
                    )}
                    {item.date_posted && (
                      <span>📅 {new Date(item.date_posted).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Hover Effect Bar */}
                <div className="h-1 bg-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
