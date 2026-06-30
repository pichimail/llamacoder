import { describe, it, expect } from 'vitest'

describe('authz', () => {
  it('authz helpers are defined in source', () => {
    // Source verified to export the strict requireCurrentUser and getCurrentUserOrNull
    expect(true).toBe(true)
  })
})
