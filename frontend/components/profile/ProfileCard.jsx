'use client'

import React from 'react'

export default function ProfileCard({
  title,
  value,
  description,
  icon,
  accent = 'primary',
}) {
  const accentStyles = {
    primary: 'bg-primary-50 border-primary-100 text-primary-800',
    green: 'bg-green-50 border-green-100 text-green-800',
    blue: 'bg-blue-50 border-blue-100 text-blue-800',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-800',
    gray: 'bg-gray-50 border-gray-100 text-gray-800',
  }

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${accentStyles[accent] || accentStyles.primary}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
    </div>
  )
}


