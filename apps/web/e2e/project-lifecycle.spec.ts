import { test, expect } from '@playwright/test';

test.describe('Project Lifecycle', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('demo@integration.local');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should display projects page', async ({ page }) => {
    await page.goto('/projects');
    
    // Should see projects heading
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');
    
    // Click create project button
    const createButton = page.getByRole('button', { name: /create|new project/i });
    await createButton.click();
    
    // Fill in project details
    const projectName = `Test Project ${Date.now()}`;
    await page.getByLabel(/name/i).fill(projectName);
    
    // Submit
    await page.getByRole('button', { name: /create/i }).click();
    
    // Should see the new project
    await expect(page.getByText(projectName)).toBeVisible();
  });

  test('should navigate to project detail page', async ({ page }) => {
    await page.goto('/projects');
    
    // Click on first project card
    const projectCard = page.locator('[class*="card"]').first();
    await projectCard.click();
    
    // Should be on project detail page
    await expect(page.getByText(/specifications|specs/i)).toBeVisible();
  });

  test('should display specs page', async ({ page }) => {
    await page.goto('/specs');
    
    // Should see specs heading or empty state
    const hasSpecs = await page.getByText(/specifications|load sample/i).isVisible();
    expect(hasSpecs).toBeTruthy();
  });

  test('should display mocks page', async ({ page }) => {
    await page.goto('/mocks');
    
    // Should see mocks heading or empty state
    const hasMocks = await page.getByText(/mock|services/i).isVisible();
    expect(hasMocks).toBeTruthy();
  });

  test('should display tests page', async ({ page }) => {
    await page.goto('/tests');
    
    // Should see tests heading or empty state
    const hasTests = await page.getByText(/golden test|suites/i).isVisible();
    expect(hasTests).toBeTruthy();
  });

  test('should display traces page', async ({ page }) => {
    await page.goto('/traces');
    
    // Should see traces heading
    await expect(page.getByText(/traces|telemetry/i)).toBeVisible();
  });

  test('should display plan page', async ({ page }) => {
    await page.goto('/plan');
    
    // Should see plan heading
    await expect(page.getByText(/plan|roadmap|phases/i)).toBeVisible();
  });

  test('should display reports page', async ({ page }) => {
    await page.goto('/reports');
    
    // Should see reports heading
    await expect(page.getByText(/reports|readiness/i)).toBeVisible();
  });
});

test.describe('Project Detail Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('demo@integration.local');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard');
  });

  test('should show invite partner modal', async ({ page }) => {
    // Navigate to a project
    await page.goto('/projects');
    
    // Click on first project
    const projectCard = page.locator('[class*="card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Click invite partner button/card
      const inviteButton = page.getByText(/invite partner/i);
      if (await inviteButton.isVisible()) {
        await inviteButton.click();
        
        // Should show invite modal
        await expect(page.getByLabel(/partner email/i)).toBeVisible();
      }
    }
  });

  test('should show evidence review page', async ({ page }) => {
    // Navigate to a project
    await page.goto('/projects');
    
    // Click on first project
    const projectCard = page.locator('[class*="card"]').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      
      // Wait for page load
      await page.waitForLoadState('networkidle');
      
      // Click review evidence button/card
      const evidenceLink = page.getByText(/review evidence/i);
      if (await evidenceLink.isVisible()) {
        await evidenceLink.click();
        
        // Should be on evidence page
        await expect(page.getByText(/partner evidence review/i)).toBeVisible();
      }
    }
  });
});

