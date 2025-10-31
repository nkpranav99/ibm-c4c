'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dashboardAPI, machineryAPI } from '../../lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [machineryStats, setMachineryStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadDashboard()
    }
  }, [user, authLoading])

  const loadDashboard = async () => {
    try {
      let data
      if (user?.role === 'seller') {
        data = await dashboardAPI.getSeller()
      } else {
        data = await dashboardAPI.getBuyer()
      }
      setStats(data)
      // Extract analytics from the response if available
      if (data?.analytics) {
        setAnalytics(data.analytics)
      }
      
      // Load machinery stats
      const machineryData = await machineryAPI.getStats()
      setMachineryStats(machineryData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <div className="text-center py-12">Loading...</div>
  if (!user) return null

  // Use analytics data if available, otherwise fallback to stats
  const summaryMetrics = analytics?.summary_metrics || {}
  const listings = analytics?.listings || []
  const orders = analytics?.orders || []
  const popularMaterials = analytics?.popular_materials || []
  const environmentalImpact = analytics?.environmental_impact || {}

  const totalRevenue = summaryMetrics.total_revenue_inr ?? stats?.total_sales ?? 0
  const activeOrdersCount = (orders.length > 0
    ? orders.filter((order) => ['pending', 'in_transit', 'confirmed', 'processing'].includes((order.status || '').toLowerCase())).length
    : stats?.pending_orders ?? 0)
  const activeBidsCount = summaryMetrics.active_auctions ?? stats?.active_auctions ?? 0
  const avgListingValue = summaryMetrics.avg_listing_value_inr ?? 0
  const conversionRate = summaryMetrics.conversion_rate_percentage ?? null
  const avgDaysToSell = summaryMetrics.avg_days_to_sell ?? null
  const repeatBuyerRate = summaryMetrics.repeat_buyer_rate_percentage ?? null

  const buyerActiveOrders = (orders.length > 0
    ? orders.filter((order) => ['pending', 'in_transit', 'confirmed', 'processing'].includes((order.status || '').toLowerCase())).length
    : stats?.pending_orders ?? stats?.active_orders ?? 0)
  const buyerActiveBids = stats?.active_bids ?? activeBidsCount

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {user.role === 'seller' ? (
        <div>
          {/* Summary Metrics */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-primary-50">
              <p className="text-sm text-gray-600 mb-1">Total Listings</p>
              <p className="text-3xl font-bold text-primary-600">{summaryMetrics.total_listings || stats?.total_listings || 0}</p>
            </div>
            <div className="card bg-green-50">
              <p className="text-sm text-gray-600 mb-1">Active Listings</p>
              <p className="text-3xl font-bold text-green-600">{summaryMetrics.active_listings || stats?.active_listings || 0}</p>
            </div>
            <div className="card bg-blue-50">
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-600">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <Link
              href="/listings?focus=orders"
              className="card bg-yellow-50 hover:shadow-lg transition-shadow"
            >
              <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                <span>Active Orders</span>
                <span className="text-xs text-yellow-700">View listings →</span>
              </p>
              <p className="text-3xl font-bold text-yellow-600">{activeOrdersCount}</p>
            </Link>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Link
              href="/listings?focus=bids"
              className="card bg-purple-50 hover:shadow-lg transition-shadow"
            >
              <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                <span>Active Bids</span>
                <span className="text-xs text-purple-700">Track auctions →</span>
              </p>
              <p className="text-3xl font-bold text-purple-600">{activeBidsCount}</p>
            </Link>
            <div className="card bg-indigo-50">
              <p className="text-sm text-gray-600 mb-1">Avg Listing Value</p>
              <p className="text-3xl font-bold text-indigo-600">₹{avgListingValue.toLocaleString()}</p>
            </div>
            <div className="card bg-teal-50">
              <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-teal-600">{conversionRate !== null ? `${conversionRate.toFixed(1)}%` : '—'}</p>
            </div>
            <div className="card bg-rose-50">
              <p className="text-sm text-gray-600 mb-1">Avg Days to Sell</p>
              <p className="text-3xl font-bold text-rose-600">{avgDaysToSell !== null ? avgDaysToSell : '—'}</p>
            </div>
          </div>

          {repeatBuyerRate !== null && (
            <div className="card mb-8 bg-sky-50 border border-sky-100">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-sky-900">Customer Loyalty Snapshot</h2>
                  <p className="text-sm text-sky-700">Monitor how repeat buyers respond to your marketplace presence.</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-sky-600">Repeat Buyer Rate</p>
                    <p className="text-3xl font-bold text-sky-900">{repeatBuyerRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-sky-600">Active Listings</p>
                    <p className="text-3xl font-bold text-sky-900">{summaryMetrics.active_listings || stats?.active_listings || 0}</p>
                  </div>
                  <Link
                    href="/listings"
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-sky-800 bg-white border border-sky-200 rounded-lg hover:bg-sky-100 transition"
                  >
                    Refresh Listings →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Recent Listings from Master Data */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Listings</h2>
            <div className="space-y-3">
              {(listings.length > 0 ? listings.slice(0, 5) : stats?.recent_listings || []).map((listing) => (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block p-3 hover:bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{listing.title || listing.material_name}</span>
                      {listing.category && <span className="text-xs text-gray-500 ml-2">({listing.category})</span>}
                      <p className="text-sm text-gray-600">{listing.location} • ₹{listing.total_value?.toLocaleString() || listing.price}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      listing.status === 'active' ? 'bg-primary-100 text-primary-800' : 
                      listing.status === 'sold' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Orders from Master Data */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {(orders.length > 0 ? orders.slice(0, 5) : stats?.recent_orders || []).map((order) => (
                <div key={order.id || order.order_id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Order #{order.id || order.order_id}</p>
                      <p className="text-sm text-gray-600">
                        {order.material_name || order.material} • Quantity: {order.quantity} {order.unit || ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">₹{(order.total_price || order.total_amount || 0).toLocaleString()}</p>
                      <p className={`text-xs px-2 py-1 rounded inline-block ${
                        order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' || order.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Machinery Stats */}
          {machineryStats && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">🔧 Machinery & Equipment</h2>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Total Machinery</p>
                  <p className="text-2xl font-bold text-purple-600">{machineryStats.total_machinery || 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Shutdown Companies</p>
                  <p className="text-2xl font-bold text-orange-600">{machineryStats.shutdown_companies || 0}</p>
                </div>
                <div className="p-3 bg-red-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Urgent Deals</p>
                  <p className="text-2xl font-bold text-red-600">{machineryStats.urgent_deals_count || 0}</p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm text-gray-600 mb-1">Avg Discount</p>
                  <p className="text-2xl font-bold text-green-600">{machineryStats.average_discount_percentage || 0}%</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>💰 Bundled Packages: 3 complete setups available</p>
                <p>⚡ Total Value: ₹{(machineryStats.total_estimated_value_inr / 10000000).toFixed(1)} Cr</p>
              </div>
            </div>
          )}

          {/* Popular Materials */}
          {popularMaterials.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Popular Materials</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {popularMaterials.slice(0, 6).map((material, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <p className="font-medium">{material.material}</p>
                    <p className="text-sm text-gray-600">{material.category}</p>
                    <p className="text-sm text-primary-600 mt-1">
                      {material.total_listings} listings • ₹{material.avg_price}/{material.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environmental Impact */}
          {environmentalImpact && Object.keys(environmentalImpact).length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Environmental Impact</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded">
                  <p className="text-2xl font-bold text-green-600">{environmentalImpact.total_waste_diverted_tons?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-600">Tons Diverted</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">{environmentalImpact.co2_emissions_saved_tons?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-600">CO₂ Saved (tons)</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <p className="text-2xl font-bold text-purple-600">{environmentalImpact.materials_recycled_percentage?.toFixed(1) || 0}%</p>
                  <p className="text-sm text-gray-600">Recycled</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Buyer Dashboard Metrics */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link
              href="/listings?focus=orders"
              className="card bg-primary-50 hover:shadow-lg transition-shadow"
            >
              <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                <span>Active Orders</span>
                <span className="text-xs text-primary-700">Review listings →</span>
              </p>
              <p className="text-3xl font-bold text-primary-600">{buyerActiveOrders}</p>
            </Link>
            <Link
              href="/listings?focus=bids"
              className="card bg-yellow-50 hover:shadow-lg transition-shadow"
            >
              <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                <span>Active Bids</span>
                <span className="text-xs text-yellow-700">Track auctions →</span>
              </p>
              <p className="text-3xl font-bold text-yellow-600">{buyerActiveBids}</p>
            </Link>
          </div>

          {/* Recent Orders from Master Data */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {(orders.length > 0 ? orders.slice(0, 5) : stats?.recent_orders || []).map((order) => (
                <div key={order.id || order.order_id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Order #{order.id || order.order_id}</p>
                      <p className="text-sm text-gray-600">
                        {order.material_name || order.material} • Quantity: {order.quantity} {order.unit || ''}
                      </p>
                      {order.seller_company && <p className="text-xs text-gray-500">Seller: {order.seller_company}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">₹{(order.total_price || order.total_amount || 0).toLocaleString()}</p>
                      <p className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                        order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' || order.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Bids */}
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Bids</h2>
            <div className="space-y-3">
              {(stats?.recent_bids || []).map((bid) => (
                <div key={bid.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Bid #{bid.id}</p>
                      <p className="text-sm text-gray-600">Amount: ₹{bid.amount?.toLocaleString()}</p>
                    </div>
                    {bid.is_winning && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Winning
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Materials for Buyers */}
          {popularMaterials.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Trending Materials</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {popularMaterials.slice(0, 6).map((material, idx) => (
                  <div key={idx} className="p-3 border rounded">
                    <p className="font-medium">{material.material}</p>
                    <p className="text-sm text-gray-600">{material.category}</p>
                    <p className="text-sm text-primary-600 mt-1">
                      {material.total_listings} listings • ₹{material.avg_price}/{material.unit}
                    </p>
                    {material.growth_percentage && (
                      <p className={`text-xs mt-1 ${material.growth_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {material.growth_percentage > 0 ? '↑' : '↓'} {Math.abs(material.growth_percentage).toFixed(1)}% growth
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Auctions */}
          {analytics?.active_auctions && analytics.active_auctions.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Active Auctions</h2>
              <div className="space-y-3">
                {analytics.active_auctions.slice(0, 5).map((auction) => (
                  <div key={auction.auction_id} className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Auction #{auction.auction_id}</p>
                        <p className="text-sm text-gray-600">
                          Current Bid: ₹{auction.current_highest_bid?.toLocaleString() || auction.starting_bid?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{auction.total_bids || 0} bids</p>
                        {auction.end_time && <p className="text-xs text-gray-500">Ends: {new Date(auction.end_time).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
