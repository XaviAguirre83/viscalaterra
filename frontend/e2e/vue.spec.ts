import { test, expect } from '@playwright/test'

test('la pàgina principal carrega correctament', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/viscalaterra/i)
})
