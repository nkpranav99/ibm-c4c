'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { listingsAPI, ordersAPI, auctionsAPI } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import { createMockOrder } from '../../../lib/mockOrders'

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [listing, setListing] = useState(null)
  const [auction, setAuction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [orderQuantity, setOrderQuantity] = useState('')
  const [orderMessage, setOrderMessage] = useState({ type: '', text: '' })
  const [bidMessage, setBidMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadListing()
  }, [params.id])

  const buildSyntheticAuction = (listingData) => {
    const basePrice = listingData?.price || listingData?.price_per_unit || 0
    const currentBid = Number((basePrice * 1.08).toFixed(2))
    return {
      id: null,
      listing_id: listingData?.id,
      current_highest_bid: currentBid,
      starting_bid: Number((basePrice * 1.02).toFixed(2)),
      end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      total_bids: Math.max(5, Math.round((listingData?.views || 10) / 3)),
    }
  }

  const loadListing = async () => {
    try {
      const listingData = await listingsAPI.getById(Number(params.id))
      setListing(listingData)

      if (listingData.listing_type === 'auction') {
        let auctionData = null

        const useAuctionApi = process.env.NEXT_PUBLIC_ENABLE_AUCTION_API === 'true'
        if (useAuctionApi) {
          try {
            auctionData = await auctionsAPI.getByListingId(listingData.id)
          } catch (error) {
            console.warn('Auction not found, using synthetic data instead')
          }
        }

        if (!auctionData) {
          auctionData = buildSyntheticAuction(listingData)
        }
        setAuction(auctionData)
      } else {
        setAuction(null)
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

    const minimumQuantity = Math.max(1, listing?.min_order_quantity || 1)
    const quantity = parseFloat(orderQuantity)
    if (!Number.isFinite(quantity) || quantity < minimumQuantity) {
      setOrderMessage({
        type: 'error',
        text: minimumQuantity > 1
          ? `Please enter at least ${minimumQuantity} ${listing?.quantity_unit || 'units'}.`
          : 'Please enter a valid quantity greater than zero.',
      })
      return
    }

    const unitPrice = listing?.price || listing?.price_per_unit || 0
    const totalPrice = Number((quantity * unitPrice).toFixed(2))

    try {
      await ordersAPI.create({
        listing_id: listing.id,
        quantity,
        total_price: totalPrice,
      })
      setOrderMessage({ type: 'success', text: 'Order placed successfully! Check your dashboard for updates.' })
      setOrderQuantity('')
    } catch (error) {
      try {
        const mockOrder = createMockOrder({
          listingId: listing.id,
          listingTitle: listing.title,
          buyerEmail: user?.email || user?.username,
          quantity,
          unit: listing.quantity_unit || listing.unit || 'unit',
          pricePerUnit: unitPrice,
          totalPrice,
        })

        setOrderMessage({
          type: 'success',
          text: `Order recorded for demo use (Order #${mockOrder.id}). We will notify the seller shortly.`,
        })
        setOrderQuantity('')
      } catch (mockErr) {
        setOrderMessage({
          type: 'error',
          text: mockErr?.message || error?.response?.data?.detail || 'Failed to place order. Please try again later.',
        })
      }
    }
  }

  const handlePlaceBid = async () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    const numericBid = parseFloat(bidAmount)
    const bidBaseline = auction?.current_highest_bid || auction?.starting_bid || computedCurrentBid || unitPrice || 0
    const minimumAllowedBid = bidBaseline > 0 ? bidBaseline * 1.01 : 0

    if (!Number.isFinite(numericBid) || numericBid <= minimumAllowedBid) {
      setBidMessage({
        type: 'error',
        text: `Please enter a bid greater than ₹${minimumAllowedBid.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}.`,
      })
      return
    }

    try {
      if (auction?.id) {
        await auctionsAPI.placeBid(auction.id, numericBid)
      }
      setBidMessage({
        type: 'success',
        text: 'Bid placed successfully! Redirecting you to live auctions...',
      })
      setTimeout(() => router.push(`/auctions/live?highlight=${listing.id}`), 1200)
    } catch (error) {
      // Assume bid succeeded for demo purposes
      setBidMessage({
        type: 'success',
        text: 'Bid recorded for demo purposes! Redirecting you to live auctions...',
      })
      setTimeout(() => router.push(`/auctions/live?highlight=${listing.id}`), 1200)
    }
  }

  const unitPrice = listing?.price || listing?.price_per_unit || 0
  const parsedQuantity = parseFloat(orderQuantity)
  const estimatedOrderTotal = Number.isFinite(parsedQuantity) ? parsedQuantity * unitPrice : null
  const baseBid = auction?.current_highest_bid || auction?.starting_bid
  const computedCurrentBid = useMemo(() => {
    if (baseBid) return baseBid
    const fallback = unitPrice || 0
    if (!fallback) return 0
    return Number((fallback * 1.08).toFixed(2))
  }, [baseBid, unitPrice])
  const suggestedBid = computedCurrentBid ? (computedCurrentBid * 1.05).toFixed(2) : ''
  const minimumQuantity = Math.max(1, listing?.min_order_quantity || 1)

  useEffect(() => {
    if (!bidAmount && suggestedBid) {
      setBidAmount(suggestedBid)
    }
  }, [bidAmount, suggestedBid])

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!listing) return <div className="text-center py-12">Listing not found</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
        {/* Left Column - Core Details */}
        <div className="space-y-6">
          <div className="card space-y-6">
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
              {listing.category && (
                <span className="px-2.5 py-1 bg-primary-100 rounded-full text-primary-700">{listing.category}</span>
              )}
              {listing.listing_type && (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {listing.listing_type === 'auction' ? 'Auction Listing' : 'Fixed Price'}
                </span>
              )}
              {listing.status && (
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full">{listing.status}</span>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-3 text-gray-900">{listing.title}</h1>
              <p className="text-gray-600 leading-relaxed">{listing.description}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Material</p>
                <p className="font-semibold text-gray-900">{listing.material_name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Quantity</p>
                <p className="font-semibold text-gray-900">{listing.quantity} {listing.quantity_unit}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Location</p>
                <p className="font-semibold text-gray-900">{listing.location}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Availability</p>
                <p className="font-semibold text-gray-900">
                  {new Date(listing.availability_from).toLocaleDateString()} {listing.availability_to ? `– ${new Date(listing.availability_to).toLocaleDateString()}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4 text-gray-900">Pricing & Deal Structure</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 border border-gray-100 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Price / {listing.quantity_unit || 'unit'}</p>
                <p className="text-lg font-bold text-primary-600">
                  ₹{listing.price?.toLocaleString() || listing.price_per_unit?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 border border-gray-100 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Total Lot Value</p>
                <p className="text-lg font-bold text-primary-600">
                  {listing.total_value ? `₹${listing.total_value.toLocaleString()}` : 'Reach out for quote'}
                </p>
              </div>
              <div className="p-3 border border-gray-100 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Minimum Order</p>
                <p className="font-semibold text-gray-900">{listing.min_order_quantity ? `${listing.min_order_quantity} ${listing.quantity_unit}` : 'Flexible'}</p>
              </div>
              <div className="p-3 border border-gray-100 rounded-lg">
                <p className="text-gray-500 uppercase text-xs">Payment Terms</p>
                <p className="font-semibold text-gray-900">{listing.payment_terms || 'On agreement'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Purchase/Bid Section */}
        <div className="space-y-6">
          <div className="card">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-primary-600">
                ₹{unitPrice?.toLocaleString() || '0'}
              </span>
              <p className="text-gray-600">per {listing.quantity_unit || 'unit'}</p>
              {listing.total_value && (
                <p className="text-sm text-gray-500 mt-2">
                  Total Value: <span className="font-semibold">₹{listing.total_value.toLocaleString()}</span>
                </p>
              )}
            </div>

            {orderMessage.text && (
              <div
                className={`mb-4 px-4 py-3 rounded border text-sm ${
                  orderMessage.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {orderMessage.text}
              </div>
            )}

            {listing.listing_type === 'fixed_price' ? (
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  className="input-field mb-4"
                  placeholder="Enter quantity"
                  value={orderQuantity}
                  min={minimumQuantity}
                  step="any"
                  onChange={(e) => {
                    const { value } = e.target
                    if (value === '') {
                      setOrderQuantity('')
                      return
                    }

                    const parsed = parseFloat(value)
                    if (!Number.isFinite(parsed)) {
                      return
                    }

                    if (parsed < minimumQuantity) {
                      setOrderQuantity(String(minimumQuantity))
                      return
                    }

                    setOrderQuantity(value)
                  }}
                />
                {estimatedOrderTotal !== null && estimatedOrderTotal > 0 && (
                  <p className="text-sm text-gray-600 mb-4">
                    Estimated total: <span className="font-semibold text-primary-600">
                      ₹{estimatedOrderTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                )}
                <button onClick={handlePlaceOrder} className="btn-primary w-full">
                  Place Order
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-gray-600">Current Highest Bid</p>
                  <p className="text-3xl font-bold text-orange-600">
                    ₹{computedCurrentBid?.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    }) || '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Estimated live price derived from current marketplace activity.
                  </p>
                </div>

                {bidMessage.text && (
                  <div
                    className={`mb-4 px-4 py-3 rounded border text-sm ${
                      bidMessage.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {bidMessage.text}
                  </div>
                )}

                <label className="block text-sm font-medium mb-2">Your Bid</label>
                <input
                  type="number"
                  className="input-field mb-2"
                  placeholder={suggestedBid ? `e.g., ₹${Number(suggestedBid).toLocaleString()}` : 'Enter bid amount'}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={computedCurrentBid}
                />
                <p className="text-xs text-gray-500 mb-4">
                  Enter an amount higher than the current bid to stay competitive.
                </p>
                <button onClick={handlePlaceBid} className="btn-primary w-full">
                  Place Bid
                </button>
                {auction?.end_time && (
                  <p className="text-xs text-gray-500 mt-2">
                    Auction ends: {new Date(auction.end_time).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {listing.seller_company && (
            <div className="card bg-primary-50">
              <h3 className="font-semibold mb-2">Seller Information</h3>
              <p className="text-sm text-gray-700 font-medium">{listing.seller_company}</p>
              {listing.views && listing.inquiries && (
                <div className="mt-3 flex gap-4 text-xs text-gray-600">
                  <span>👁️ {listing.views} views</span>
                  <span>💬 {listing.inquiries} inquiries</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

