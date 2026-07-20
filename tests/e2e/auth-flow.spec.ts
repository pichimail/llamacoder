import { test, expect } from '@playwright/test'

test('homepage composer renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Build apps with an agent you can actually inspect\./i })).toBeVisible()
})

test('unauth create-chat would 401 (api test)', async ({ request }) => {
  const res = await request.post('/api/create-chat', { data: { prompt: 'x', model: 'zai-org/GLM-5.1' } })
  expect([401, 403]).toContain(res.status())
})
