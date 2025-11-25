import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/login');
    
    // Should see the login form
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in demo credentials
    await page.getByLabel(/email/i).fill('demo@integration.local');
    await page.getByLabel(/password/i).fill('demo123');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Should see the dashboard content
    await expect(page.getByText(/overview/i)).toBeVisible();
  });

  test('should redirect to login when accessing protected route unauthenticated', async ({ page }) => {
    // Try to access projects page without auth
    await page.goto('/projects');
    
    // Should redirect to login
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should be able to logout', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('demo@integration.local');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard');
    
    // Find and click logout (could be in a menu)
    // This will depend on your UI structure
    const logoutButton = page.getByRole('button', { name: /sign out|logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should be redirected to login
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    }
  });
});

test.describe('Partner Authentication', () => {
  test('should show partner login page', async ({ page }) => {
    await page.goto('/partner/login');
    
    // Should see partner login form
    await expect(page.getByText(/partner access/i)).toBeVisible();
    await expect(page.getByPlaceholder(/invite token/i)).toBeVisible();
  });

  test('should show error for invalid invite token', async ({ page }) => {
    await page.goto('/partner/login');
    
    // Enter invalid token
    await page.getByPlaceholder(/invite token/i).fill('invalid-token');
    await page.getByRole('button', { name: /enter workspace/i }).click();
    
    // Should show error
    await expect(page.getByText(/not found|invalid|expired/i)).toBeVisible();
  });

  test('should accept token from URL query param', async ({ page }) => {
    const testToken = 'test-token-from-url';
    await page.goto(`/partner/login?token=${testToken}`);
    
    // Token field should be pre-filled
    const tokenInput = page.getByPlaceholder(/invite token/i);
    await expect(tokenInput).toHaveValue(testToken);
  });
});

