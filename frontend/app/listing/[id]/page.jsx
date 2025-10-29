'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { listingsAPI, ordersAPI, auctionsAPI } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [listing, setListing] = useState(null)
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')

  useEffect(() => {
    loadListing()
  }, [params.id])

  const loadListing = async () => {
    try {
      const listingData = await listingsAPI.getById(Number(params.id))
      setListing(listingData)

      if (listingData.listing_type === 'auction') {
        try {
          const auctionData = await auctionsAPI.getByListingId(listingData.id)
          setAuction(auctionData)
        } catch (error) {
          console.error('No auction found')
        }
      }
    } catch (error) {
      console.error('Failed to load listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const quantity = parseFloat(orderQuantity)
    const totalPrice = quantity * (listing?.price || 0)

    try {
      await ordersAPI.create({
        listing_id: listing.id,
        quantity,
        total_price: totalPrice,
      })
      alert('Order placed successfully!')
      router.push('/dashboard')
    } catch (error) {
      alert(error?.response?.data?.detail || 'Failed to place order')
    }
  }

  const handlePlaceBid = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    if (!auction) return

    try {
      await auctionsAPI.placeBid(auction.id, parseFloat(bidAmount))
      alert('Bid placed successfully!')
      loadListing()
    } catch (error) {
      alert(error?.response?.data?.detail || 'Failed to place bid')
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!listing) return <div className="text-center py-12">Listing not found</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column - Image and Description */}
        <div>
          <div className="aspect-video bg-primary-100 rounded-lg mb-4"></div>
          <div className="card">
            <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
            <p className="text-gray-600 mb-6">{listing.description}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Material:</span>
                <span className="font-semibold">{listing.material_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-semibold">{listing.quantity} {listing.quantity_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-semibold">{listing.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available from:</span>
                <span className="font-semibold">{new Date(listing.availability_from).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available to:</span>
                <span className="font-semibold">{new Date(listing.availability_to).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Purchase/Bid Section */}
        <div className="space-y-6">
          <div className="card">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-primary-600">${listing.price}</span>
              <p className="text-gray-600">per {listing.quantity_unit}</p>
            </div>

            {listing.listing_type === 'fixed_price' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  className="input-field mb-4"
                  placeholder="Enter quantity"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
                <button onClick={handlePlaceOrder} className="btn-primary w-full">
                  Place Order
                </button>
              </div>
            ) : (
              auction && (
                <div>
                  <div className="mb-4 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-gray-600">Current Highest Bid</p>
                    <p className="text-2xl font-bold text-primary-600">
                      ${auction.current_highest_bid || auction.starting_bid}
                    </p>
                  </div>
                  <label className="block text-sm font-medium mb-2">Your Bid</label>
                  <input
                    type="number"
                    className="input-field mb-4"
                    placeholder="Enter bid amount"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                  />
                  <button onClick={handlePlaceBid} className="btn-primary w-full">
                    Place Bid
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Auction ends: {new Date(auction.end_time).toLocaleString()}
                  </p>
                </div>
              )
            )}
          </div>

          {listing.seller_id !== user?.id && (
            <div className="card bg-primary-50">
              <h3 className="font-semibold mb-2">Seller Information</h3>
              <p className="text-sm text-gray-600">Contact the seller for more details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

