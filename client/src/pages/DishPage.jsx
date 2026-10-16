import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Heart,
  Star,
  Leaf,
  ChefHat,
  Flame,
  ShoppingBag,
  ArrowLeft,
} from 'lucide-react';
import { menu, extras, money } from '../../../shared/menu.js';
import { useStore } from '../context/store.js';
import { Quantity, DishCard, EmptyState, SectionHeading } from '../components/ui.jsx';

export default function DishPage() {
  const { id } = useParams();
  const dish = menu.find((item) => item.id === id);
  if (!dish)
    return (
      <EmptyState title="This dish isn’t on the menu" text="Let’s find you something delicious." />
    );
  return <DishDetails key={id} dish={dish} />;
}
function DishDetails({ dish }) {
  const { addItem, favorites, toggleFavorite, catalog } = useStore();
  const available = catalog.find((entry) => entry.id === dish.id)?.available !== false;
  const [size, setSize] = useState('regular');
  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const price =
    dish.price +
    (size === 'large' ? 100 : 0) +
    extras
      .filter((extra) => selected.includes(extra.id))
      .reduce((sum, extra) => sum + extra.price, 0);
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link to="/menu">
          <ArrowLeft size={14} /> Menu
        </Link>
        <ChevronRight size={13} />
        <span>{dish.category}</span>
        <ChevronRight size={13} />
        <span>{dish.name}</span>
      </div>
      <div className="dish-detail">
        <div className="detail-photo">
          <img src={dish.image} alt={dish.name} />
          <button
            className={`favorite ${favorites.includes(dish.id) ? 'selected' : ''}`}
            aria-label="Toggle favorite"
            aria-pressed={favorites.includes(dish.id)}
            onClick={() => toggleFavorite(dish.id)}
          >
            <Heart fill={favorites.includes(dish.id) ? 'currentColor' : 'none'} size={23} />
          </button>
          <span className="photo-caption">
            <ChefHat size={17} /> A little love in every bite
          </span>
        </div>
        <div className="detail-content">
          <span className="eyebrow">{dish.tag || 'FRESH FROM OUR KITCHEN'}</span>
          <h1>{dish.name}</h1>
          <div className="rating">
            <Star size={17} fill="currentColor" />
            <b>{dish.rating}</b>
            <span>({dish.reviews} happy reviews)</span>
            <span className={`diet ${dish.veg ? 'veg' : ''}`}>
              <i />
            </span>
            <span>{dish.veg ? 'Vegetarian' : 'Non-vegetarian'}</span>
          </div>
          <div className="detail-price">{money(price)}</div>
          <p className="dish-description">{dish.description}</p>
          <fieldset>
            <legend>Choose your portion</legend>
            <div className="portion-options">
              {['regular', 'large'].map((option) => (
                <label className={size === option ? 'selected' : ''} key={option}>
                  <input
                    type="radio"
                    name="portion"
                    value={option}
                    checked={size === option}
                    onChange={() => setSize(option)}
                  />
                  <span>{option === 'regular' ? 'Regular' : 'Large'}</span>
                  <strong>{money(dish.price + (option === 'large' ? 100 : 0))}</strong>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="addons">
            <legend>
              Make it your own <span>Optional add-ons</span>
            </legend>
            {extras.map((extra) => (
              <label className="check-label" key={extra.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(extra.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, extra.id]
                        : selected.filter((id) => id !== extra.id),
                    )
                  }
                />
                <span>{extra.name}</span>
                <span>+{money(extra.price)}</span>
              </label>
            ))}
          </fieldset>
          <div className="detail-add">
            <Quantity value={quantity} onChange={setQuantity} />
            <button
              className="button"
              disabled={!available}
              onClick={() => addItem(dish.id, size, selected, quantity)}
            >
              <ShoppingBag size={18} />
              {available ? 'Add to cart' : 'Currently sold out'}{' '}
              <span>{money(price * quantity)}</span>
            </button>
          </div>
          <p className="small-muted">Prepared fresh · Usually ready in 20–30 minutes</p>
        </div>
      </div>
      <div className="detail-features">
        {[
          [Leaf, 'Fresh ingredients'],
          [ChefHat, 'Chef crafted'],
          [Flame, 'Made to order'],
          [Heart, 'Made with love'],
        ].map(([Icon, text]) => (
          <div key={text}>
            <Icon size={27} strokeWidth={1.3} />
            <span>{text}</span>
          </div>
        ))}
      </div>
      <section className="section">
        <SectionHeading eyebrow="THE PERFECT COMPANY" title="You might also love" />
        <div className="dish-grid home-dishes">
          {menu
            .filter((item) => item.id !== dish.id)
            .slice(0, 4)
            .map((item) => (
              <DishCard key={item.id} dish={item} />
            ))}
        </div>
      </section>
    </div>
  );
}
