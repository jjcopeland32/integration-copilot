import { test, expect } from '@playwright/test';

test.describe('Partner Portal', () => {
  test('should display partner login page', async ({ page }) => {
    await page.goto('/partner/login');
    
    // Should see partner branding
    await expect(page.getByText(/partner access/i)).toBeVisible();
    await expect(page.getByText(/integration copilot/i)).toBeVisible();
    
    // Should have invite token input
    await expect(page.getByPlaceholder(/invite token/i)).toBeVisible();
    
    // Should have name input
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
  });

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/partner/login');
    
    // Enter invalid token
    await page.getByPlaceholder(/invite token/i).fill('invalid-token-12345');
    
    // Submit
    await page.getByRole('button', { name: /enter workspace/i }).click();
    
    // Should show error message
    await expect(page.getByText(/not found|invalid|expired/i)).toBeVisible();
  });

  test('should pre-fill token from URL', async ({ page }) => {
    const testToken = 'abc123def456';
    await page.goto(`/partner/login?token=${testToken}`);
    
    // Token should be pre-filled
    const tokenInput = page.getByPlaceholder(/invite token/i);
    await expect(tokenInput).toHaveValue(testToken);
  });
});

test.describe('Partner Dashboard (requires valid session)', () => {
  // Note: These tests require a valid partner session which needs to be set up
  // In a real scenario, you'd create an invite via API and use it
  
  test.skip('should display partner dashboard when authenticated', async ({ page }) => {
    // This test would require:
    // 1. Creating a project via API
    // 2. Creating a partner invite via API
    // 3. Accepting the invite to get a session
    // 4. Then navigating to the dashboard
    
    await page.goto('/partner');
    
    // Should see dashboard elements
    await expect(page.getByText(/specs|blueprints/i)).toBeVisible();
    await expect(page.getByText(/golden tests/i)).toBeVisible();
  });

  test.skip('should display AI assistant panel', async ({ page }) => {
    await page.goto('/partner/assistant');
    
    // Should see assistant
    await expect(page.getByText(/ai assistant/i)).toBeVisible();
    
    // Should have quick actions
    await expect(page.getByRole('button', { name: /next steps/i })).toBeVisible();
  });

  test.skip('should display tests panel', async ({ page }) => {
    await page.goto('/partner/tests');
    
    // Should see tests heading
    await expect(page.getByText(/golden test suites/i)).toBeVisible();
  });

  test.skip('should display plan panel', async ({ page }) => {
    await page.goto('/partner/plan');
    
    // Should see plan
    await expect(page.getByText(/plan|milestones/i)).toBeVisible();
  });

  test.skip('should display traces panel', async ({ page }) => {
    await page.goto('/partner/traces');
    
    // Should see traces
    await expect(page.getByText(/traces|telemetry/i)).toBeVisible();
  });
});

test.describe('Partner Flow E2E (full flow)', () => {
  // This describes the full partner onboarding flow
  // These tests are marked as skip because they require:
  // 1. A running database
  // 2. Seeded data or API setup
  
  test.skip('complete partner flow: invite -> accept -> run tests -> submit evidence', async ({ page, request }) => {
    // Step 1: Login as buyer
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('demo@integration.local');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
    
    // Step 2: Navigate to project and create invite
    await page.goto('/projects');
    const projectCard = page.locator('[class*="card"]').first();
    await projectCard.click();
    await page.waitForLoadState('networkidle');
    
    // Click invite partner
    await page.getByText(/invite partner/i).click();
    
    // Fill invite form
    const partnerEmail = `partner-${Date.now()}@test.com`;
    await page.getByLabel(/partner email/i).fill(partnerEmail);
    await page.getByRole('button', { name: /create invite/i }).click();
    
    // Get the invite token
    const tokenElement = page.locator('code');
    const inviteToken = await tokenElement.textContent();
    
    // Close modal
    await page.getByRole('button', { name: /done/i }).click();
    
    // Step 3: Accept invite as partner (new browser context would be better)
    await page.goto('/partner/login');
    await page.getByPlaceholder(/invite token/i).fill(inviteToken || '');
    await page.getByPlaceholder(/name/i).fill('Test Partner');
    await page.getByRole('button', { name: /enter workspace/i }).click();
    
    // Should land on partner dashboard
    await page.waitForURL('**/partner');
    await expect(page.getByText(/specs|blueprints/i)).toBeVisible();
    
    // Step 4: Navigate to tests and run if available
    await page.goto('/partner/tests');
    
    const runButton = page.getByRole('button', { name: /run suite/i });
    if (await runButton.isVisible()) {
      await runButton.click();
      
      // Wait for test to complete
      await expect(page.getByText(/passed|failed/i)).toBeVisible({ timeout: 60000 });
    }
    
    // Step 5: Go to plan and see milestones
    await page.goto('/partner/plan');
    await expect(page.getByText(/plan|milestones/i)).toBeVisible();
  });
});

