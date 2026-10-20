import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import StoreProvider from '../context/StoreProvider.jsx';
import { AuthContext } from '../context/auth.js';
import AuthProvider from '../context/AuthProvider.jsx';
import { menu } from '../../../shared/menu.js';
import { apiRequest } from '../services/api.js';
import { openRazorpay } from '../services/razorpay.js';
import PaymentPage from '../pages/PaymentPage.jsx';
import { RefundControl } from '../components/PaymentStatus.jsx';
import OrderReview, { ReviewCard } from '../components/OrderReview.jsx';
import { StoreContext } from '../context/store.js';

vi.mock('../services/api.js', () => ({ apiRequest: vi.fn(), staticDemoMode: false }));
vi.mock('../services/razorpay.js', () => ({ openRazorpay: vi.fn() }));
const account = {
  id: 'customer-test',
  name: 'Test Guest',
  email: 'test@example.com',
  phone: '',
  role: 'customer',
};
const updateProfile = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  sessionStorage.clear();
  openRazorpay.mockReset();
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (path) => (path === '/menu' ? menu : []));
});
function setup(path = '/menu', authUser = account) {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider
        value={{
          user: authUser,
          loading: false,
          error: '',
          updateProfile,
          logout: vi.fn(),
          authenticate: vi.fn(),
        }}
      >
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
  return { user, ...view };
}

