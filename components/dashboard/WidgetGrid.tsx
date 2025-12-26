import { useDashboardStore } from '@/lib/stores/dashboardStore'

/**
 * WidgetGrid component
 * 
 * Placeholder component that displays when widgets exist.
 * This will be replaced with actual widget rendering in the future.
 */
export default function WidgetGrid() {
  const widgets = useDashboardStore((state) => state.widgets)

  return (
    <div className="w-full">
      {/* Placeholder message */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Dashboard Ready
        </h2>
        <p className="text-muted-foreground">
          You have {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'} configured.
          Widget rendering will be implemented next.
        </p>
      </div>

      {/* Grid placeholder - widgets will be rendered here */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="rounded-lg border border-gray-800 bg-gray-900/30 p-4"
          >
            <h3 className="mb-2 text-sm font-medium text-foreground">
              {widget.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              Type: {widget.type}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              ID: {widget.id}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}


