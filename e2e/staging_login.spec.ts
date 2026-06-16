import { test, expect } from '@playwright/test';

test.describe('SOS Web App Login Flows (Option C - Staging Integration)', () => {
  const expertEmail = process.env.STAGING_EXPERT_EMAIL;
  const expertPassword = process.env.STAGING_EXPERT_PASSWORD;
  const clientPhone = process.env.STAGING_CLIENT_PHONE;
  const clientOtp = process.env.STAGING_CLIENT_OTP || '123456';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render the login header correctly on Staging', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Sign In');
  });

  test('should complete the Client OTP login flow successfully on Staging', async ({ page }) => {
    // Skip if staging environment details are not configured
    test.skip(!clientPhone, 'STAGING_CLIENT_PHONE environment variable is not configured');

    const input = page.getByPlaceholder('phone number or email');
    await input.fill(clientPhone!);
    
    // Submit phone number to request OTP
    await page.locator('button[type="submit"]').click();

    // Verify OTP input screen is active
    await expect(page.getByText('Enter Verification Code')).toBeVisible({ timeout: 15000 });

    // Fill in the OTP code
    const otpInput = page.getByPlaceholder('------');
    await otpInput.fill(clientOtp);

    // Submit OTP code
    await page.locator('button[type="submit"]').click();

    // Verify redirect to Client Dashboard
    await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 15000 });
  });

  test('should complete the Expert login flow successfully on Staging', async ({ page }) => {
    // Skip if staging expert credentials are not configured
    test.skip(!expertEmail || !expertPassword, 'STAGING_EXPERT_EMAIL or STAGING_EXPERT_PASSWORD is not configured');

    // Switch to Expert tab
    await page.getByRole('button', { name: 'EXPERT' }).click();

    // Fill in credentials
    await page.getByPlaceholder('expert@sos.com').fill(expertEmail!);
    await page.getByPlaceholder('••••••••').fill(expertPassword!);

    // Submit credentials
    await page.locator('button[type="submit"]').click();

    // Verify redirect to Expert Dashboard
    await expect(page).toHaveURL(/\/dashboard\/expert/, { timeout: 15000 });
  });
});
