import { test, expect } from '@playwright/test';

test.describe('Clientes Management', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/clientes');

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });
});
