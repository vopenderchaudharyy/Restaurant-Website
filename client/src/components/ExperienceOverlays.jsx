import { useEffect, useRef, useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Search,
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  Trash2,
  Leaf,
  Check,
} from 'lucide-react';
import { useStore } from '../context/store.js';
import { menu, extras, money, itemPrice, totals } from '../../../shared/menu.js';
import { Quantity, OrderTotals } from './ui.jsx';

export default function ExperienceOverlays() {
  const { overlay, setOverlay } = useStore();
  const ref = useRef(null);
  const titleId = useId();
  const type = overlay?.type;
  useEffect(() => {
    const dialog = ref.current;
    if (!type) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [type]);
  const close = () => setOverlay(null);
  return (
    <dialog
      ref={ref}
      className={`experience-dialog ${type === 'bag' ? 'bag-dialog' : ''} ${type === 'search' ? 'search-dialog' : ''}`}
      aria-labelledby={titleId}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {overlay && (
        <div className="dialog-content">
          <button className="dialog-close icon-button" onClick={close} aria-label="Close dialog">
            <X size={21} />
          </button>
          {type === 'dish' && (
            <QuickDish key={overlay.id} id={overlay.id} titleId={titleId} close={close} />
          )}
          {type === 'bag' && <Bag titleId={titleId} close={close} />}
          {type === 'search' && <QuickSearch titleId={titleId} close={close} />}
        </div>
      )}
    </dialog>
  );
}
function QuickDish({ id, titleId, close }) {
  const { addItem, catalog, setOverlay } = useStore();
  const dish = menu.find((item) => item.id === id);
  const [size, setSize] = useState('regular');
  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  if (!dish) return <h2 id={titleId}>This dish is unavailable.</h2>;
  const available = catalog.find((item) => item.id === id)?.available !== false;
  const price = itemPrice({ dishId: id, size, extras: selected }) * quantity;
  return (
    <div className="quick-dish-layout">
      <div className="quick-dish-photo">
        <img src={dish.image} alt={dish.name} />
        <span>
          {dish.veg ? <Leaf size={15} /> : <ShoppingBag size={15} />}{' '}
          {dish.veg ? 'Vegetarian' : 'Non-vegetarian'}
        </span>
      </div>
      <div className="quick-dish-details">
        <span className="eyebrow">{dish.category} / MADE YOUR WAY</span>
        <h2 id={titleId}>{dish.name}</h2>
        <p>{dish.description}</p>
        <fieldset className="quick-portions">
          <legend>Choose your portion</legend>
          {['regular', 'large'].map((value) => (
            <label key={value} className={size === value ? 'selected' : ''}>
              <input
                type="radio"
                name="quick-size"
                value={value}
                checked={size === value}
                onChange={() => setSize(value)}
              />
              <span>
                {value === 'regular' ? 'Regular' : 'Large'}
                <strong>{money(itemPrice({ dishId: id, size: value, extras: [] }))}</strong>
              </span>
              {size === value && <Check size={17} />}
            </label>
          ))}
        </fieldset>
        <fieldset className="quick-extras">
          <legend>A little extra?</legend>
          {extras.map((extra) => (
            <label key={extra.id}>
              <input
                type="checkbox"
                checked={selected.includes(extra.id)}
                onChange={() =>
                  setSelected((items) =>
                    items.includes(extra.id)
                      ? items.filter((item) => item !== extra.id)
                      : [...items, extra.id],
                  )
                }
              />
              <span>{extra.name}</span>
              <strong>+{money(extra.price)}</strong>
            </label>
          ))}
        </fieldset>
        <div className="quick-dish-action">
          <Quantity value={quantity} onChange={setQuantity} label="quick view quantity" />
          <button
            className="button"
            disabled={!available}
            onClick={() => {
              addItem(id, size, selected, quantity);
              setOverlay({ type: 'bag' });
            }}
          >
            {available ? (
              <>
                Add to bag <span>{money(price)}</span>
              </>
            ) : (
              'Currently sold out'
            )}
          </button>
        </div>
        <Link className="quiet-link" to={`/menu/${id}`} onClick={close}>
          See full dish details <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}
function Bag({ titleId, close }) {
  const { cart, updateQuantity, catalog } = useStore();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="bag-content">
      <div className="bag-heading">
        <span className="eyebrow">GOOD CHOICES.</span>
        <h2 id={titleId}>
          Your bag <span>({count})</span>
        </h2>
      </div>
      {!cart.length ? (
        <div className="bag-empty">
          <ShoppingBag size={52} strokeWidth={1.2} />
          <h3>A little empty. A lot of possibilities.</h3>
          <p>Your next favourite is waiting.</p>
          <Link className="button" to="/menu" onClick={close}>
            Explore the menu <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="bag-items">
            {cart.map((item) => {
              const dish = menu.find((entry) => entry.id === item.dishId);
              const soldOut =
                catalog.find((entry) => entry.id === item.dishId)?.available === false;
              return (
                <article className="bag-item" key={item.key}>
                  <img src={dish.image} alt="" />
                  <div>
                    <Link to={`/menu/${dish.id}`} onClick={close}>
                      <h3>{dish.name}</h3>
                    </Link>
                    <p>
                      {item.size}
                      {item.extras.length
                        ? ` · ${item.extras
                            .map((id) => extras.find((extra) => extra.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}`
                        : ''}
                    </p>
                    {soldOut && (
                      <small className="bag-sold-out">Sold out — please remove this item</small>
                    )}
                    <Quantity
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.key, value)}
                      label={`${dish.name} in bag`}
                    />
                  </div>
                  <div className="bag-item-end">
                    <strong>{money(itemPrice(item) * item.quantity)}</strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${dish.name} from bag`}
                      onClick={() => updateQuantity(item.key, 0)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="bag-summary">
            <p className="bag-estimate">Delivery estimate · Pickup options at checkout</p>
            <OrderTotals totals={totals(cart, 'delivery')} />
            <Link className="button" to="/checkout" onClick={close}>
              Continue to checkout <ArrowRight size={18} />
            </Link>
            <Link className="quiet-link" to="/cart" onClick={close}>
              Review full cart <ArrowUpRight size={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
function QuickSearch({ titleId, close }) {
  const [query, setQuery] = useState('');
  const { catalog } = useStore();
  const navigate = useNavigate();
  const results = catalog.filter((dish) =>
    `${dish.name} ${dish.category} ${dish.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="command-search">
      <span className="eyebrow">LESS SEARCHING. MORE EATING.</span>
      <h2 id={titleId}>What are you craving?</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          close();
          navigate(`/menu?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <div className="search-field">
          <Search size={21} />
          <input
            aria-label="Search all dishes"
            autoFocus
            placeholder="Pizza, pasta, something sweet…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>↵</kbd>
        </div>
      </form>
      <div className="search-results" aria-live="polite">
        <span className="search-results-label">
          {query ? `${results.length} matches` : 'A few favourites to get you started'}
        </span>
        {results.length ? (
          results.slice(0, 6).map((dish) => (
            <Link key={dish.id} to={`/menu/${dish.id}`} onClick={close}>
              <img src={dish.image} alt="" />
              <span>
                <strong>{dish.name}</strong>
                <small>
                  {dish.category}
                  {dish.available === false ? ' · Sold out' : ''}
                </small>
              </span>
              <b>{money(dish.price)}</b>
              <ArrowUpRight size={17} />
            </Link>
          ))
        ) : (
          <p className="search-empty">No matches yet. Try a dish or an ingredient.</p>
        )}
      </div>
      <div className="search-hint">
        <span>
          <kbd>esc</kbd> to close
        </span>
        <span>
          <kbd>Ctrl / ⌘ K</kbd> to search anywhere
        </span>
      </div>
    </div>
  );
}
