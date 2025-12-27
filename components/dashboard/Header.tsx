'use client'

import { useRef, useState } from 'react'
import { Plus, Download, Upload, LayoutTemplate } from 'lucide-react'
import AddWidgetModal from './AddWidgetModal'
import TemplateModal from './TemplateModal'
import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { exportDashboard, importDashboard } from '@/lib/utils/dashboardExport'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const widgets = useDashboardStore((state) => state.widgets)
  const importWidgets = useDashboardStore((state) => state.importWidgets)

  // Handle export
  const handleExport = () => {
    try {
      exportDashboard(widgets)
    } catch (error) {
      // Show error to user (could be enhanced with toast notification)
      alert('Failed to export dashboard. Please try again.')
    }
  }

  // Handle import file selection
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  // Handle file import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const importedWidgets = await importDashboard(file)
      
      // Confirm before replacing current widgets
      const shouldReplace = window.confirm(
        `Import ${importedWidgets.length} widget(s)? This will replace your current dashboard.`
      )

      if (shouldReplace) {
        importWidgets(importedWidgets)
        alert(`Successfully imported ${importedWidgets.length} widget(s)!`)
      }
    } catch (error) {
      // Show error to user
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to import dashboard'
      alert(`Import failed: ${errorMessage}`)
    } finally {
      // Reset file input to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

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

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Templates Button */}
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Load dashboard template"
                title="Load dashboard template"
              >
                <LayoutTemplate className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Templates</span>
              </button>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={widgets.length === 0}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Export dashboard configuration"
                title="Export dashboard as JSON"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Export</span>
              </button>

              {/* Import Button */}
              <button
                type="button"
                onClick={handleImportClick}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-800 bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Import dashboard configuration"
                title="Import dashboard from JSON file"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Import</span>
              </button>

              {/* Hidden file input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
                aria-label="Import dashboard file"
              />

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
        </div>
      </header>

      {/* Add Widget Modal */}
      <AddWidgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* Template Modal */}
      <TemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />
    </>
  )
}

