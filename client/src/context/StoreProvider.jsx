import { useEffect, useState } from 'react';
import { StoreContext } from './store.js';
import { menu } from '../../../shared/menu.js';
import { legacyRestaurant } from '../../../shared/restaurants.js';
import { apiRequest } from '../services/api.js';
import { useAuth } from './auth.js';
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`menumate-${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
const normalize = (dish) => ({
  restaurantId: legacyRestaurant.id,
  restaurantName: legacyRestaurant.name,
  restaurantCity: legacyRestaurant.city,
  restaurantAddress: legacyRestaurant.address,
  restaurantImage: legacyRestaurant.image,
  deliveryFee: 50,
  etaMin: 30,
  etaMax: 40,
  minOrder: 0,
  ...dish,
});
export default function StoreProvider({ children }) {
  const { user } = useAuth();
  const profile = user || { name: '', email: '', phone: '' };
  const [catalog, setCatalog] = useState(() => menu.map(normalize));
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [overlay, setOverlay] = useState(null);
  const [cart, setCart] = useState(() => {
    const saved = read('cart', []);
    if (!Array.isArray(saved)) return [];
    const valid = saved
      .filter(
        (item) =>
          item &&
          typeof item.dishId === 'string' &&
          (menu.some((dish) => dish.id === item.dishId) || item.dish?.id === item.dishId) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 20 &&
          Array.isArray(item.extras) &&
          ['regular', 'large'].includes(item.size),
      )
      .slice(0, 30)
      .map((item) => ({
        ...item,
        dish: normalize(item.dish || menu.find((dish) => dish.id === item.dishId)),
      }));
    return valid.filter((item) => item.dish.restaurantId === valid[0]?.dish.restaurantId);
  });
  const [favorites, setFavorites] = useState(() => {
    const value = read('favorites', []);
    return Array.isArray(value) ? value : [];
  });
  const [checkout, setCheckout] = useState({
    fulfillment: 'delivery',
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [toast, setToast] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () =>
      apiRequest('/menu')
        .then((data) => {
          if (!active || !Array.isArray(data)) return;
          const next = data.map(normalize);
          setCatalog(next);
          setCart((items) =>
            items.map((item) => ({
              ...item,
              dish: next.find((dish) => dish.id === item.dishId) || item.dish,
            })),
          );
        })
        .catch(() => {})
        .finally(() => {
          if (active) setCatalogLoading(false);
        });
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('menumate:menu-updated', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('menumate:menu-updated', refresh);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('menumate-cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem('menumate-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3200);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function addItems(requested, replace = false) {
    if (!requested.length) return false;
    const dishes = requested.map((item) => catalog.find((dish) => dish.id === item.dishId));
    if (dishes.some((dish) => !dish || dish.available === false)) {
      setToast('A dish is unavailable. Please choose from the current menu.');
      return false;
    }
    if (dishes.some((dish) => dish.restaurantId !== dishes[0].restaurantId)) {
      setToast('Please order from one restaurant at a time.');
      return false;
    }
    if (!replace && cart.length && cart[0].dish.restaurantId !== dishes[0].restaurantId) {
      setOverlay({ type: 'switch', items: requested, restaurantName: dishes[0].restaurantName });
      return false;
    }
    setCart((current) => {
      const next = replace ? [] : [...current];
      requested.forEach((item, index) => {
        const { dishId, size = 'regular', extras = [], quantity = 1 } = item;
        const key = [dishId, size, ...extras.slice().sort()].join(':');
        const found = next.findIndex((entry) => entry.key === key);
        if (found >= 0)
          next[found] = { ...next[found], quantity: Math.min(20, next[found].quantity + quantity) };
        else
          next.push({
            key,
            dishId,
            size,
            extras,
            quantity: Math.min(20, quantity),
            dish: dishes[index],
          });
      });
      return next;
    });
    if (replace) setCheckout((previous) => ({ ...previous, notes: '' }));
    setToast(
      requested.length === 1
        ? `${dishes[0].name} added to your cart`
        : 'Your favourites are back in the bag.',
    );
    return true;
  }
  function addItem(dishId, size = 'regular', extras = [], quantity = 1) {
    return addItems([{ dishId, size, extras, quantity }]);
  }
  function updateQuantity(key, quantity) {
    setCart((items) =>
      quantity <= 0
        ? items.filter((item) => item.key !== key)
        : items.map((item) =>
            item.key === key ? { ...item, quantity: Math.min(20, quantity) } : item,
          ),
    );
  }
  function toggleFavorite(id) {
    setFavorites((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  }
  return (
    <StoreContext.Provider
      value={{
        cart,
        setCart,
        addItem,
        addItems,
        updateQuantity,
        favorites,
        toggleFavorite,
        profile,
        catalog,
        catalogLoading,
        overlay,
        setOverlay,
        checkout,
        setCheckout,
        notify: setToast,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
