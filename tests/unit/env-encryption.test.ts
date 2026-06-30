import { describe, it, expect } from 'vitest'

describe('env encryption', () => {
  it('env encryption module loads (crypto tested at runtime)', async () => {
    const mod = await import('../../lib/env-encryption')
    expect(typeof mod.encryptEnvValue).toBe('function')
    expect(typeof mod.decryptEnvValue).toBe('function')
    expect(typeof mod.maskEnvValue).toBe('function')
  })
})
