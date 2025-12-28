/**
 * Dashboard Export/Import Utilities
 * 
 * Functions for exporting and importing dashboard widget configurations.
 * All operations are frontend-only and work with JSON files.
 */

import type { Widget } from '@/lib/types/widget'

/**
 * Export dashboard configuration as JSON file
 * 
 * @param widgets - Array of widgets to export
 * @param filename - Optional filename (default: 'dashboard-config.json')
 */
export function exportDashboard(
  widgets: Widget[],
  filename: string = 'dashboard-config.json'
): void {
  try {
    // Create export object with metadata
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      widgetCount: widgets.length,
      widgets,
    }

    // Convert to JSON string with formatting
    const jsonString = JSON.stringify(exportData, null, 2)

    // Create blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw new Error('Failed to export dashboard configuration')
  }
}

/**
 * Import dashboard configuration from JSON file
 * 
 * @param file - File object containing JSON data
 * @returns Promise that resolves to array of validated widgets
 * @throws Error if file is invalid or cannot be parsed
 */
export async function importDashboard(file: File): Promise<Widget[]> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      reject(new Error('Invalid file type. Please select a JSON file.'))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text) {
          reject(new Error('File is empty'))
          return
        }

        // Parse JSON
        const parsed = JSON.parse(text) as unknown

        // Validate structure
        if (!parsed || typeof parsed !== 'object') {
          reject(new Error('Invalid JSON structure'))
          return
        }

        const data = parsed as Record<string, unknown>

        // Extract widgets array
        let widgets: unknown[] = []

        // Support both direct widget array and wrapped format
        if (Array.isArray(data.widgets)) {
          widgets = data.widgets
        } else if (Array.isArray(data)) {
          // If the JSON is directly an array of widgets
          widgets = data
        } else {
          reject(
            new Error(
              'Invalid format. Expected widget array or object with widgets property.'
            )
          )
          return
        }

        // Validate each widget
        const validWidgets = widgets.filter(isValidWidget) as Widget[]

        if (validWidgets.length === 0) {
          reject(new Error('No valid widgets found in file'))
          return
        }

        resolve(validWidgets)
      } catch (error) {
        if (error instanceof SyntaxError) {
          reject(new Error('Invalid JSON format. Please check the file.'))
        } else if (error instanceof Error) {
          reject(error)
        } else {
          reject(new Error('Failed to import dashboard configuration'))
        }
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Validates that an object is a valid Widget
 * Used for filtering invalid widgets during import
 */
function isValidWidget(widget: unknown): widget is Widget {
  if (!widget || typeof widget !== 'object') return false

  const w = widget as Record<string, unknown>

  // Check required fields
  if (typeof w.id !== 'string' || !w.id) return false
  if (typeof w.type !== 'string') return false
  if (typeof w.title !== 'string') return false
  if (!w.config || typeof w.config !== 'object') return false
  if (typeof w.createdAt !== 'number') return false
  if (typeof w.updatedAt !== 'number') return false

  return true
}














