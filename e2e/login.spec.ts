import { test, expect } from '@playwright/test';

test.describe('SOS Web App Login Flows (Option A - Mocked/Dev Bypass)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/login');
  });

  test('should render the login header correctly', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Sign In');
  });

  test('should switch roles between Client and Expert', async ({ page }) => {
    // Default role should be Client. Expert fields should not be visible.
    await expect(page.getByPlaceholder('phone number or email')).toBeVisible();
    await expect(page.getByPlaceholder('expert@sos.com')).not.toBeVisible();

    // Click on Expert role switcher
    await page.getByRole('button', { name: 'EXPERT' }).click();

    // Expert fields should now be visible, client fields hidden
    await expect(page.getByPlaceholder('expert@sos.com')).toBeVisible();
    await expect(page.getByPlaceholder('phone number or email')).not.toBeVisible();

    // Click back to Client
    await page.getByRole('button', { name: 'CLIENT' }).click();
    await expect(page.getByPlaceholder('phone number or email')).toBeVisible();
  });

  test('should complete the Client OTP login flow successfully (Dev Bypass)', async ({ page }) => {
    // Fill in client mobile number (using the bypass number)
    const input = page.getByPlaceholder('phone number or email');
    await input.fill('0000000000');
    
    // Submit input
    await page.locator('button[type="submit"]').click();

    // Verify OTP input screen is active
    await expect(page.getByText('Enter Verification Code')).toBeVisible({ timeout: 10000 });

    // Fill in the OTP code (using the bypass code)
    const otpInput = page.getByPlaceholder('------');
    await otpInput.fill('123456');

    // Submit OTP code
    await page.locator('button[type="submit"]').click();

    // Verify redirect to Client Dashboard
    await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 10000 });
  });

  test('should complete the Expert login flow successfully (Dev Bypass)', async ({ page }) => {
    // Switch to Expert tab
    await page.getByRole('button', { name: 'EXPERT' }).click();

    // Fill in credentials
    await page.getByPlaceholder('expert@sos.com').fill('test@sos.com');
    await page.getByPlaceholder('••••••••').fill('password');

    // Submit credentials
    await page.locator('button[type="submit"]').click();

    // Verify redirect to Expert Dashboard
    await expect(page).toHaveURL(/\/dashboard\/expert/, { timeout: 10000 });
  });
});
