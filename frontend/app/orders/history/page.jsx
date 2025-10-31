'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import { ordersAPI } from '../../../lib/api'

const statusBadgeClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    console.warn('Failed to format date', value, error)
    return value
  }
}

const OrderCard = ({ order, variant }) => {
  const statusKey = (order.status || '').toLowerCase()
  const badgeClass = statusBadgeClasses[statusKey] || 'bg-gray-100 text-gray-800'

  return (
    <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="text-lg font-semibold text-gray-900">Order #{order.id}</p>
            <span className={`px-2 py-1 text-xs font-medium rounded ${badgeClass}`}>
              {(order.status || 'unknown').toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              Listing:&nbsp;
              <Link href={`/listing/${order.listing_id}`} className="text-primary-600 hover:underline">
                #{order.listing_id}
              </Link>
            </p>
            <p>
              Quantity: <span className="font-medium text-gray-800">{order.quantity}</span>
            </p>
            <p>
              Total Price: <span className="font-medium text-gray-800">₹{Number(order.total_price || 0).toLocaleString('en-IN')}</span>
            </p>
            {order.buyer_notes && (
              <p className="text-gray-700">
                Buyer Notes: <span className="italic">{order.buyer_notes}</span>
              </p>
            )}
            {variant === 'seller' && (
              <p>
                Buyer ID: <span className="font-medium text-gray-800">{order.buyer_id}</span>
              </p>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500 text-right min-w-[140px]">
          <p>Created</p>
          <p className="font-medium text-gray-800">{formatDate(order.created_at)}</p>
          {order.updated_at && (
            <p className="mt-1">
              Updated <span className="font-medium text-gray-800">{formatDate(order.updated_at)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OrdersHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buyerOrders, setBuyerOrders] = useState([])
  const [sellerOrders, setSellerOrders] = useState([])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    let active = true

    const loadOrders = async () => {
      setLoading(true)
      setError(null)

      try {
        const fetches = []

        if (['buyer', 'admin'].includes(user.role)) {
          fetches.push(
            ordersAPI
              .getAll()
              .then((data) => ({ key: 'buyer', data }))
              .catch((err) => {
                console.error('Failed to fetch buyer orders', err)
                throw err
              })
          )
        }

        if (['seller', 'admin'].includes(user.role)) {
          fetches.push(
            ordersAPI
              .getMyOrders()
              .then((data) => ({ key: 'seller', data }))
              .catch((err) => {
                console.error('Failed to fetch seller orders', err)
                throw err
              })
          )
        }

        const results = await Promise.all(fetches.length ? fetches : [Promise.resolve({ key: 'buyer', data: [] })])

        if (!active) return

        results.forEach(({ key, data }) => {
          const normalizedData = Array.isArray(data) ? data : []
          if (key === 'buyer') setBuyerOrders(normalizedData)
          if (key === 'seller') setSellerOrders(normalizedData)
        })
      } catch (err) {
        if (!active) return

        const message = err?.response?.data?.detail || err?.message || 'Failed to load orders'
        setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOrders()

    return () => {
      active = false
    }
  }, [user, authLoading, router])

  const isBuyerViewEnabled = useMemo(() => ['buyer', 'admin'].includes(user?.role), [user?.role])
  const isSellerViewEnabled = useMemo(() => ['seller', 'admin'].includes(user?.role), [user?.role])

  if (authLoading || loading) {
    return <div className="text-center py-12">Loading orders...</div>
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders History</h1>
          <p className="text-gray-600 mt-1">
            Review completed and in-progress orders. Switch to dashboard for real-time highlights.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-100 rounded-lg hover:bg-primary-100 transition"
        >
          ← Back to dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <p className="font-semibold">Something went wrong</p>
          <p>{error}</p>
        </div>
      )}

      {isBuyerViewEnabled && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Orders you placed</h2>
            <span className="text-sm text-gray-500">{buyerOrders.length} total</span>
          </div>

          {buyerOrders.length === 0 ? (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-600">
              You haven&apos;t placed any orders yet. Browse the marketplace to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {buyerOrders.map((order) => (
                <OrderCard key={`buyer-${order.id}`} order={order} variant="buyer" />
              ))}
            </div>
          )}
        </section>
      )}

      {isSellerViewEnabled && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Orders for your listings</h2>
            <span className="text-sm text-gray-500">{sellerOrders.length} total</span>
          </div>

          {sellerOrders.length === 0 ? (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-600">
              No orders have been placed on your listings yet. Promote your listings to reach more buyers.
            </div>
          ) : (
            <div className="grid gap-4">
              {sellerOrders.map((order) => (
                <OrderCard key={`seller-${order.id}`} order={order} variant="seller" />
              ))}
            </div>
          )}
        </section>
      )}

      {!isBuyerViewEnabled && !isSellerViewEnabled && (
        <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-600">
          Orders history is currently available for buyer and seller roles only.
        </div>
      )}
    </div>
  )
}


