'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listingsAPI } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'

const categories = [
  'Agricultural/Biomass',
  'Industrial Ash',
  'Plastic Waste',
  'Metal Scrap',
  'Paper & Cardboard',
  'Construction & Demolition',
  'Glass',
  'Textile Waste',
  'Rubber & Tires',
  'Organic/Food Waste',
]

const saleTypes = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'auction', label: 'Auction' },
]

const defaultFormState = {
  title: '',
  material_name: '',
  category: categories[0],
  quantity: '',
  unit: 'tons',
  price_per_unit: '',
  sale_type: 'fixed_price',
  location: '',
  description: '',
  images: '',
}

export default function NewListingPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState(defaultFormState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace('/login')
      } else if (user?.role !== 'seller') {
        router.replace('/listings')
      }
    }
  }, [authLoading, isAuthenticated, router, user])

  const estimatedTotalValue = useMemo(() => {
    const quantity = parseFloat(formData.quantity)
    const price = parseFloat(formData.price_per_unit)
    if (Number.isFinite(quantity) && Number.isFinite(price)) {
      return (quantity * price).toFixed(2)
    }
    return null
  }, [formData.price_per_unit, formData.quantity])

  if (authLoading || !isAuthenticated || user?.role !== 'seller') {
    return <div className="text-center py-12">Loading...</div>
  }

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        title: formData.title.trim() || `${formData.material_name} Listing`,
        material_name: formData.material_name.trim(),
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit.trim() || 'tons',
        price_per_unit: parseFloat(formData.price_per_unit),
        sale_type: formData.sale_type,
        location: formData.location.trim(),
        description: formData.description.trim() || undefined,
        seller_company: user?.company_name || user?.username,
        images: formData.images
          .split(/\r?\n|,/)
          .map((url) => url.trim())
          .filter((url) => url.length > 0),
      }

      if (!payload.material_name || !payload.location || Number.isNaN(payload.quantity) || Number.isNaN(payload.price_per_unit)) {
        throw new Error('Please fill in all required fields and ensure numbers are valid.')
      }

      const createdListing = await listingsAPI.create(payload)

      setSuccess('Listing created successfully! Redirecting to preview...')
      setTimeout(() => {
        router.push(`/listing/${createdListing.id}`)
      }, 1200)
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to create listing. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">List a New Waste Material</h1>
          <p className="mt-2 text-gray-600">
            Share material details with potential buyers. Listings appear instantly across the marketplace once submitted.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Material Name</label>
              <input
                type="text"
                required
                className="input-field mt-1"
                value={formData.material_name}
                onChange={handleChange('material_name')}
                placeholder="e.g., Cardboard Bales"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Listing Title</label>
              <input
                type="text"
                className="input-field mt-1"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="Premium quality cardboard bales"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select className="input-field mt-1" value={formData.category} onChange={handleChange('category')}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="input-field mt-1"
                value={formData.quantity}
                onChange={handleChange('quantity')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                className="input-field mt-1"
                value={formData.unit}
                onChange={handleChange('unit')}
                placeholder="tons, kg, etc."
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="input-field mt-1"
                value={formData.price_per_unit}
                onChange={handleChange('price_per_unit')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sale Type</label>
              <select className="input-field mt-1" value={formData.sale_type} onChange={handleChange('sale_type')}>
                {saleTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                required
                className="input-field mt-1"
                value={formData.location}
                onChange={handleChange('location')}
                placeholder="City or Region"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="input-field mt-1"
              rows={4}
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Add any relevant material details or quality information."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Image URLs (optional)</label>
            <textarea
              className="input-field mt-1"
              rows={3}
              value={formData.images}
              onChange={handleChange('images')}
              placeholder="Paste one URL per line or separate with commas"
            />
            <p className="mt-1 text-xs text-gray-500">Images help buyers better understand the material you are offering.</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">Seller</p>
              <p className="font-medium text-gray-900">{user?.company_name || user?.username}</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <p className="text-sm text-gray-600">Estimated Total Value</p>
              <p className="font-semibold text-primary-600 text-lg">
                {estimatedTotalValue ? `₹${Number(estimatedTotalValue).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFormData(defaultFormState)
                setError('')
                setSuccess('')
              }}
              disabled={submitting}
            >
              Clear
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


