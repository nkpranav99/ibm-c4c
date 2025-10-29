'use client'

import React, { useEffect, useState } from 'react'
import { listingsAPI } from '../../lib/api'
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

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [material, setMaterial] = useState('')
  const [category, setCategory] = useState('')
  const [listingType, setListingType] = useState('')

  useEffect(() => {
    loadListings()
  }, [search, location, material, category, listingType])

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
      // For demo: show empty state but log the error
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Browse Waste Materials</h1>
          <p className="text-lg text-gray-600">Discover premium industrial waste materials for your business</p>
        </div>

        {/* Enhanced Filters */}
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
          <div className="mt-4 flex items-center justify-between">
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
        </div>

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
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Image/Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">{getCategoryEmoji(listing.category)}</span>
                  </div>
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow ${
                      listing.listing_type === 'auction' 
                        ? 'bg-yellow-400 text-yellow-900' 
                        : 'bg-green-500 text-white'
                    }`}>
                      {listing.listing_type === 'auction' ? '🎯 Auction' : '💰 Fixed Price'}
                    </span>
                    {listing.category && (
                      <span className="px-3 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full shadow">
                        {listing.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition">
                    {listing.title || listing.material_name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-primary-600">
                      ₹{listing.price?.toLocaleString() || listing.price_per_unit?.toLocaleString() || '0'}
                    </span>
                    <span className="text-sm text-gray-500">per {listing.quantity_unit || 'unit'}</span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Quantity:</span>
                      <span>{listing.quantity?.toLocaleString()} {listing.quantity_unit}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-20">Location:</span>
                      <span>📍 {listing.location}</span>
                    </div>
                    {listing.total_value && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Total Value:</span>
                        <span className="font-semibold text-primary-600">₹{listing.total_value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Seller Info */}
                  {listing.seller_company && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Seller</p>
                      <p className="text-sm font-medium text-gray-700">{listing.seller_company}</p>
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    {listing.views && (
                      <span>👁️ {listing.views} views</span>
                    )}
                    {listing.inquiries && (
                      <span>💬 {listing.inquiries} inquiries</span>
                    )}
                    {listing.date_posted && (
                      <span>📅 {new Date(listing.date_posted).toLocaleDateString()}</span>
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
