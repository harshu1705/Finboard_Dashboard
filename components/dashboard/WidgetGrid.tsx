'use client'

import { useDashboardStore } from '@/lib/stores/dashboardStore'
import WidgetRenderer from './WidgetRenderer'

/**
 * WidgetGrid component
 * 
 * Displays widgets in a responsive grid layout.
 * Uses WidgetRenderer to dynamically render widgets based on their type.
 */
export default function WidgetGrid() {
  const widgets = useDashboardStore((state) => state.widgets)

  if (widgets.length === 0) {
    return null // EmptyState is handled by parent component
  }

  return (
    <div className="w-full">
      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {widgets.map((widget) => (
          <div key={widget.id} className="min-w-0">
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </div>
    </div>
  )
}


