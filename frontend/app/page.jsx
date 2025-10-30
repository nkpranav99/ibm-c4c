'use client'

import React from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { listingsAPI } from '../lib/api'

export default function Home() {
  const [featuredListings, setFeaturedListings] = useState([])

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
            <div className="flex justify-center space-x-4">
              <Link href="/signup" className="btn-primary bg-white text-primary-600 hover:bg-primary-50">
                List Waste Material
              </Link>
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
            <Link href="/signup" className="card text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
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
              {featuredListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-primary-100 rounded-lg mb-4"></div>
                  <h3 className="text-xl font-semibold mb-2">{listing.title}</h3>
                  <p className="text-gray-600 mb-2">{listing.material_name}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-primary-600 font-bold text-lg">${listing.price}</span>
                    <span className="text-sm text-gray-500">{listing.location}</span>
                  </div>
                </Link>
              ))}
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

