import { useStore } from '../context/store.js';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Utensils,
  Soup,
  Pizza,
  CakeSlice,
  Coffee,
  Beef,
  Wheat,
  X,
} from 'lucide-react';
import { categories } from '../../../shared/menu.js';
import { DishCard, EmptyState } from '../components/ui.jsx';

const icons = [Utensils, Soup, Beef, Pizza, Wheat, CakeSlice, Coffee];
export default function MenuPage() {
  const [params] = useSearchParams();
  const {catalog}=useStore();
  const [category, setCategory] = useState(() =>
    categories.includes(params.get('category')) ? params.get('category') : 'All Dishes',
  );
  const [query, setQuery] = useState(params.get('q') || '');
  const [veg, setVeg] = useState(params.get('veg') === '1');
  const [sort, setSort] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);
  const dishes = catalog
    .filter(
      (dish) =>
        (category === 'All Dishes' || dish.category === category) &&
        `${dish.name} ${dish.description}`.toLowerCase().includes(query.toLowerCase()) &&
        (!veg || dish.veg),
    )
    .sort((a, b) => (sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0));
  return (
    <div className="menu-page">
      <section className="menu-intro container">
        <div>
          <span className="eyebrow">FRESH FROM OUR KITCHEN</span>
          <h1>
            Good taste.
            <br />
            <span>Great choices.</span>
          </h1>
          <p>Find your favourite. Make it your own.</p>
        </div>
        <div className="menu-intro-art">
          <img src="/images/design/burger.jpg" alt="Our classic burger" />
          <span>
            MADE FOR
            <br />
            <strong>your mood.</strong>
          </span>
        </div>
      </section>
      <div className="container menu-container">
        <div className="category-tabs" role="tablist" aria-label="Dish categories">
          {categories.map((name, index) => {
            const Icon = icons[index];
            return (
              <button
                key={name}
                role="tab"
                aria-selected={category === name}
                className={category === name ? 'active' : ''}
                onClick={() => setCategory(name)}
              >
                <Icon size={26} strokeWidth={1.3} />
                <span>{name}</span>
              </button>
            );
          })}
        </div>
        <div className="menu-toolbar">
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label="Search dishes"
              autoFocus={params.has('search')}
              placeholder="Search for dishes, flavours or ingredients…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className={`filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={17} /> Filters{veg && <span className="filter-dot" />}
          </button>
        </div>
        {showFilters && (
          <div className="filter-panel">
            <label className="check-label">
              <input
                type="checkbox"
                checked={veg}
                onChange={(event) => setVeg(event.target.checked)}
              />
              Vegetarian only
            </label>
            <label>
              Sort by{' '}
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="popular">Our favourites</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
            <button
              className="text-link"
              onClick={() => {
                setVeg(false);
                setSort('popular');
                setQuery('');
                setCategory('All Dishes');
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <div className="menu-section-heading">
          <h2>
            {query
              ? 'Something for your craving'
              : category === 'All Dishes'
                ? 'Popular dishes'
                : category}
          </h2>
          <span>{dishes.length} delicious possibilities</span>
        </div>
        {dishes.length ? (
          <div className="dish-grid menu-results" key={`${category}-${query}-${veg}-${sort}`}>
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing on the menu just yet"
            text="Try a different search or reset your filters."
          />
        )}
        <div className="menu-footnote">
          Made fresh to order. Please let us know about any food allergies before ordering.
        </div>
      </div>
    </div>
  );
}
