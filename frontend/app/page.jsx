'use client'

import React from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listingsAPI } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const [featuredListings, setFeaturedListings] = useState([])
  const { isAuthenticated, user } = useAuth()
  const isSeller = isAuthenticated && user?.role === 'seller'
  const shouldShowListCta = !isAuthenticated || isSeller
  const listCtaHref = isSeller ? '/dashboard/new-listing' : '/signup'

  const getCategoryEmoji = (category) => {
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

    return emojis[category] || '📦'
  }

  useEffect(() => {
    listingsAPI.getAll({ limit: 6 }).then(setFeaturedListings).catch(console.error)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Turning Industrial Waste into Opportunity
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Connect sellers and buyers in the circular economy marketplace
            </p>
            <div className="flex justify-center space-x-4 flex-wrap gap-3">
              {shouldShowListCta && (
                <Link href={listCtaHref} className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
                  List Waste Material
                </Link>
              )}
              {isAuthenticated && (
                <Link href="/dashboard" className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
                  Go to Dashboard
                </Link>
              )}
              <Link href="/listings" className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
                Browse Materials
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Link
              href={shouldShowListCta ? listCtaHref : '/listings'}
              className="card text-center hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary-600 transition-colors">List Your Waste</h3>
              <p className="text-gray-600">
                Companies can list their waste materials with details, pricing, and availability.
              </p>
            </Link>
            <Link href="/listings" className="card text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🔍</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary-600 transition-colors">Browse & Search</h3>
              <p className="text-gray-600">
                Buyers can search by material type, location, and price to find what they need.
              </p>
            </Link>
            <Link href="/listings" className="card text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💰</div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary-600 transition-colors">Buy or Bid</h3>
              <p className="text-gray-600">
                Purchase at fixed price or bid in real-time auctions for premium materials.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featuredListings.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">Featured Listings</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredListings.map((listing) => {
                const imageUrl = listing.images?.[0] || listing.image_url || null
                const price = listing.price ?? listing.price_per_unit

                return (
                  <Link
                    key={listing.id}
                    href={`/listing/${listing.id}`}
                    className="card hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="aspect-video rounded-lg mb-4 relative overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-100 via-primary-200 to-primary-300 flex items-center justify-center text-6xl">
                          {getCategoryEmoji(listing.category)}
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full shadow ${
                            listing.listing_type === 'auction'
                              ? 'bg-yellow-400 text-yellow-900'
                              : 'bg-green-500 text-white'
                          }`}
                        >
                          {listing.listing_type === 'auction' ? '🎯 Auction' : '💰 Fixed Price'}
                        </span>
                        {listing.category && (
                          <span className="px-3 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full shadow">
                            {listing.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                    <p className="text-gray-600 mb-2">{listing.material_name}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600 font-bold text-lg">
                        ${price?.toLocaleString?.() ?? price ?? '0'}
                      </span>
                      <span className="text-sm text-gray-500">{listing.location}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div className="text-center mt-8">
              <Link href="/listings" className="btn-primary">
                View All Listings
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 text-primary-100">
            Join our marketplace and start trading waste materials today.
          </p>
          <Link href="/signup" className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  )
}

