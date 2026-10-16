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

vi.mock('../services/api.js', () => ({ apiRequest: vi.fn() }));
const account = {
  id: 'customer-test',
  name: 'Test Guest',
  email: 'test@example.com',
  phone: '',
  role: 'customer',
};
const updateProfile = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
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
  });

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
    expect(screen.getByRole('heading', { name: 'Owner access required' })).toBeTruthy();
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

  it('opens the selected craving category from the home page', async () => {
    const { user } = setup('/');
    await user.click(screen.getByRole('link', { name: /03 \/ TREAT YOURSELF/ }));
    expect(screen.getByRole('tab', { name: 'Desserts' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Add Chocolate Lava Cake to cart' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add Margherita Pizza to cart' })).toBeNull();
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
