'use client'

import Header from '@/components/dashboard/Header'
import EmptyState from '@/components/dashboard/EmptyState'
import WidgetGrid from '@/components/dashboard/WidgetGrid'
import { useDashboardStore } from '@/lib/stores/dashboardStore'

export default function Dashboard() {
  // Read widget count from store
  const widgetCount = useDashboardStore((state) => state.widgets.length)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <Header />

      {/* Main Dashboard Area */}
      <main className="flex-1">
        {/* Responsive Grid Container - ready for widgets */}
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Grid Layout - will hold widgets when added */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Conditional rendering based on widget count */}
            {widgetCount === 0 ? (
              <div className="col-span-full">
                <EmptyState />
              </div>
            ) : (
              <div className="col-span-full">
                <WidgetGrid />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
