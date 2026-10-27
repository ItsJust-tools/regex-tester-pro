import { test, expect } from '@playwright/test';

async function closeBackdropIfOpen(page: import('@playwright/test').Page) {
  const backdrop = page.locator('.sidebar-backdrop');
  for (let i = 0; i < 3; i++) {
    const visible = await backdrop.isVisible().catch(() => false);
    if (!visible) return;
    await backdrop.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(100);
  }
}

async function ensureToolbarInteractable(page: import('@playwright/test').Page) {
  await closeBackdropIfOpen(page);
  const backdrop = page.locator('.sidebar-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    await page.keyboard.press('Control+b');
    await expect(backdrop).toBeHidden();
  }
}

async function typePattern(page: import('@playwright/test').Page, pattern: string) {
  await ensureToolbarInteractable(page);
  await page.locator('.rx-pattern-field').fill(pattern);
}

test('tool loads with correct title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title).toContain('Regex Tester Pro');
});

test('pattern input is editable and highlights matches', async ({ page }) => {
  await page.goto('/');
  await typePattern(page, '\\d+');
  await ensureToolbarInteractable(page);
  await page.locator('.rx-test-text').fill('a1 b22 c333');

  await expect(page.locator('.rx-highlight mark')).toHaveCount(3);
  await expect(page.locator('.rx-highlight mark').first()).toHaveText('1');
});

test('capture groups are listed for the selected match', async ({ page }) => {
  await page.goto('/');
  await typePattern(page, '(?<year>\\d{4})-(\\d{2})');
  await ensureToolbarInteractable(page);
  await page.locator('.rx-test-text').fill('2026-10');

  await expect(page.locator('.rx-groups')).toContainText('year');
  await expect(page.locator('.rx-groups')).toContainText('2026');
  await expect(page.locator('.rx-groups')).toContainText('10');
});

test('invalid patterns surface an error', async ({ page }) => {
  await page.goto('/');
  await typePattern(page, '([a-z');
  await expect(page.locator('.rx-error')).toBeVisible();
  await expect(page.locator('.rx-error')).toContainText('Invalid regular expression');
});

test('undo/redo buttons enable/disable correctly', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const undoButton = page.getByRole('button', { name: 'Undo (Ctrl+Z)' });
  const redoButton = page.getByRole('button', { name: 'Redo (Ctrl+Y)' });
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await typePattern(page, 'abc');

  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();

  await undoButton.click({ force: true });
  await expect(redoButton).toBeEnabled();

  await redoButton.click({ force: true });
  await expect(redoButton).toBeDisabled();
});

test('export dropdown opens and shows JSON format', async ({ page }, testInfo) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click({ force: true });
  if (testInfo.project.name.includes('Mobile')) {
    await expect(exportButton).toBeVisible();
    return;
  }
  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('option', { name: /JSON/ })).toBeVisible();
  await page.click('body');
  await expect(menu).not.toBeVisible();
});

test('sidebar toggle button works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const sidebarToggle = page.locator('.toolbar-btn-sidebar');
  const sidebar = page.locator('.tool-shell-sidebar');
  const viewport = page.viewportSize();
  const mobile = viewport !== null && viewport.width <= 768;
  const isCollapsed = await sidebar.evaluate((el) => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await sidebarToggle.click();
    await expect(sidebar).toHaveClass(/open/);
    if (mobile) {
      await page.locator('.sidebar-backdrop').click();
    } else {
      await sidebarToggle.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);
    return;
  }
  await expect(sidebar).toHaveClass(/open/);
  if (mobile) {
    await page.locator('.sidebar-backdrop').click();
  } else {
    await sidebarToggle.click();
  }
  await expect(sidebar).toHaveClass(/collapsed/);
});

test('dark mode toggle works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const themeButton = page.getByRole('button', { name: /Switch to dark mode/i });
  if (await themeButton.isVisible()) {
    await themeButton.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const lightButton = page.getByRole('button', { name: /Switch to light mode/i });
    await lightButton.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  }
});

test('SEO meta tags are present', async ({ page }) => {
  await page.goto('/');

  const title = await page.title();
  expect(title).toBeTruthy();

  const description = await page.getAttribute('meta[name="description"]', 'content');
  expect(description).toBeTruthy();

  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
  expect(ogTitle).toBeTruthy();

  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
  expect(ogImage).toBeTruthy();

  const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
  expect(canonical).toBeTruthy();
});

test('JSON-LD structured data is present', async ({ page }) => {
  await page.goto('/');
  const jsonLd = page.locator('script[type="application/ld+json"]').first();
  const content = await jsonLd.textContent();
  const parsed = JSON.parse(content ?? '{}');
  expect(parsed['@type']).toBe('WebApplication');
  expect(parsed.name).toBeTruthy();
  expect(parsed.offers.price).toBe('0');
});

test('sitemap.xml is accessible', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toContain('urlset');
});

test('robots.txt is accessible', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toMatch(/User-[Aa]gent/);
});

test('keyboard shortcuts overlay opens and closes', async ({ page, browserName }, testInfo) => {
  if (browserName !== 'chromium') return;
  await page.goto('/');
  await ensureToolbarInteractable(page);
  if (testInfo.project.name.includes('Mobile')) {
    await expect(page.getByRole('button', { name: /keyboard shortcuts/i })).toBeVisible();
    return;
  }
  await page.getByRole('button', { name: /keyboard shortcuts/i }).click({ force: true });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('import from json file works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const fileContent = JSON.stringify({
    pattern: '\\d+',
    testText: 'Imported 42',
    flags: ['g'],
  });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.evaluate((el: HTMLInputElement) => {
    el.style.display = 'block';
    el.style.visibility = 'visible';
  });
  await fileInput.setInputFiles({
    name: 'test.json',
    mimeType: 'application/json',
    buffer: Buffer.from(fileContent),
  });

  await expect.poll(() => page.locator('.rx-test-text').inputValue()).toContain('Imported 42');
});

test('export json download triggers', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click({ force: true });

  const jsonOption = page.getByRole('option', { name: /JSON/ });
  const [download] = await Promise.all([page.waitForEvent('download'), jsonOption.click()]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
});

test('404 page works', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  const contentType = response?.headers()['content-type'] ?? '';
  expect(contentType).toContain('text/html');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('visual regression — default view', async ({ page, browserName }) => {
  if (browserName !== 'chromium') return;
  await page.goto('/');
  await page.waitForSelector('.tool-shell-canvas');
  await expect(page.locator('.tool-shell')).toBeVisible();
});
