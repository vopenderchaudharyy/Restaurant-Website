import { useEffect, useState } from 'react';
import { StoreContext } from './store.js';
import { menu } from '../../../shared/menu.js';
import { apiRequest } from '../services/api.js';
import { useAuth } from './auth.js';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`menumate-${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
export default function StoreProvider({ children }) {
  const { user } = useAuth();
  const profile = user || { name: '', email: '', phone: '' };
  const [catalog, setCatalog] = useState(menu);
  const [overlay, setOverlay] = useState(null);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      apiRequest('/menu')
        .then((data) => {
          if (active && Array.isArray(data)) setCatalog(data);
        })
        .catch(() => {});
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
  const [cart, setCart] = useState(() => {
    const saved = read('cart', []);
    return Array.isArray(saved)
      ? saved.filter(
          (item) =>
            item &&
            menu.some((dish) => dish.id === item.dishId) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            item.quantity <= 20 &&
            Array.isArray(item.extras) &&
            ['regular', 'large'].includes(item.size),
        )
      : [];
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = read('favorites', []);
    return Array.isArray(saved) ? saved : [];
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
  function addItem(dishId, size = 'regular', extras = [], quantity = 1) {
    if (catalog.find((dish) => dish.id === dishId)?.available === false) {
      setToast('This dish is currently sold out. Please choose another favourite.');
      return;
    }
    const key = [dishId, size, ...extras.slice().sort()].join(':');
    setCart((items) => {
      const found = items.find((item) => item.key === key);
      if (found)
        return items.map((item) =>
          item.key === key ? { ...item, quantity: Math.min(20, item.quantity + quantity) } : item,
        );
      return [...items, { key, dishId, size, extras, quantity }];
    });
    setToast(`${menu.find((dish) => dish.id === dishId).name} added to your cart`);
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
        updateQuantity,
        favorites,
        toggleFavorite,
        profile,
        catalog,
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
