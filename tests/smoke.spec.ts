import { test, expect } from '@playwright/test';

test('calculator recomputes per-person totals', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const billInput = page.getByLabel('Bill amount');
  await billInput.fill('100');

  const taxInput = page.getByLabel('Sales tax % (editable)');
  await taxInput.fill('0');

  const serviceInput = page.getByLabel('Service / venue fee %');
  await serviceInput.fill('0');

  const customTipInput = page.getByLabel('Custom tip percentage');
  await customTipInput.fill('10');

  const increaseButton = page.getByRole('button', { name: 'increase' });
  await increaseButton.click();
  await increaseButton.click(); // total 4 people

  const perPerson = page.getByTestId('per-person-total');
  await expect(perPerson).toHaveText('$27.50');

  const perPersonTip = page.getByTestId('per-person-tip');
  await expect(perPersonTip).toContainText('$2.50');
});
