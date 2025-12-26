import { LayoutGrid, Plus } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Empty State Card */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center shadow-lg">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <LayoutGrid className="h-8 w-8 text-accent" aria-hidden="true" />
          </div>

          {/* Title */}
          <h2 className="mb-3 text-2xl font-semibold text-foreground">
            No widgets yet
          </h2>

          {/* Description */}
          <p className="mb-6 text-muted-foreground">
            Get started by adding your first widget. Connect to finance APIs and
            build a custom dashboard tailored to your needs.
          </p>

          {/* Instructions */}
          <div className="mx-auto mb-8 max-w-md rounded-lg border border-gray-800 bg-gray-950/50 p-6 text-left">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
              <Plus className="h-4 w-4 text-accent" aria-hidden="true" />
              How to add widgets
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  1
                </span>
                <span>Click the &quot;Add Widget&quot; button in the header</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  2
                </span>
                <span>Select a widget type from the available options</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  3
                </span>
                <span>Configure the widget with your API credentials</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  4
                </span>
                <span>Your widget will appear on the dashboard</span>
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background active:bg-accent/80"
            aria-label="Add your first widget"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Your First Widget
          </button>
        </div>
      </div>
    </div>
  )
}


