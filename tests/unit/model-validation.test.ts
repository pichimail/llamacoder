import { describe, it, expect } from 'vitest'
import { assertValidModel, getDefaultAvailableModel, isModelAvailable } from '../../lib/constants'

describe('model validation', () => {
  it('asserts valid known model', () => {
    expect(() => assertValidModel('zai-org/GLM-5.1')).not.toThrow()
  })
  it('rejects unknown model', () => {
    // In current model list without openrouter key some may pass format; enforce throw on pure garbage
    const bad = 'evil/fake-model-9000'
    let threw = false
    try { assertValidModel(bad) } catch { threw = true }
    expect(threw).toBe(true)
  })
  it('provides default available model', () => {
    const d = getDefaultAvailableModel()
    expect(typeof d).toBe('string')
    expect(d.length).toBeGreaterThan(3)
  })
  it('availability check is boolean', () => {
    expect(typeof isModelAvailable('zai-org/GLM-5.1')).toBe('boolean')
  })
})