describe('restaurant interactions', () => {
  it('combines search, categories and vegetarian filtering', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('tab', { name: 'Main Course' }));
    expect(screen.getByRole('button', { name: 'Add Grilled Chicken to cart' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Margherita Pizza to cart' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByRole('checkbox', { name: 'Vegetarian only' }));
    expect(screen.queryByRole('button', { name: 'Add Grilled Chicken to cart' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    await user.type(screen.getByRole('textbox', { name: 'Search dishes' }), 'pizza');
    expect(screen.getByRole('button', { name: 'Add Margherita Pizza to cart' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Grilled Chicken to cart' })).toBeNull();
  });

  it('preserves portion, extras and quantities in the cart and restores them on reload', async () => {
    const { user, unmount } = setup('/menu/grilled-chicken');
    await user.click(screen.getByRole('radio', { name: /Large/ }));
    await user.click(screen.getByRole('checkbox', { name: /Extra Sauce/ }));
    await user.click(screen.getByRole('button', { name: 'Increase Quantity' }));
    await user.click(screen.getByRole('button', { name: /Add to cart/ }));
    await user.click(screen.getByRole('button', { name: 'Shopping bag, 2 items' }));
    await user.click(screen.getByRole('link', { name: /Review full cart/ }));
    expect(screen.getByText('Large portion · Extra Sauce')).toBeTruthy();
    expect(screen.getByText('₹1,163')).toBeTruthy();
    unmount();
    setup('/cart');
    expect(screen.getByText('Large portion · Extra Sauce')).toBeTruthy();
    expect(screen.getByText('₹1,163')).toBeTruthy();
  });

  it('retains the cart on failed checkout and clears it only after API acceptance', async () => {
    const order = {
      id: 'OD-demo',
      customer: { name: 'Alex Guest' },
      totals: { total: 366 },
      fulfillment: 'delivery',
    };
    let attempts = 0;
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/payments/config') return { enabled: false, demoAvailable: true };
      if (options?.method === 'POST' && ++attempts === 1) throw new Error('Please try again.');
      return order;
    });
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add Margherita Pizza to cart' }));
    await user.click(screen.getByRole('button', { name: 'Shopping bag, 1 items' }));
    await user.click(screen.getByRole('link', { name: /Review full cart/ }));
    await user.click(screen.getByRole('link', { name: /Proceed to checkout/ }));
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Alex Guest');
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '9876543210');
    await user.type(
      screen.getByRole('textbox', { name: 'Delivery address' }),
      '123 Example Road, Bangalore',
    );
    await user.click(screen.getByRole('button', { name: /Continue to payment/ }));
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('menumate-cart'))).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Place demo order' }));
    expect(await screen.findByRole('heading', { name: 'Order placed successfully!' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('menumate-cart'))).toHaveLength(0);
    const body = JSON.parse(
      apiRequest.mock.calls.find(
        ([path, options]) => path === '/orders' && options?.method === 'POST',
      )[1].body,
    );
    expect(body.items[0].dishId).toBe('margherita');
    expect(body.customer.name).toBe('Alex Guest');
    expect(body.payment).toBe('demo-upi');
  }, 10000);

  it('saves favourites independently of the shopping cart', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Save Margherita Pizza to favorites' }));
    await user.click(screen.getByRole('link', { name: 'Favorites' }));
    expect(screen.getByRole('heading', { name: 'Your favourites' })).toBeTruthy();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Margherita Pizza' })).toBeTruthy();
    expect(within(main).queryByRole('heading', { name: 'Grilled Chicken' })).toBeNull();
    expect(JSON.parse(localStorage.getItem('menumate-cart'))).toEqual([]);
  });

  it('submits reservation details and renders the server confirmation', async () => {
    const reservation = {
      id: 'TB-demo',
      name: 'Alex Guest',
      date: '2099-05-22',
      time: '19:00',
      guests: 4,
      occasion: 'Birthday',
      status: 'Confirmed',
    };
    apiRequest.mockImplementation(async (path) => (path === '/menu' ? menu : reservation));
    const { user } = setup('/booking');
    await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Alex Guest');
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '9876543210');
    const date = screen.getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2099-05-22');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Guests' }), '4');
    await user.click(screen.getByRole('button', { name: 'Birthday' }));
    await user.click(screen.getByRole('button', { name: /Reserve a demo table/ }));
    expect(await screen.findByRole('heading', { name: 'Table reserved!' })).toBeTruthy();
    expect(screen.getByText('4 people')).toBeTruthy();
    expect(
      JSON.parse(
        apiRequest.mock.calls.find(
          ([path, options]) => path === '/reservations' && options?.method === 'POST',
        )[1].body,
      ).occasion,
    ).toBe('Birthday');
  });

  it('saves the authenticated profile through the account API', async () => {
    const { user } = setup('/account');
    await user.clear(screen.getByRole('textbox', { name: 'Full name' }));
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Alex Guest');
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ name: 'Alex Guest', phone: '' }),
    );
    expect(screen.getByRole('textbox', { name: 'Email address' }).readOnly).toBe(true);
  });

  it('renders owner dashboard tabs from authorized data', async () => {
    apiRequest.mockResolvedValue([]);
    const { user } = setup('/admin', { ...account, role: 'admin' });
    expect(await screen.findByText('No matching orders yet.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reservations' }));
    expect(screen.getByText('No reservations yet.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByText('The kitchen’s collection')).toBeTruthy();
  });

  it('redirects guests to sign-in and denies owner pages to customers', async () => {
    const view = setup('/account/orders', null);
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect(apiRequest.mock.calls.some(([path]) => path === '/orders')).toBe(false);
    view.unmount();
    setup('/admin');
    expect(screen.getByRole('heading', { name: 'Platform admin access required' })).toBeTruthy();
    expect(apiRequest.mock.calls.some(([path]) => path.startsWith('/admin/'))).toBe(false);
  });

  it('registers an account and restores the intended account destination', async () => {
    apiRequest.mockImplementation(async (path) =>
      path === '/menu' ? menu : { user: path === '/auth/me' ? null : account },
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/register?next=/account']}>
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Make yourself at home.' });
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Test Guest');
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'a-strong-test-passphrase');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'My profile' })).toBeTruthy();
    const call = apiRequest.mock.calls.find(([path]) => path === '/auth/register');
    expect(JSON.parse(call[1].body).email).toBe('test@example.com');
    expect(localStorage.getItem('menumate-profile')).toBeNull();
  });

  it('requires explicit confirmation before cancelling an order', async () => {
    const order = {
      id: 'OD-cancel',
      status: 'Placed',
      createdAt: new Date().toISOString(),
      fulfillment: 'delivery',
      items: [{ dishId: 'margherita', name: 'Margherita Pizza', quantity: 1 }],
      totals: { total: 366 },
    };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (options?.method === 'PATCH') {
        order.status = 'Cancelled';
        return order;
      }
      return [order];
    });
    const { user } = setup('/account/orders');
    await user.click(await screen.findByRole('button', { name: 'Cancel order' }));
    expect(apiRequest.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(
          ([path, options]) => path === '/orders/OD-cancel/cancel' && options?.method === 'PATCH',
        ),
      ).toBe(true),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull());
  });

  it('applies an owner status update with the previous status for conflict detection', async () => {
    const order = {
      id: 'OD-owner',
      status: 'Placed',
      createdAt: new Date().toISOString(),
      customer: { name: 'Test Guest' },
      fulfillment: 'delivery',
      items: [],
      totals: { total: 366 },
    };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/admin/reservations') return [];
      if (options?.method === 'PATCH') {
        order.status = JSON.parse(options.body).status;
        return order;
      }
      return [order];
    });
    const { user } = setup('/admin', { ...account, role: 'admin' });
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Next status for OD-owner' }),
      'Preparing',
    );
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    const call = apiRequest.mock.calls.find(
      ([path, options]) => path === '/admin/orders/OD-owner' && options?.method === 'PATCH',
    );
    expect(JSON.parse(call[1].body)).toEqual({ status: 'Preparing', expectedStatus: 'Placed' });
    await screen.findByText('Preparing', { selector: '.status-badge' });
  });

  it('shows the actual order status on the customer tracking page', async () => {
    apiRequest.mockImplementation(async (path) =>
      path === '/menu'
        ? menu
        : {
            id: 'OD-track',
            status: 'Out for delivery',
            createdAt: new Date().toISOString(),
            fulfillment: 'delivery',
            items: [],
            totals: { subtotal: 299, delivery: 50, tax: 15, total: 364 },
          },
    );
    setup('/orders/OD-track/tracking');
    expect(await screen.findByText('Your order: out for delivery.')).toBeTruthy();
    expect(screen.getByText(/status refreshes every 15 seconds/)).toBeTruthy();
  });

  it('customises a dish in quick view, edits the bag, and restores the page on close', async () => {
    const { user } = setup('/menu');
    const trigger = screen.getByRole('button', { name: 'Quick view Grilled Chicken' });
    await user.click(trigger);
    const modal = await screen.findByRole('dialog', { name: 'Grilled Chicken' });
    await user.click(within(modal).getByRole('radio', { name: /Large/ }));
    await user.click(within(modal).getByRole('checkbox', { name: /Extra Sauce/ }));
    await user.click(within(modal).getByRole('button', { name: 'Increase quick view quantity' }));
    await user.click(within(modal).getByRole('button', { name: /Add to bag/ }));
    const bag = await screen.findByRole('dialog', { name: 'Your bag (2)' });
    expect(within(bag).getByText('\u20b91,163')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('menumate-cart'))[0]).toMatchObject({
      size: 'large',
      extras: ['sauce'],
      quantity: 2,
    });
    await user.click(within(bag).getByRole('button', { name: 'Remove Grilled Chicken from bag' }));
    expect(within(bag).getByText('A little empty. A lot of possibilities.')).toBeTruthy();
    await user.click(within(bag).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('opens keyboard search and submits a query into the menu', async () => {
    const { user } = setup('/');
    await user.keyboard('{Control>}k{/Control}');
    const modal = await screen.findByRole('dialog', { name: 'What are you craving?' });
    await user.type(within(modal).getByRole('textbox', { name: 'Search all dishes' }), 'pizza');
    expect(within(modal).getByText('Margherita Pizza')).toBeTruthy();
    expect(within(modal).queryByText('Truffle Pasta')).toBeNull();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Search dishes' }).value).toBe('pizza');
    expect(screen.queryByRole('button', { name: 'Add Grilled Chicken to cart' })).toBeNull();
  });

  it('opens the selected cuisine from the home page', async () => {
    const { user } = setup('/');
    await user.click(screen.getByRole('link', { name: /Desserts/ }));
    expect(screen.getByRole('button', { name: 'Desserts' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(await screen.findByText('No restaurants match just yet.')).toBeTruthy();
  });

  it('disables ordering for a sold-out dish', async () => {
    apiRequest.mockResolvedValue(
      menu.map((dish) => ({ ...dish, available: dish.id !== 'grilled-chicken' })),
    );
    setup('/menu');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add Grilled Chicken to cart' }).disabled).toBe(
        true,
      ),
    );
    expect(screen.getByText('Currently sold out')).toBeTruthy();
  });
});

const partnerRestaurant = {
  id: 'rest-test',
  name: 'Green Bowl',
  cuisine: 'Healthy',
  city: 'Delhi',
  area: 'Saket',
  address: '42 Garden Lane',
  description: 'Fresh bowls for everyday meals.',
  image: '/images/design/paneer.jpg',
  deliveryFee: 25,
  minOrder: 0,
  etaMin: 20,
  etaMax: 30,
  acceptingOrders: true,
  status: 'published',
};
const partnerDish = {
  id: 'dish-test',
  restaurantId: partnerRestaurant.id,
  restaurantName: partnerRestaurant.name,
  restaurantCity: partnerRestaurant.city,
  restaurantAddress: partnerRestaurant.address,
  deliveryFee: 25,
  minOrder: 0,
  etaMin: 20,
  etaMax: 30,
  name: 'Garden Bowl',
  description: 'Seasonal vegetables with rice.',
  price: 210,
  category: 'Main Course',
  image: '/images/design/paneer.jpg',
  veg: true,
  available: true,
};

describe('multi-restaurant marketplace', () => {
  it('filters restaurants by city and updates saved places immediately', async () => {
    apiRequest.mockImplementation(async (path) =>
      path === '/menu'
        ? [...menu, partnerDish]
        : [
            partnerRestaurant,
            {
              ...partnerRestaurant,
              id: 'rest-other',
              name: 'Other Kitchen',
              city: 'Mumbai',
              cuisine: 'Indian',
            },
          ],
    );
    const { user } = setup('/restaurants');
    await screen.findByRole('heading', { name: 'Green Bowl' });
    await user.type(screen.getByRole('textbox', { name: 'Delivery city' }), 'Delhi');
    expect(screen.queryByRole('heading', { name: 'Other Kitchen' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save Green Bowl' }));
    await user.click(screen.getByRole('checkbox', { name: 'Saved places' }));
    expect(screen.getByRole('heading', { name: 'Green Bowl' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Unsave Green Bowl' }));
    expect(screen.getByText('No restaurants match just yet.')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('menumate-saved-restaurants'))).toEqual([]);
  });

  it('requires confirmation to replace another restaurant bag and restores partner pricing', async () => {
    apiRequest.mockImplementation(async (path) => (path === '/menu' ? [...menu, partnerDish] : []));
    const { user, unmount } = setup('/menu');
    await user.click(await screen.findByRole('button', { name: 'Add Garden Bowl to cart' }));
    await user.click(screen.getByRole('button', { name: 'Add Margherita Pizza to cart' }));
    const dialog = await screen.findByRole('dialog', { name: 'Switch restaurants?' });
    expect(JSON.parse(localStorage.getItem('menumate-cart'))[0].dishId).toBe(partnerDish.id);
    await user.click(within(dialog).getByRole('button', { name: 'Keep current bag' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    const next = setup('/cart');
    expect(screen.getByText('Green Bowl')).toBeTruthy();
    expect(screen.getByText('\u20b9247')).toBeTruthy();
    await next.user.click(screen.getByRole('link', { name: 'Back to menu' }));
    await next.user.click(screen.getByRole('button', { name: 'Add Margherita Pizza to cart' }));
    await next.user.click(screen.getByRole('button', { name: 'Start a new bag' }));
    const bag = await screen.findByRole('dialog', { name: 'Your bag (1)' });
    expect(within(bag).getByRole('heading', { name: 'Margherita Pizza' })).toBeTruthy();
    expect(within(bag).queryByRole('heading', { name: 'Garden Bowl' })).toBeNull();
    expect(JSON.parse(localStorage.getItem('menumate-cart'))[0].dish.restaurantId).toBe(
      'menumate-kitchen',
    );
  });

  it('loads dynamic restaurant menus and uses the correct pickup address and estimate', async () => {
    apiRequest.mockImplementation(async (path) =>
      path === '/menu'
        ? [...menu, partnerDish]
        : { restaurant: partnerRestaurant, menu: [partnerDish] },
    );
    const { user } = setup('/restaurants/rest-test');
    await user.click(await screen.findByRole('button', { name: 'Add Garden Bowl to cart' }));
    await user.click(screen.getByRole('button', { name: 'Shopping bag, 1 items' }));
    await user.click(screen.getByRole('link', { name: /Continue to checkout/ }));
    await user.click(screen.getByRole('radio', { name: 'Pickup' }));
    expect(screen.getByText('42 Garden Lane')).toBeTruthy();
    expect(screen.getByText(/Estimated 20.*30 minutes/)).toBeTruthy();
    expect(screen.getByText('\u20b9221')).toBeTruthy();
  });

  it('creates an owner workspace and saves a first dish before publishing', async () => {
    let restaurant = null;
    const dishes = [];
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/partner' && options?.method === 'POST') {
        restaurant = {
          ...partnerRestaurant,
          ...JSON.parse(options.body),
          status: 'draft',
          acceptingOrders: false,
        };
        return restaurant;
      }
      if (path === '/partner/menu' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        const dish = {
          ...partnerDish,
          ...body,
          image: body.image || `/images/design/${body.imageKey}.jpg`,
        };
        dishes.push(dish);
        return dish;
      }
      if (path === '/partner/publish') {
        restaurant = { ...restaurant, status: 'published' };
        return restaurant;
      }
      return { restaurant, menu: dishes };
    });
    const { user } = setup('/partner');
    await screen.findByRole('heading', { name: 'Restaurant details' });
    expect(screen.queryByRole('button', { name: /Shopping bag/ })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Restaurant name' }), 'Green Bowl');
    await user.type(
      screen.getByRole('textbox', { name: 'About your restaurant' }),
      'Fresh bowls for everyday meals.',
    );
    expect(
      within(screen.getByRole('complementary', { name: 'Live restaurant preview' })).getByRole(
        'heading',
        { name: 'Green Bowl' },
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Location & contact' }),
    );
    for (const [label, value] of [
      ['City', 'Delhi'],
      ['Neighbourhood / area', 'Saket'],
      ['Business phone', '9876543210'],
      ['Restaurant address', '42 Garden Lane'],
    ])
      await user.type(screen.getByRole('textbox', { name: label }), value);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Order preferences' })).toBeTruthy();
    expect(
      apiRequest.mock.calls.some(
        ([path, options]) => path === '/partner' && options?.method === 'POST',
      ),
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Create restaurant workspace' }));
    await screen.findByRole('heading', { level: 1, name: 'Green Bowl' });
    expect(screen.getByText('Draft', { selector: 'strong' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Dish name' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Create your first dish' }));
    await user.type(screen.getByRole('textbox', { name: 'Dish name' }), 'Garden Bowl');
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Rice and vegetables');
    await user.click(screen.getByRole('button', { name: 'Add to menu' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Garden Bowl' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Publish restaurant' }));
    expect(await screen.findByRole('link', { name: /View storefront/ })).toBeTruthy();
    expect(screen.getByText(/Your restaurant is not taking new orders/)).toBeTruthy();
    const create = apiRequest.mock.calls.find(
      ([path, options]) => path === '/partner' && options?.method === 'POST',
    );
    expect(JSON.parse(create[1].body)).toMatchObject({
      name: 'Green Bowl',
      deliveryFee: 40,
      etaMin: 25,
      etaMax: 40,
    });
  });
});

describe('restaurant menu workspace', () => {
  it('filters dishes and saves availability and edits without reloading the workspace', async () => {
    let dish = { ...partnerDish };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === `/partner/menu/${dish.id}` && options?.method === 'PATCH') {
        dish = { ...dish, ...JSON.parse(options.body) };
        return dish;
      }
      return { restaurant: partnerRestaurant, menu: [dish] };
    });
    const { user } = setup('/partner');
    const heading = await screen.findByRole('heading', { level: 1, name: 'Green Bowl' });
    expect(screen.queryByRole('dialog')).toBeNull();
    const search = screen.getByRole('textbox', { name: 'Search your menu' });
    await user.type(search, 'pizza');
    expect(screen.getByRole('heading', { name: 'No dishes match your filters.' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter menu category' }),
      'Pizzas',
    );
    expect(screen.queryByRole('heading', { name: 'Garden Bowl' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    const toggle = screen.getByRole('switch', { name: 'Availability for Garden Bowl' });
    await user.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    expect(document.activeElement).toBe(toggle);
    expect(screen.getByRole('heading', { level: 1, name: 'Green Bowl' })).toBe(heading);
    await user.click(screen.getByRole('button', { name: /^Available 0$/ }));
    expect(screen.queryByRole('heading', { name: 'Garden Bowl' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /^Sold out 1$/ }));
    const edit = screen.getByRole('button', { name: 'Edit Garden Bowl' });
    await user.click(edit);
    const dialog = screen.getByRole('dialog', { name: 'Edit dish' });
    expect(document.activeElement).toBe(within(dialog).getByRole('heading', { name: 'Edit dish' }));
    const name = within(dialog).getByRole('textbox', { name: 'Dish name' });
    await user.clear(name);
    await user.type(name, 'Garden Rice Bowl');
    const price = within(dialog).getByRole('spinbutton', { name: /Price/ });
    await user.clear(price);
    await user.type(price, '240');
    await user.click(within(dialog).getByRole('button', { name: 'Save dish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Garden Rice Bowl' })).toBeTruthy();
    expect(screen.getByText('\u20b9240')).toBeTruthy();
    expect(document.activeElement).toBe(edit);
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(dish).toMatchObject({ name: 'Garden Rice Bowl', price: 240, available: false });
    expect(apiRequest.mock.calls.filter(([path]) => path === '/partner')).toHaveLength(1);
  });

  it('retains failed edits for retry and protects unsaved changes when closing', async () => {
    let rejectSave = true;
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/partner/menu/dish-test' && options?.method === 'PATCH') {
        if (rejectSave) throw new Error('Unable to save. Try again.');
        return { ...partnerDish, ...JSON.parse(options.body) };
      }
      return { restaurant: partnerRestaurant, menu: [partnerDish] };
    });
    const { user } = setup('/partner');
    const edit = await screen.findByRole('button', { name: 'Edit Garden Bowl' });
    await user.click(edit);
    await user.type(screen.getByRole('textbox', { name: 'Dish name' }), ' Special');
    await user.click(screen.getByRole('button', { name: 'Save dish' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to save');
    expect(screen.getByRole('textbox', { name: 'Dish name' }).value).toBe('Garden Bowl Special');
    await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    const discard = screen.getByRole('dialog', { name: 'Discard your changes?' });
    expect(document.activeElement).toBe(
      within(discard).getByRole('heading', { name: 'Discard your changes?' }),
    );
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('textbox', { name: 'Dish name' }).value).toBe('Garden Bowl Special');
    rejectSave = false;
    await user.click(screen.getByRole('button', { name: 'Save dish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Garden Bowl Special' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add dish' }));
    await user.type(screen.getByRole('textbox', { name: 'Dish name' }), 'Unsaved dish');
    await user.click(screen.getByRole('button', { name: 'Close dish editor' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Unsaved dish' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add dish' }));
  });
});

describe('real photo uploads', () => {
  const uploaded = `/api/photos/${'a'.repeat(64)}/11111111-1111-4111-8111-111111111111.webp`;
  it('waits for a dish upload, saves its URL, and preserves it on availability changes', async () => {
    let finishUpload;
    let dish = { ...partnerDish };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/partner/photos')
        return new Promise((resolve) => {
          finishUpload = resolve;
        });
      if (path === '/partner/menu/dish-test' && options?.method === 'PATCH') {
        dish = { ...dish, ...JSON.parse(options.body) };
        return dish;
      }
      return { restaurant: partnerRestaurant, menu: [dish] };
    });
    const { user } = setup('/partner');
    await user.click(await screen.findByRole('button', { name: 'Edit Garden Bowl' }));
    const file = new File(['test png'], 'my-food.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Upload dish photo'), file);
    expect(
      screen.getAllByRole('button', { name: /Uploading photo/ }).every((button) => button.disabled),
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'Close dish editor' }).disabled).toBe(true);
    const call = apiRequest.mock.calls.find(([path]) => path === '/partner/photos');
    expect(call[1].body).toBe(file);
    expect(call[1].headers['Content-Type']).toBe('image/png');
    finishUpload({ image: uploaded });
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Dish photo preview' }).getAttribute('src')).toBe(
        uploaded,
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Save dish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(dish.image).toBe(uploaded);
    await user.click(screen.getByRole('switch', { name: 'Availability for Garden Bowl' }));
    await waitFor(() => expect(dish.available).toBe(false));
    expect(dish.image).toBe(uploaded);
    await user.click(screen.getByRole('button', { name: 'Edit Garden Bowl' }));
    expect(screen.getByRole('img', { name: 'Dish photo preview' }).getAttribute('src')).toBe(
      uploaded,
    );
  });

  it('keeps the previous image after upload failure and can replace or reset a cover photo', async () => {
    let failUpload = true;
    let restaurant = { ...partnerRestaurant, phone: '9876543210' };
    apiRequest.mockImplementation(async (path, options) => {
      if (path === '/menu') return menu;
      if (path === '/partner/photos') {
        if (failUpload) throw new Error('Upload failed. Please retry.');
        return { image: uploaded };
      }
      if (path === '/partner' && options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        restaurant = {
          ...restaurant,
          ...body,
          image: body.image || `/images/design/${body.imageKey}.jpg`,
        };
        return restaurant;
      }
      return { restaurant, menu: [] };
    });
    const { user } = setup('/partner');
    await user.click(await screen.findByRole('button', { name: 'Restaurant settings' }));
    const preview = () => screen.getByRole('img', { name: 'Selected restaurant cover preview' });
    const file = new File(['test photo'], 'cover.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Upload cover photo'), file);
    expect((await screen.findByRole('alert')).textContent).toContain('Upload failed');
    expect(preview().getAttribute('src')).toBe(partnerRestaurant.image);
    expect(screen.getByRole('button', { name: 'Save restaurant' }).disabled).toBe(false);
    failUpload = false;
    await user.upload(screen.getByLabelText('Upload cover photo'), file);
    await waitFor(() => expect(preview().getAttribute('src')).toBe(uploaded));
    await user.click(screen.getByRole('button', { name: 'Save restaurant' }));
    await screen.findByRole('button', { name: 'Save restaurant' });
    expect(restaurant.image).toBe(uploaded);
    expect(preview().getAttribute('src')).toBe(uploaded);
    await user.click(screen.getByRole('button', { name: 'Use a library photo instead' }));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Or choose a library photo' }),
      'pizza',
    );
    await user.click(screen.getByRole('button', { name: 'Save restaurant' }));
    await waitFor(() => expect(restaurant.image).toBe('/images/design/pizza.jpg'));
  });

  it('rejects oversized and unsupported files before making an upload request', async () => {
    apiRequest.mockImplementation(async (path) =>
      path === '/menu' ? menu : { restaurant: partnerRestaurant, menu: [partnerDish] },
    );
    setup('/partner');
    const user = userEvent.setup({ applyAccept: false });
    await user.click(await screen.findByRole('button', { name: 'Edit Garden Bowl' }));
    await user.upload(
      screen.getByLabelText('Upload dish photo'),
      new File(['svg'], 'food.svg', { type: 'image/svg+xml' }),
    );
    expect(screen.getByRole('alert').textContent).toContain('JPG, PNG or WebP');
    await user.upload(
      screen.getByLabelText('Upload dish photo'),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
    );
    expect(screen.getByRole('alert').textContent).toContain('5 MB');
    expect(apiRequest.mock.calls.some(([path]) => path === '/partner/photos')).toBe(false);
    expect(screen.getByRole('img', { name: 'Dish photo preview' }).getAttribute('src')).toBe(
      partnerDish.image,
    );
  });
});

it('explains a restaurant minimum before allowing payment', async () => {
  const dish = { ...partnerDish, minOrder: 500 };
  apiRequest.mockImplementation(async (path) => (path === '/menu' ? [...menu, dish] : []));
  const { user } = setup('/menu');
  await user.click(await screen.findByRole('button', { name: 'Add Garden Bowl to cart' }));
  await user.click(screen.getByRole('button', { name: 'Shopping bag, 1 items' }));
  await user.click(screen.getByRole('link', { name: /Continue to checkout/ }));
  expect(screen.getByRole('alert').textContent).toContain('\u20b9290');
  expect(screen.getByRole('button', { name: /Continue to payment/ }).disabled).toBe(true);
});

describe('professional interaction behaviour', () => {
  it('keeps matching cards mounted while search changes', async () => {
    const { user } = setup('/menu');
    const card = screen
      .getByRole('button', { name: 'Add Margherita Pizza to cart' })
      .closest('article');
    await user.type(screen.getByRole('textbox', { name: 'Search dishes' }), 'margherita');
    expect(
      screen.getByRole('button', { name: 'Add Margherita Pizza to cart' }).closest('article'),
    ).toBe(card);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search dishes' }));
  });
  it('keeps one modal session across quick view and bag, then restores the original trigger', async () => {
    const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const { user } = setup('/menu');
    const trigger = screen.getByRole('button', { name: 'Quick view Grilled Chicken' });
    await user.click(trigger);
    const quick = await screen.findByRole('dialog', { name: 'Grilled Chicken' });
    expect(document.activeElement).toBe(
      within(quick).getByRole('heading', { name: 'Grilled Chicken' }),
    );
    const calls = show.mock.calls.length;
    await user.click(within(quick).getByRole('button', { name: /Add to bag/ }));
    const bag = await screen.findByRole('dialog', { name: 'Your bag (1)' });
    expect(show.mock.calls.length).toBe(calls);
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(within(bag).getByRole('button', { name: 'Close dialog' }));
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).not.toBe('hidden');
    show.mockRestore();
  });
  it('dismisses mobile navigation with Escape or an outside interaction', async () => {
    const { user } = setup('/menu');
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{Escape}');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    await user.click(toggle);
    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
  it('moves keyboard focus to the page after navigation', async () => {
    const { user } = setup('/menu');
    await user.click(screen.getByRole('link', { name: 'About', exact: true }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
  });
});

it('validates each setup step and preserves details when going back or retrying', async () => {
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/menu') return menu;
    if (path === '/partner' && options?.method === 'POST')
      throw new Error('Could not save. Please try again.');
    return { restaurant: null, menu: [] };
  });
  const { user } = setup('/partner');
  await screen.findByRole('heading', { name: 'Restaurant details' });
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Restaurant details' })).toBeTruthy();
  await user.type(screen.getByRole('textbox', { name: 'Restaurant name' }), 'Test Kitchen');
  await user.type(
    screen.getByRole('textbox', { name: 'About your restaurant' }),
    'Fresh meals every day.',
  );
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('textbox', { name: 'Restaurant name' }).value).toBe('Test Kitchen');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  for (const [label, value] of [
    ['City', 'Delhi'],
    ['Neighbourhood / area', 'Saket'],
    ['Restaurant address', '10 Market Road'],
    ['Business phone', '9876543210'],
  ])
    await user.type(screen.getByRole('textbox', { name: label }), value);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  const from = screen.getByRole('spinbutton', { name: 'Estimated minutes: from' });
  const to = screen.getByRole('spinbutton', { name: 'Estimated minutes: to' });
  await user.clear(from);
  await user.type(from, '50');
  await user.click(screen.getByRole('button', { name: 'Create restaurant workspace' }));
  expect(
    apiRequest.mock.calls.some(
      ([path, options]) => path === '/partner' && options?.method === 'POST',
    ),
  ).toBe(false);
  await user.clear(to);
  await user.type(to, '60');
  await user.click(screen.getByRole('button', { name: 'Create restaurant workspace' }));
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Could not save. Please try again.',
  );
  expect(screen.getByRole('spinbutton', { name: 'Estimated minutes: from' }).value).toBe('50');
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('textbox', { name: 'City' }).value).toBe('Delhi');
}, 10000);

it('saves existing restaurant settings through the merchant console', async () => {
  let restaurant = { ...partnerRestaurant, phone: '9876543210' };
  apiRequest.mockImplementation(async (path, options) => {
    if (path === '/menu') return menu;
    if (path === '/partner' && options?.method === 'PATCH') {
      restaurant = { ...restaurant, ...JSON.parse(options.body) };
      return restaurant;
    }
    return { restaurant, menu: [] };
  });
  const { user } = setup('/partner');
  await screen.findByRole('heading', { name: 'Green Bowl', level: 1 });
  await user.click(screen.getByRole('button', { name: 'Restaurant settings', exact: true }));
  const name = screen.getByRole('textbox', { name: 'Restaurant name' });
  await user.clear(name);
  await user.type(name, 'Green Table');
  await user.click(screen.getByRole('checkbox', { name: /Accept new orders/ }));
  await user.click(screen.getByRole('button', { name: 'Save restaurant' }));
  expect(await screen.findByRole('heading', { name: 'Green Table', level: 1 })).toBeTruthy();
  const call = apiRequest.mock.calls.find(
    ([path, options]) => path === '/partner' && options?.method === 'PATCH',
  );
  expect(JSON.parse(call[1].body)).toMatchObject({
    name: 'Green Table',
    acceptingOrders: false,
    deliveryFee: 25,
    etaMin: 20,
    etaMax: 30,
  });
  expect(screen.queryByRole('button', { name: /Shopping bag/ })).toBeNull();
});

describe('Razorpay checkout interface', () => {
  const session = {
    id: 'pa_test',
    status: 'pending',
    gatewayOrderId: 'order_test',
    keyId: 'rzp_test_fixture',
    amount: 36600,
    currency: 'INR',
  };
  function paymentView(
    checkout = {
      name: 'Alex',
      phone: '9876543210',
      address: '10 Test Road',
      fulfillment: 'delivery',
      notes: '',
    },
  ) {
    const setCart = vi.fn();
    const view = render(
      <MemoryRouter initialEntries={['/payment']}>
        <AuthContext.Provider value={{ user: account }}>
          <StoreContext.Provider
            value={{
              cart: [
                {
                  dishId: menu[0].id,
                  dish: menu[0],
                  quantity: 1,
                  size: 'regular',
                  extras: [],
                  key: 'test',
                },
              ],
              setCart,
              checkout,
            }}
          >
            <PaymentPage />
          </StoreContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    return { ...view, setCart, user: userEvent.setup() };
  }
  it('waits for server verification before clearing the bag', async () => {
    let confirm;
    openRazorpay.mockResolvedValue({
      razorpay_payment_id: 'pay_test',
      razorpay_order_id: 'order_test',
      razorpay_signature: 'test-signature',
    });
    apiRequest.mockImplementation(async (path) => {
      if (path === '/payments/config') return { enabled: true, demoAvailable: false };
      if (path === '/payments/checkout') return session;
      if (path.endsWith('/verify'))
        return new Promise((resolve) => {
          confirm = resolve;
        });
    });
    const { user, setCart } = paymentView();
    await user.click(await screen.findByRole('button', { name: 'Continue to Razorpay' }));
    await waitFor(() => expect(openRazorpay).toHaveBeenCalledOnce());
    expect(setCart).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirming your order…' }).disabled).toBe(true);
    confirm({ ...session, status: 'captured', orderId: 'OD-paid' });
    await waitFor(() => expect(setCart).toHaveBeenCalledWith([]));
    expect(sessionStorage.getItem(`menumate-payment-${account.id}`)).toBeNull();
  });
  it('preserves a dismissed checkout and recovers payment status after page reload', async () => {
    openRazorpay.mockRejectedValue(new Error('Checkout closed. Your bag is saved.'));
    apiRequest.mockImplementation(async (path) => {
      if (path === '/payments/config') return { enabled: true, demoAvailable: false };
      if (path === '/payments/checkout') return session;
      if (path === '/payments/checkout/pa_test')
        return { ...session, status: 'captured', orderId: 'OD-recovered' };
    });
    const first = paymentView();
    await first.user.click(await screen.findByRole('button', { name: 'Continue to Razorpay' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Checkout closed');
    expect(first.setCart).not.toHaveBeenCalled();
    first.unmount();
    const next = paymentView({});
    await next.user.click(screen.getByRole('button', { name: 'Check payment status' }));
    await waitFor(() => expect(next.setCart).toHaveBeenCalledWith([]));
    expect(openRazorpay).toHaveBeenCalledOnce();
  });
  it('requires an explicit refund confirmation and submits only the order identifier', async () => {
    apiRequest.mockResolvedValue({ status: 'refund_pending' });
    const onSaved = vi.fn();
    render(
      <RefundControl
        order={{
          id: 'OD-paid',
          status: 'Cancelled',
          payment: 'razorpay',
          totals: { total: 366 },
          paymentDetails: { state: 'captured' },
        }}
        onSaved={onSaved}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Refund payment' }));
    expect(apiRequest).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm test refund' }));
    expect(apiRequest).toHaveBeenCalledWith('/admin/orders/OD-paid/refund', { method: 'POST' });
    expect(onSaved).toHaveBeenCalledOnce();
  });
  it('preserves a changed bag when recovering an earlier payment', async () => {
    sessionStorage.setItem(
      `menumate-payment-${account.id}`,
      JSON.stringify({
        id: session.id,
        items: [{ dishId: 'previous-dish', quantity: 2, size: 'regular', extras: [] }],
        customer: { name: 'Alex', phone: '9876543210' },
        amount: 36600,
      }),
    );
    apiRequest.mockImplementation(async (path) =>
      path === '/payments/config'
        ? { enabled: true, demoAvailable: true }
        : { ...session, status: 'captured', orderId: 'OD-earlier' },
    );
    const { user, setCart } = paymentView();
    await user.click(await screen.findByRole('button', { name: 'Check payment status' }));
    await waitFor(() =>
      expect(sessionStorage.getItem(`menumate-payment-${account.id}`)).toBeNull(),
    );
    expect(setCart).not.toHaveBeenCalled();
    expect(openRazorpay).not.toHaveBeenCalled();
    expect(apiRequest.mock.calls.some(([path]) => path === '/payments/checkout')).toBe(false);
  });
});

describe('verified order reviews', () => {
  it('publishes a rating only from an eligible completed order', async () => {
    apiRequest.mockImplementation(async (path, options) => {
      if (!options?.method) return { eligible: true, review: null };
      return {
        id: 'RV-OD-test',
        orderId: 'OD-test',
        restaurantName: 'Test Kitchen',
        author: 'Alex G.',
        rating: 5,
        comment: JSON.parse(options.body).comment,
        status: 'published',
        verifiedOrder: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    render(<OrderReview orderId="OD-test" />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Rate 5 out of 5' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Your review' }),
      'Fresh food and careful packaging.',
    );
    await user.click(screen.getByRole('button', { name: 'Publish review' }));
    expect(await screen.findByText('Review saved.')).toBeTruthy();
    const call = apiRequest.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(call[0]).toBe('/orders/OD-test/review');
    expect(JSON.parse(call[1].body)).toEqual({
      rating: 5,
      comment: 'Fresh food and careful packaging.',
    });
  });

  it('labels public feedback as a verified order and exposes moderation separately', async () => {
    const onModerate = vi.fn();
    const review = {
      id: 'RV-test',
      restaurantName: 'Test Kitchen',
      author: 'Alex G.',
      rating: 4,
      comment: 'A thoughtful review from a completed order.',
      status: 'published',
      updatedAt: '2026-10-20T10:00:00.000Z',
    };
    render(<ReviewCard review={review} management onModerate={onModerate} />);
    expect(screen.getByText('Verified order')).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hide review' }));
    expect(onModerate).toHaveBeenCalledWith(review);
  });
});
