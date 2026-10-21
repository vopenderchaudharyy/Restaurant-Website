import { expect, test } from '@playwright/test';
import { menu } from '../shared/menu.js';
import { demoRestaurants, legacyRestaurant } from '../shared/restaurants.js';

const account = {
  id: 'visual-user',
  name: 'Visual QA',
  email: 'visual@example.com',
  phone: '9876543210',
  role: 'customer',
};

const restaurant = {
  ...legacyRestaurant,
  id: 'visual-restaurant',
  ownerId: account.id,
  name: 'The Green Table',
  cuisine: 'Indian',
  city: 'Satna',
  area: 'North Pateri',
  address: 'North Pateri, Satna, Madhya Pradesh',
  image: '/images/design/restaurant.jpg',
  acceptingOrders: false,
  status: 'published',
};

const catalog = menu.map((dish) => ({
  ...dish,
  available: dish.available !== false,
  restaurantId: restaurant.id,
  restaurantName: restaurant.name,
  restaurantCity: restaurant.city,
  restaurantAddress: restaurant.address,
  restaurantImage: restaurant.image,
  deliveryFee: restaurant.deliveryFee,
  etaMin: restaurant.etaMin,
  etaMax: restaurant.etaMax,
  minOrder: restaurant.minOrder,
}));

async function mockApi(page, { signedIn = false } = {}) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    let status = 200;
    let body;

    if (path === '/auth/me') {
      body = { user: signedIn ? account : null };
    } else if (path === '/menu') {
      body = catalog;
    } else if (path === '/restaurants') {
      body = demoRestaurants.map((item) => ({
        ...item,
        reviewSummary: { rating: 4.7, count: 24 },
      }));
    } else if (path === '/partner') {
      body = { restaurant, menu: catalog.slice(0, 6) };
    } else if (path === '/partner/orders') {
      body = [];
    } else if (path === '/partner/reviews') {
      body = { summary: { rating: 4.8, count: 18 }, reviews: [] };
    } else if (path === '/partner/photos' && request.method() === 'POST') {
      body = { image: '/images/design/cake.jpg' };
    } else if (path === '/payments/config') {
      body = { provider: 'razorpay', mode: 'test', enabled: false, demoAvailable: true };
    } else {
      status = 404;
      body = { message: `Unhandled visual QA route: ${path}` };
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

function collectRuntimeErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function expectHealthyLayout(page) {
  await expect(page.locator('main').first()).toBeVisible();
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(overflow.document, `horizontal overflow: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
    overflow.viewport + 1,
  );

  const brokenImages = await page
    .locator('img')
    .evaluateAll((images) =>
      images
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );
  expect(brokenImages, `broken images: ${brokenImages.join(', ')}`).toEqual([]);
}

async function capture(page, testInfo, name, { fullPage = true } = {}) {
  await page.screenshot({
    path: testInfo.outputPath('visual-qa', `${testInfo.project.name}-${name}.png`),
    fullPage,
  });
}

test('public surfaces remain clean and usable', async ({ page }, testInfo) => {
  await mockApi(page);
  const runtimeErrors = collectRuntimeErrors(page);
  const routes = [
    ['/', 'Good food. Great places. One happy you.', 1],
    ['/restaurants', 'Find your kind of food.', 2],
    ['/menu', 'Good taste. Great choices.', 1],
    ['/contact', 'Get in touch.', 1],
    ['/legal', 'The details behind every order.', 1],
  ];

  for (const [path, heading, level] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level, name: heading })).toBeVisible();
    await expectHealthyLayout(page);
  }

  await capture(page, testInfo, 'legal-centre');
  expect(runtimeErrors).toEqual([]);
});

test('mobile navigation and touch controls behave professionally', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile viewport check');
  await mockApi(page);
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto('/');
  const toggle = page.locator('.mobile-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveClass(/is-open/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await capture(page, testInfo, 'mobile-navigation', { fullPage: false });
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expectHealthyLayout(page);
  expect(runtimeErrors).toEqual([]);
});

test('checkout remains readable through the payment review', async ({ page }, testInfo) => {
  await mockApi(page, { signedIn: true });
  const runtimeErrors = collectRuntimeErrors(page);
  const dish = catalog[0];
  await page.addInitScript((item) => {
    localStorage.setItem(
      'menumate-cart',
      JSON.stringify([
        {
          key: `${item.id}:regular`,
          dishId: item.id,
          dish: item,
          quantity: 1,
          size: 'regular',
          extras: [],
        },
      ]),
    );
  }, dish);

  await page.goto('/checkout');
  await expect(
    page.getByRole('heading', { level: 1, name: 'How would you like it?' }),
  ).toBeVisible();
  await page.getByLabel('Full name').fill('Visual QA');
  await page.getByLabel('Phone number').fill('9876543210');
  await page.getByLabel('Delivery address').fill('42 Test Street, Satna, Madhya Pradesh');
  await expectHealthyLayout(page);
  await capture(page, testInfo, 'checkout');

  await page.getByRole('button', { name: /Continue to payment/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Make it a meal.' })).toBeVisible();
  await expect(page.getByText(/By placing the order/)).toBeVisible();
  await expectHealthyLayout(page);
  await capture(page, testInfo, 'payment-review');
  expect(runtimeErrors).toEqual([]);
});

test('partner workspace and photo preview fit every viewport', async ({ page }, testInfo) => {
  await mockApi(page, { signedIn: true });
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto('/partner');
  await expect(page.getByRole('heading', { level: 1, name: restaurant.name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Menu management' })).toBeVisible();
  await expectHealthyLayout(page);
  await capture(page, testInfo, 'partner-menu');

  await page.getByRole('button', { name: /Add dish/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#dish-editor-title')).toBeFocused();
  await page.getByLabel('Upload dish photo').setInputFiles('client/public/images/design/pizza.jpg');
  await expect(page.getByText('Photo ready. Save the form to apply it.')).toBeVisible();
  await expect(page.getByAltText('Dish photo preview')).toHaveAttribute(
    'src',
    '/images/design/cake.jpg',
  );
  await expectHealthyLayout(page);
  await capture(page, testInfo, 'partner-upload-preview', { fullPage: false });
  expect(runtimeErrors).toEqual([]);
});

test('reduced-motion preference suppresses decorative animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockApi(page);
  await page.goto('/');
  const durations = await page.locator('.page-enter').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animation: styles.animationDuration,
      transition: styles.transitionDuration,
    };
  });
  const milliseconds = (value) =>
    value.endsWith('ms') ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
  expect(milliseconds(durations.animation)).toBeLessThanOrEqual(0.011);
  expect(milliseconds(durations.transition)).toBeLessThanOrEqual(0.011);
});

test('primary content appears while food photos are still loading', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.route('**/images/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { level: 1, name: 'Good food. Great places. One happy you.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Explore restaurants/ }).first()).toBeVisible();
  await expectHealthyLayout(page);
  await capture(page, testInfo, 'slow-images', { fullPage: false });

  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 400);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 35));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  });
  await expect(page.locator('.reveal.is-pending')).toHaveCount(0);
});
