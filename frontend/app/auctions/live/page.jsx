'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { auctionsAPI } from '../../../lib/api'

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

const getTimeRemaining = (endTime) => {
  if (!endTime) return 'Time unavailable'
  const end = new Date(endTime)
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()

  if (Number.isNaN(diffMs)) return 'Time unavailable'
  if (diffMs <= 0) return 'Auction closed'

  const diffMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(diffMinutes / (60 * 24))
  const hours = Math.floor((diffMinutes % (60 * 24)) / 60)
  const minutes = diffMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const AuctionCard = ({ auction, isHighlighted }) => {
  const timeRemaining = getTimeRemaining(auction.end_time)
  const progress = (() => {
    const start = Number(auction.starting_bid) || 0
    const current = Number(auction.current_highest_bid) || start
    if (!start) return 0
    const target = auction.buy_now_price ? Number(auction.buy_now_price) : start * 1.4
    const value = Math.min(1, Math.max(0, (current - start) / (target - start)))
    return Math.round(value * 100)
  })()

  return (
    <div
      id={`auction-${auction.listing_id}`}
      className={[
        'relative rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow',
        'hover:shadow-lg',
        isHighlighted ? 'ring-2 ring-primary-500 ring-offset-2' : '',
      ].join(' ')}
    >
      {auction.featured && (
        <div className="absolute left-4 top-4 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Featured lot
        </div>
      )}

      <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Lot #{auction.id}</p>
              <h2 className="text-xl font-semibold text-gray-900">{auction.listing_title || auction.material_name}</h2>
              {auction.material_name && (
                <p className="text-sm text-gray-600">{auction.material_name} • {auction.category}</p>
              )}
            </div>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">{timeRemaining}</span>
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Current highest bid</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(auction.current_highest_bid || auction.starting_bid)}</p>
              <p className="text-xs text-gray-500">Starting bid {formatCurrency(auction.starting_bid)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bid activity</p>
              <p className="text-lg font-bold text-gray-900">{auction.bid_count || 0} bids</p>
              <p className="text-xs text-gray-500">Watchers {auction.watchers || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lot size</p>
              <p className="text-lg font-bold text-gray-900">
                {auction.quantity} {auction.quantity_unit}
              </p>
              <p className="text-xs text-gray-500">Location: {auction.location}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Progress toward reserve</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-primary-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-between rounded-lg bg-primary-50 p-5 lg:w-60">
          <div>
            <p className="text-sm font-semibold text-primary-900">Selling company</p>
            <p className="text-sm text-primary-700">{auction.seller_company || 'Marketplace Seller'}</p>
            {auction.seller_contact && (
              <p className="mt-1 text-xs text-primary-600">{auction.seller_contact}</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/listing/${auction.listing_id}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              View listing details
            </Link>
            {auction.buy_now_price && (
              <div className="rounded-lg border border-primary-200 bg-white px-3 py-2 text-center text-xs text-primary-700">
                Buy-now guidance {formatCurrency(auction.buy_now_price)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LiveAuctionsPage() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const searchParams = useSearchParams()
  const highlightParam = searchParams?.get('highlight')

  useEffect(() => {
    let mounted = true

    const loadAuctions = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await auctionsAPI.getActive()
        if (!mounted) return
        setAuctions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!mounted) return
        const message = err?.response?.data?.detail || err?.message || 'Failed to load auctions'
        setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadAuctions()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!highlightParam) return
    const targetId = `auction-${highlightParam}`
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightParam, auctions])

  const metrics = useMemo(() => {
    if (!Array.isArray(auctions) || auctions.length === 0) {
      return {
        total: 0,
        totalValue: 0,
        avgBids: 0,
        closingSoon: 0,
      }
    }

    const total = auctions.length
    const totalValue = auctions.reduce(
      (sum, auction) => sum + Number(auction.current_highest_bid || auction.starting_bid || 0),
      0
    )
    const avgBids = auctions.reduce((sum, auction) => sum + Number(auction.bid_count || 0), 0) / total
    const closingSoon = auctions.filter((auction) => {
      const time = auction.end_time ? new Date(auction.end_time).getTime() - Date.now() : 0
      return time > 0 && time <= 1000 * 60 * 60 * 4
    }).length

    return {
      total,
      totalValue,
      avgBids: Number.isFinite(avgBids) ? avgBids : 0,
      closingSoon,
    }
  }, [auctions])

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading live auctions…</div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Auctions</h1>
          <p className="text-gray-600">
            Track real-time bidding activity across the waste materials marketplace. Listings update as bids arrive.
          </p>
        </div>
        <Link
          href="/listings?focus=bids"
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Browse all auction listings
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Unable to load auctions</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active lots</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Value on the block</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Average bids</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.avgBids.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Closing within 4h</p>
          <p className="text-2xl font-bold text-gray-900">{metrics.closingSoon}</p>
        </div>
      </div>

      {Array.isArray(auctions) && auctions.length > 0 ? (
        <div className="grid gap-6">
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isHighlighted={highlightParam && String(auction.listing_id) === String(highlightParam)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <h2 className="text-xl font-semibold text-gray-800">No active auctions right now</h2>
          <p className="mt-2 text-sm text-gray-600">
            Check back soon or explore marketplace listings to schedule the next auction lot.
          </p>
          <Link
            href="/listings"
            className="mt-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            Explore listings
          </Link>
        </div>
      )}
    </div>
  )
}

