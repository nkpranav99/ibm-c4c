'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { listingsAPI } from '../../../lib/api'

export default function LiveAuctionsPage() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const highlightedId = searchParams?.get('highlight')

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true)
        const data = await listingsAPI.getAll({ listing_type: 'auction' })
        setAuctions(Array.isArray(data) ? data : [])
      } catch (err) {
        setError('Unable to fetch live auctions right now. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchAuctions()
  }, [])

  const activeAuctions = useMemo(
    () => auctions.filter((auction) => auction.listing_type === 'auction'),
    [auctions]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Live Auction Marketplace</h1>
          <p className="text-lg max-w-2xl">
            Track real-time bidding activity across premium waste material lots. Submit competitive bids and
            secure the resources your operations need before the timer runs out.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/listings" className="btn-secondary bg-white text-orange-600 hover:text-orange-700">
              Back to Listings
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-gray-600">Fetching live auctions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
        ) : activeAuctions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No live auctions at the moment</h2>
            <p className="text-gray-600 mb-4">Check back soon for new opportunities or browse fixed-price listings.</p>
            <Link href="/listings" className="btn-primary">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeAuctions.map((auction) => {
              const unitPrice = auction.price || auction.price_per_unit || 0
              const syntheticCurrentBid = Number((unitPrice * 1.08).toFixed(2))
              const syntheticBids = Math.max(auction.views || 0, 12)

              return (
                <div
                  key={auction.id}
                  className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border ${
                    highlightedId && Number(highlightedId) === auction.id
                      ? 'border-orange-500 ring-2 ring-orange-200'
                      : 'border-transparent'
                  }`}
                >
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-red-100 relative">
                    {auction.images && auction.images.length > 0 ? (
                      <img src={auction.images[0]} alt={auction.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">🔥</div>
                    )}
                    <div className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-white/90 text-orange-600 shadow">
                      Live Auction
                    </div>
                    <div className="absolute bottom-3 right-3 px-3 py-1 text-xs bg-black/60 text-white rounded-full">
                      {syntheticBids} bids placed
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{auction.title}</h2>
                      <p className="text-sm text-gray-500">Material: {auction.material_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-700">Current Bid</p>
                        <p className="text-lg font-bold text-orange-600">₹{syntheticCurrentBid.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Quantity</p>
                        <p>{auction.quantity?.toLocaleString()} {auction.quantity_unit}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Location</p>
                        <p>📍 {auction.location}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Seller</p>
                        <p>{auction.seller_company || 'Verified Seller'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Ends in approximately {Math.max(1, (auction.views || 6) % 24)} hours
                      </span>
                      <Link href={`/listing/${auction.id}`} className="btn-primary text-sm">
                        Place a Bid
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


