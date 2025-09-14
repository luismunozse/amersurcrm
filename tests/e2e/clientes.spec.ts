import { test, expect } from '@playwright/test';

test.describe('Clientes Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - in real tests you'd set up proper auth
    await page.goto('/auth/login');
    // Add your authentication setup here
  });

  test('should display clientes list', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Clientes');
    
    // Check for search box
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
    
    // Check for new cliente button
    await expect(page.locator('button:has-text("Nuevo Cliente")')).toBeVisible();
  });

  test('should create new cliente', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Click new cliente button
    await page.click('button:has-text("Nuevo Cliente")');
    
    // Fill form
    await page.fill('input[name="nombre"]', 'Test Cliente');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="telefono"]', '123456789');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for success message
    await expect(page.locator('text=Cliente creado')).toBeVisible();
    
    // Check if cliente appears in list
    await expect(page.locator('text=Test Cliente')).toBeVisible();
  });

  test('should edit cliente', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Click edit button for first cliente
    await page.click('button:has-text("Editar")');
    
    // Update nombre
    await page.fill('input[name="nombre"]', 'Updated Cliente');
    
    // Submit form
    await page.click('button:has-text("Guardar")');
    
    // Check for success message
    await expect(page.locator('text=Cliente actualizado')).toBeVisible();
    
    // Check if updated name appears
    await expect(page.locator('text=Updated Cliente')).toBeVisible();
  });

  test('should delete cliente', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Click delete button for first cliente
    await page.click('button:has-text("Eliminar")');
    
    // Confirm deletion
    await page.click('button:has-text("Eliminar")');
    
    // Check for success message
    await expect(page.locator('text=Cliente eliminado')).toBeVisible();
  });

  test('should search clientes', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Search for specific cliente
    await page.fill('input[name="q"]', 'Test');
    await page.click('button:has-text("Buscar")');
    
    // Check URL contains search parameter
    await expect(page).toHaveURL(/q=Test/);
  });

  test('should paginate through clientes', async ({ page }) => {
    await page.goto('/dashboard/clientes');
    
    // Check if pagination is visible (if there are enough items)
    const pagination = page.locator('nav:has-text("Anterior")');
    if (await pagination.isVisible()) {
      // Click next page
      await page.click('button:has-text("Siguiente")');
      
      // Check URL contains page parameter
      await expect(page).toHaveURL(/page=/);
    }
  });
});
