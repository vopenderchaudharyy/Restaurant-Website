import { menu } from '../../../shared/menu.js';
import { demoRestaurants } from '../../../shared/restaurants.js';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const staticDemoMode = import.meta.env.VITE_STATIC_DEMO === 'true' && baseUrl === '/api';

function staticFallback(path, options) {
  if (!staticDemoMode || (options.method && options.method !== 'GET')) return undefined;
  const resource = `/${path.replace(/^\//, '').split('?')[0]}`;
  if (resource === '/menu') return menu;
  if (resource === '/restaurants')
    return demoRestaurants.map((restaurant) => ({
      ...restaurant,
      reviewSummary: { rating: null, count: 0 },
    }));
  const match = resource.match(/^\/restaurants\/([^/]+)$/);
  if (match) {
    const restaurant = demoRestaurants.find((item) => item.id === decodeURIComponent(match[1]));
    if (restaurant)
      return {
        restaurant,
        menu: menu.filter((dish) => dish.restaurantId === restaurant.id),
        reviews: [],
        reviewSummary: { rating: null, count: 0 },
      };
  }
  return undefined;
}

export async function apiRequest(path, options = {}) {
  let session = localStorage.getItem('menumate-session');
  if (!session) {
    session = crypto.randomUUID();
    localStorage.setItem('menumate-session', session);
  }
  let response;
  try {
    response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'MenuMate',
        'X-Demo-Session': session,
        ...options.headers,
      },
    });
  } catch {
    const fallback = staticFallback(path, options);
    if (fallback !== undefined) return fallback;
    throw new Error('The restaurant service is unavailable. Please try again.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    const fallback = staticFallback(path, options);
    if (fallback !== undefined) return fallback;
    throw new Error('The restaurant service is unavailable. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('menumate:unauthorized'));
    throw Object.assign(new Error(data.message || `Request failed (${response.status})`), {
      status: response.status,
    });
  }
  return data;
}
