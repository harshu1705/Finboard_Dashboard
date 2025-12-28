import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Header from '../Header'

describe('Header integration - open modals via events', () => {
  it('opens the Template modal when open-template-modal is dispatched', () => {
    render(<Header />)

    // Dispatch the event that EmptyState would fire
    window.dispatchEvent(new CustomEvent('open-template-modal'))

    expect(screen.getByRole('dialog', { name: /dashboard templates/i })).toBeInTheDocument()
  })

  it('opens the Import modal when open-import-modal is dispatched', () => {
    render(<Header />)

    window.dispatchEvent(new CustomEvent('open-import-modal'))

    expect(screen.getByRole('dialog', { name: /import dashboard/i })).toBeInTheDocument()
  })
})
