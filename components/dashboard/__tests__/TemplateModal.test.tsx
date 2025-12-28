import { useDashboardStore } from '@/lib/stores/dashboardStore'
import { act } from 'react-dom/test-utils'

describe('TemplateModal - Save and Load', () => {
  it('allows saving current layout as a template and loading it', () => {
    // Reset store
    const store = useDashboardStore.getState()
    act(() => {
      store.clearWidgets()
      store.importWidgets([])
      store['templates'] = [] as any
    })

    // Add a widget to the dashboard
    act(() => {
      store.addWidget({ type: 'price-card', title: 'Test', description: 'desc', config: { symbol: 'AAPL' } })
    })

    // Save template
    act(() => {
      store.saveTemplate('My Template', 'A short description')
    })

    const templates = useDashboardStore.getState().templates
    expect(templates.length).toBe(1)
    expect(templates[0].name).toBe('My Template')

    // Load template and ensure widgets replaced
    act(() => {
      useDashboardStore.getState().loadTemplate(templates[0].id)
    })

    const widgets = useDashboardStore.getState().widgets
    expect(widgets.length).toBe(templates[0].widgets.length)
  })
})