import Header from '@/components/dashboard/Header'
import EmptyState from '@/components/dashboard/EmptyState'

export default function Dashboard() {
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
            {/* Empty State - shown when no widgets exist */}
            <div className="col-span-full">
              <EmptyState />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
