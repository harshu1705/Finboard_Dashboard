'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AddWidgetModal from './AddWidgetModal'

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <header className="w-full border-b border-gray-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Title Section */}
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                Finance Dashboard
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Connect APIs and build your custom dashboard
              </p>
            </div>

            {/* Add Widget Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isModalOpen}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background active:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add widget to dashboard"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add Widget</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Add Widget Modal */}
      <AddWidgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

