import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects to login when user is not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });

  test('renders both admin and vendedor flows', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('button', { name: 'Administrador' })).toBeVisible();
    await expect(page.getByPlaceholder('Ingresa tu usuario')).toBeVisible();
    await expect(page.getByPlaceholder('Ingresa tu contraseña')).toBeVisible();

    await page.getByRole('button', { name: 'Vendedor' }).click();
    await expect(page.getByPlaceholder('Ingresa tu DNI')).toBeVisible();
    await expect(page.getByPlaceholder('Ingresa tu contraseña')).toBeVisible();
  });

  test('shows validation errors for empty admin form', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByText('Ingresa tu usuario')).toBeVisible();
    await expect(page.getByText('Ingresa tu contraseña')).toBeVisible();
  });

  test('validates vendedor DNI and password length before hitting API', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByRole('button', { name: 'Vendedor' }).click();
    await page.getByPlaceholder('Ingresa tu DNI').fill('1234');
    await page.getByPlaceholder('Ingresa tu contraseña').fill('123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByText('El DNI debe tener 8 dígitos numéricos')).toBeVisible();
    await expect(page.getByText('Debe tener al menos 6 caracteres')).toBeVisible();
  });
});
