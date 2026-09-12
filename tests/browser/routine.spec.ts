import { test, expect, type Page } from '@playwright/test';

const password = process.env.E2E_PASSWORD ?? process.env.BOOTSTRAP_PASSWORD;
if (!password) throw new Error('Set E2E_PASSWORD to the password for the app being tested.');

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Password', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Routines', exact: true })).toBeVisible();
}

test('create, edit, reorder, time, resume, complete, review history and archive a routine', async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const name = `Browser check ${testInfo.project.name} ${Date.now()}`;
  await page.getByRole('link', { name: 'New routine', exact: true }).click();
  await page.getByLabel('Routine name').fill(name);
  await page.getByLabel('Category').fill('Maintenance');
  const first = page.getByRole('group', { name: 'Step 1', exact: true });
  await first.getByLabel('Step name', { exact: true }).fill('Prepare');
  await first.getByLabel('Instructions').fill('Get supplies ready.');
  await first.getByLabel('Timer in seconds').fill('30');
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  const second = page.getByRole('group', { name: 'Step 2', exact: true });
  await second.getByLabel('Step name', { exact: true }).fill('Clean');
  await second.getByLabel('Reps or quantity').fill('1 pass');
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  const routineUrl = page.url();
  await page.getByRole('link', { name: 'Edit routine', exact: true }).click();
  await page.getByRole('button', { name: 'Move step 2 up', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: 'Step 1', exact: true })
      .getByLabel('Step name', { exact: true }),
  ).toHaveValue('Clean');
  await page.getByRole('button', { name: 'Add step', exact: true }).click();
  await page
    .getByRole('group', { name: 'Step 3', exact: true })
    .getByLabel('Step name', { exact: true })
    .fill('Temporary step');
  await page.getByRole('button', { name: 'Remove step 3', exact: true }).click();
  await page.getByRole('button', { name: 'Save routine', exact: true }).click();
  await page.getByRole('button', { name: 'Start routine', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark complete', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish routine' })).toHaveCount(0);
  const runUrl = page.url();
  await page.getByRole('checkbox', { name: 'Complete Clean', exact: true }).click();
  await expect(page.getByText('1 of 2 complete', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Complete Clean', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Start timer for Prepare', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause timer for Prepare' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pause timer for Prepare' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause timer for Prepare' }).click();
  await page.getByRole('button', { name: 'Reset timer for Prepare' }).click();
  await expect(page.getByRole('timer', { name: 'Timer for Prepare' })).toHaveText('0:30');
  // Use a second browser context with a separately issued login cookie.
  const secondContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  const another = await secondContext.newPage();
  await login(another);
  await another.goto(runUrl);
  await expect(
    another.getByRole('checkbox', { name: 'Complete Clean', exact: true }),
  ).toBeChecked();
  await another.getByRole('checkbox', { name: 'Complete Prepare', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Complete Prepare', exact: true })).toBeChecked({
    timeout: 12000,
  });
  await secondContext.close();
  await page.getByRole('button', { name: 'Finish routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Routine complete', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .click();
  await expect(page.getByRole('heading', { name: 'Routine complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await expect(page.getByText('0 of 2 complete', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Discard run', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Run discarded', exact: true })).toBeVisible();
  await page.goto(`${routineUrl}/edit`);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Archive routine', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Routines', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-routines.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});
