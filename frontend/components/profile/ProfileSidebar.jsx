'use client'

import React from 'react'

export default function ProfileSidebar({ tabs, activeTab, onTabChange, roleLabel, user }) {
  return (
    <aside className="card bg-white border border-gray-100 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
          {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{user?.username || 'Member'}</p>
          <p className="text-xs uppercase tracking-wide text-primary-600 font-semibold">{roleLabel}</p>
        </div>
      </div>

      <div className="space-y-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm font-medium ${
                isActive
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-primary-200 hover:text-primary-600'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </aside>
  )
}


