'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { listingsAPI, ordersAPI } from '@/lib/api'
import { getMockOrdersForBuyer } from '@/lib/mockOrders'

const ACTIVE_STATUSES = ['pending', 'confirmed', 'in_transit', 'processing']
const COMPLETED_STATUSES = ['completed', 'delivered']
const CANCELLED_STATUSES = ['cancelled', 'rejected', 'failed']

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_transit: 'In Transit',
  processing: 'Processing',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  failed: 'Failed',
}

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-indigo-100 text-indigo-800',
  processing: 'bg-sky-100 text-sky-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-rose-100 text-rose-800',
  failed: 'bg-gray-200 text-gray-700',
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '₹0'
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

const formatStatus = (status) => STATUS_LABELS[status] || status

const renderStatusBadge = (statusRaw) => {
  const status = (statusRaw || '').toLowerCase()
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style}`}>
      {formatStatus(status)}
    </span>
  )
}

export default function OrderHistorySection({ variant = 'page', disableRedirect = false }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [listingDetails, setListingDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const isEmbedded = variant === 'profile'

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      if (!disableRedirect) {
        router.push('/login')
      }
      setLoading(false)
      return
    }

    if (user.role !== 'buyer') {
      setLoading(false)
      return
    }

    loadOrders()
  }, [authLoading, user])

  const normalizeOrder = (order) => ({
    id: order.id,
    listing_id: order.listing_id ?? order.listingId ?? null,
    quantity: order.quantity ?? order.qty ?? 0,
    total_price: order.total_price ?? order.totalPrice ?? 0,
    status: (order.status || 'pending').toLowerCase(),
    created_at: order.created_at ?? order.createdAt ?? new Date().toISOString(),
    updated_at: order.updated_at ?? order.updatedAt ?? null,
    listing_meta: {
      title: order.listingTitle || order.material_name || null,
      unit: order.unit || order.quantity_unit || null,
      pricePerUnit: order.price_per_unit ?? order.pricePerUnit ?? order.price ?? null,
      seller: order.seller_company || null,
      location: order.location || null,
    },
  })

  const loadListingDetails = async (records) => {
    const uniqueListingIds = [
      ...new Set(
        records
          .map((order) => order?.listing_id)
          .filter((id) => id !== null && id !== undefined)
      ),
    ]

    if (uniqueListingIds.length === 0) {
      setListingDetails({})
      return
    }

    const detailsMap = {}
    await Promise.all(
      uniqueListingIds.map(async (listingId) => {
        try {
          const listing = await listingsAPI.getById(listingId)
          if (listing) {
            detailsMap[listingId] = listing
          }
        } catch (err) {
          console.error('Failed to load listing details for', listingId, err)
        }
      })
    )
    setListingDetails(detailsMap)
  }

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ordersAPI.getAll()
      const normalizedOrders = Array.isArray(data) ? data.map(normalizeOrder) : []
      setOrders(normalizedOrders)
      await loadListingDetails(normalizedOrders)
    } catch (err) {
      console.error('Failed to load orders from API:', err)

      const fallbackOrders =
        getMockOrdersForBuyer(user?.email || user?.username)?.map((mockOrder) =>
          normalizeOrder({
            id: mockOrder.id,
            listing_id: mockOrder.listingId,
            quantity: mockOrder.quantity,
            total_price: mockOrder.totalPrice,
            status: 'pending',
            created_at: mockOrder.createdAt,
            listingTitle: mockOrder.listingTitle,
            unit: mockOrder.unit,
            pricePerUnit: mockOrder.pricePerUnit,
          })
        ) || []

      if (fallbackOrders.length > 0) {
        setOrders(fallbackOrders)
        await loadListingDetails(fallbackOrders)
      } else {
        setOrders([])
        setListingDetails({})
        setError('Unable to fetch your orders right now. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    const totalOrders = orders.length
    const activeOrders = orders.filter((order) =>
      ACTIVE_STATUSES.includes((order.status || '').toLowerCase())
    ).length
    const completedOrders = orders.filter((order) =>
      COMPLETED_STATUSES.includes((order.status || '').toLowerCase())
    ).length
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_price || 0), 0)

    return {
      totalOrders,
      activeOrders,
      completedOrders,
      totalSpent,
    }
  }, [orders])

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return sortedOrders

    return sortedOrders.filter((order) => {
      const status = (order.status || '').toLowerCase()
      if (statusFilter === 'active') {
        return ACTIVE_STATUSES.includes(status)
      }
      if (statusFilter === 'completed') {
        return COMPLETED_STATUSES.includes(status)
      }
      if (statusFilter === 'cancelled') {
        return CANCELLED_STATUSES.includes(status)
      }
      return true
    })
  }, [sortedOrders, statusFilter])

  if (authLoading || loading) {
    return (
      <div className={isEmbedded ? 'py-8 text-center text-gray-500' : 'text-center py-16'}>
        Loading orders...
      </div>
    )
  }

  if (!user) {
    return isEmbedded ? null : <div className="text-center py-12">Please sign in to view your orders.</div>
  }

  if (user.role !== 'buyer') {
    if (isEmbedded) {
      return (
        <div className="card bg-blue-50 border border-blue-100">
          <p className="text-sm text-blue-900">
            Order history is only available for buyer accounts.
          </p>
        </div>
      )
    }

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Order History</h1>
        <div className="card bg-blue-50 border border-blue-100">
          <p className="text-blue-900">
            Order history is only available for buyer accounts. Switch to a buyer profile to view your purchase activity.
          </p>
        </div>
      </div>
    )
  }

  const containerClass = isEmbedded
    ? 'space-y-6'
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'

  return (
    <div className={containerClass}>
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${isEmbedded ? '' : 'mb-8'}`}>
        <div>
          <h2 className={`${isEmbedded ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>
            Order History
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Track every purchase you have made on Scraps2Stacks. Orders include real transactions along with demo records created during walkthrough scenarios.
          </p>
        </div>
        <button onClick={loadOrders} className="btn-secondary text-sm px-4 py-2">
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className={`grid md:grid-cols-4 gap-4 ${isEmbedded ? 'mb-6' : 'mb-10'}`}>
        <div className="card bg-primary-50">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-3xl font-bold text-primary-700">{summary.totalOrders}</p>
        </div>
        <div className="card bg-green-50">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-3xl font-bold text-green-700">{summary.completedOrders}</p>
        </div>
        <div className="card bg-yellow-50">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-3xl font-bold text-yellow-700">{summary.activeOrders}</p>
        </div>
        <div className="card bg-blue-50">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(summary.totalSpent)}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2 flex-wrap">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  statusFilter === option.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-secondary-200 hover:border-primary-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {!isEmbedded && (
          <Link href="/listings" className="btn-primary text-sm">
            Browse More Materials →
          </Link>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-2xl mb-2">🧾</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders to show</h3>
          <p className="text-gray-600 mb-6">
            Orders you place will appear here so you can track delivery, payment, and seller updates.
          </p>
          <Link href="/listings" className="btn-primary">
            Explore Listings
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const listing = order.listing_id ? listingDetails[order.listing_id] : null
            const status = (order.status || '').toLowerCase()
            const orderDate = order.created_at ? new Date(order.created_at) : null
            const fallbackMeta = order.listing_meta || {}

            return (
              <div key={order.id} className="card border border-gray-100 hover:border-primary-200 transition">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
                      {renderStatusBadge(status)}
                    </div>
                    {orderDate && (
                      <p className="text-sm text-gray-500">
                        Placed on{' '}
                        {orderDate.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-primary-700">{formatCurrency(order.total_price)}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-dashed pt-4 mt-4">
                  <div>
                    <p className="text-gray-500 uppercase text-xs">Material</p>
                    <p className="font-semibold text-gray-900">
                      {listing?.title || listing?.material_name || fallbackMeta.title || `Listing #${order.listing_id}`}
                    </p>
                    {(listing?.location || fallbackMeta.location) && (
                      <p className="text-gray-500 text-xs mt-1">📍 {listing?.location || fallbackMeta.location}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500 uppercase text-xs">Quantity</p>
                      <p className="font-semibold text-gray-900">
                        {order.quantity}{' '}
                        {listing?.quantity_unit || listing?.unit || fallbackMeta.unit || ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 uppercase text-xs">Unit Price</p>
                      <p className="font-semibold text-gray-900">
                        {listing?.price_per_unit
                          ? formatCurrency(listing.price_per_unit)
                          : listing?.price
                          ? formatCurrency(listing.price)
                          : fallbackMeta.pricePerUnit
                          ? formatCurrency(fallbackMeta.pricePerUnit)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {(listing?.seller_company || fallbackMeta.seller) && (
                      <p>Seller: {listing?.seller_company || fallbackMeta.seller}</p>
                    )}
                    <p>
                      Status updated: {order.updated_at ? new Date(order.updated_at).toLocaleString() : 'Awaiting update'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {order.listing_id && (
                      <Link href={`/listing/${order.listing_id}`} className="btn-secondary text-sm">
                        View Listing
                      </Link>
                    )}
                    {ACTIVE_STATUSES.includes(status) && (
                      <span className="text-xs text-gray-500 self-center">
                        Seller will reach out soon with fulfilment updates.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


