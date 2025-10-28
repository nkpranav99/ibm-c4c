'use client'

import React, { useEffect, useState } from 'react'
import { listingsAPI } from '@/lib/api'
import Link from 'next/link'

export default function ListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [material, setMaterial] = useState('')
  const [listingType, setListingType] = useState('')

  useEffect(() => {
    loadListings()
  }, [search, location, material, listingType])

  const loadListings = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (location) params.location = location
      if (material) params.material_name = material
      if (listingType) params.listing_type = listingType
      
      const data = await listingsAPI.getAll(params)
      setListings(data)
    } catch (error) {
      console.error('Failed to load listings:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Waste Materials</h1>

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search materials..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="text"
            placeholder="Location"
            className="input-field"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            type="text"
            placeholder="Material type"
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
            <option value="fixed_price">Fixed Price</option>
            <option value="auction">Auction</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No listings found. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listing/${listing.id}`}
              className="card hover:shadow-xl transition-all"
            >
              <div className="aspect-video bg-primary-100 rounded-lg mb-4"></div>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  listing.listing_type === 'auction' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {listing.listing_type === 'auction' ? 'Auction' : 'Fixed Price'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  listing.status === 'active' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {listing.status}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{listing.material_name}</p>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{listing.description}</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xl font-bold text-primary-600">${listing.price}</span>
                <span className="text-sm text-gray-600">{listing.quantity} {listing.quantity_unit}</span>
              </div>
              <p className="text-sm text-gray-500">📍 {listing.location}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

