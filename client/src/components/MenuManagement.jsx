import { useLayoutEffect, useRef, useState } from 'react';
import { Plus, Search, Pencil, X, Utensils, Image, Check, ArrowRight, Leaf } from 'lucide-react';
import { categories, money } from '../../../shared/menu.js';
import { apiRequest } from '../services/api.js';
import { ErrorMessage } from './ui.jsx';
import PhotoPicker from './PhotoPicker.jsx';
import { photoFields, formPhoto, photoUrl } from '../services/photos.js';
const blankDish = {
  name: '',
  description: '',
  category: 'Main Course',
  price: 199,
  imageKey: 'pizza',
  image: '',
  veg: true,
  available: true,
};
const fields = (dish) => ({
  name: dish.name,
  description: dish.description,
  category: dish.category,
  price: Number(dish.price),
  ...photoFields(dish.image),
  ...(dish.imageKey ? { imageKey: dish.imageKey } : {}),
  veg: dish.veg,
  available: dish.available,
});

export default function MenuManagement({ menu, onSaved, disabled = false }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [availability, setAvailability] = useState('All items');
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  const available = menu.filter((item) => item.available).length;
  const filtered = menu.filter(
    (dish) =>
      (category === 'All categories' || dish.category === category) &&
      (availability === 'All items' || dish.available === (availability === 'Available')) &&
      `${dish.name} ${dish.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  function saved(dish) {
    onSaved(dish);
    setNotice(`${dish.name} saved.`);
  }
  return (
    <section className="menu-management">
      <div className="management-title">
        <div>
          <span className="console-eyebrow">YOUR KITCHEN, YOUR COLLECTION</span>
          <h2 ref={heading} tabIndex={-1}>
            Menu management
          </h2>
          <p>Keep your dishes, prices and availability ready for customers.</p>
        </div>
        <button
          className="button console-primary"
          disabled={disabled}
          onClick={() => setEditor({ dish: null })}
        >
          <Plus size={18} />
          Add dish
        </button>
      </div>
      {notice && (
        <div className="console-success" role="status">
          <Check size={16} />
          {notice}
          <button aria-label="Dismiss menu notification" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
      <div className="menu-manager-panel">
        <div className="menu-manager-toolbar">
          <div className="menu-segments" aria-label="Menu availability filter">
            {[
              ['All items', menu.length],
              ['Available', available],
              ['Sold out', menu.length - available],
            ].map(([name, count]) => (
              <button
                key={name}
                aria-pressed={availability === name}
                className={availability === name ? 'selected' : ''}
                onClick={() => setAvailability(name)}
              >
                {name} <span>{count}</span>
              </button>
            ))}
          </div>
          <div className="menu-manager-filters">
            <label className="console-search">
              <Search size={18} />
              <input
                aria-label="Search your menu"
                placeholder="Search dishes…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              aria-label="Filter menu category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>All categories</option>
              {categories.slice(1).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        {filtered.length ? (
          <div className="menu-table-scroll">
            <table className="merchant-menu-table">
              <caption className="sr-only">Your restaurant menu</caption>
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dish) => (
                  <MenuRow
                    key={dish.id}
                    dish={dish}
                    disabled={disabled}
                    onEdit={() => setEditor({ dish })}
                    onSaved={saved}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="console-empty">
            <span className="console-empty-icon">
              <Utensils size={28} />
            </span>
            <h3>
              {menu.length ? 'No dishes match your filters.' : 'Your first dish starts here.'}
            </h3>
            <p>
              {menu.length
                ? 'Try another category or search term.'
                : 'Add a dish with a clear description, a photo and a price. Your menu will appear here.'}
            </p>
            {menu.length ? (
              <button
                className="button secondary"
                onClick={() => {
                  setQuery('');
                  setCategory('All categories');
                  setAvailability('All items');
                }}
              >
                Clear filters
              </button>
            ) : (
              <button
                className="button console-primary"
                disabled={disabled}
                onClick={() => setEditor({ dish: null })}
              >
                <Plus size={17} />
                Create your first dish
              </button>
            )}
          </div>
        )}
        <div className="menu-table-footer">
          <span>
            {filtered.length} of {menu.length} dishes
          </span>
          <span>Prices in INR · Availability updates your storefront</span>
        </div>
      </div>
      <div className="menu-guidance">
        <span>
          <Image size={20} />
        </span>
        <div>
          <h3>A great menu starts with the details.</h3>
          <p>
            Use a clear dish name, a helpful description and an image that represents the food.
            Upload your own food photos to make the menu yours.
          </p>
        </div>
      </div>
      {editor && (
        <DishEditor
          dish={editor.dish}
          onClose={() => setEditor(null)}
          fallbackFocus={heading}
          onSaved={(dish) => {
            saved(dish);
            setEditor(null);
          }}
        />
      )}
    </section>
  );
}
function MenuRow({ dish, onEdit, onSaved, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest(`/partner/menu/${dish.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...fields(dish), available: !dish.available }),
      });
      onSaved(updated);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <tr>
      <td>
        <div className="merchant-dish">
          <img src={photoUrl(dish.image)} alt="" />
          <div>
            <h3>{dish.name}</h3>
            <p>{dish.description}</p>
            <span className={`merchant-diet ${dish.veg ? 'veg' : ''}`}>
              <i />
              {dish.veg ? 'Vegetarian' : 'Non-vegetarian'}
            </span>
          </div>
        </div>
      </td>
      <td className="menu-category-cell">
        <span>{dish.category}</span>
      </td>
      <td className="menu-price-cell">{money(dish.price)}</td>
      <td>
        <button
          type="button"
          role="switch"
          aria-checked={dish.available}
          aria-label={`Availability for ${dish.name}`}
          className={`merchant-switch ${dish.available ? 'is-on' : ''}`}
          disabled={busy || disabled}
          onClick={toggle}
        >
          <span className="switch-track">
            <i />
          </span>
          <span>{busy ? 'Saving…' : dish.available ? 'Available' : 'Sold out'}</span>
        </button>
        <ErrorMessage>{error}</ErrorMessage>
      </td>
      <td>
        <button
          className="merchant-edit"
          disabled={disabled || busy}
          onClick={onEdit}
          aria-label={`Edit ${dish.name}`}
        >
          <Pencil size={16} />
          <span>Edit</span>
        </button>
      </td>
    </tr>
  );
}
function DishEditor({ dish, onClose, onSaved, fallbackFocus }) {
  const initial = dish ? fields(dish) : blankDish;
  const [form, setForm] = useState(initial);
  const [saving, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = saving || uploading;
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const ref = useRef(null);
  const formHeading = useRef(null);
  const discardHeading = useRef(null);
  const backdrop = useRef(false);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const fallback = fallbackFocus.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    formHeading.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      (previous?.isConnected ? previous : fallback)?.focus({ preventScroll: true });
    };
  }, [fallbackFocus]);
  useLayoutEffect(() => {
    (discard ? discardHeading.current : formHeading.current)?.focus({ preventScroll: true });
  }, [discard]);
  function close() {
    if (busy) return;
    if (JSON.stringify(fields(form)) !== JSON.stringify(fields(initial))) setDiscard(true);
    else onClose();
  }
  function outside(event) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }
  function update(event) {
    const { name, type, checked, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest(`/partner/menu${dish ? `/${dish.id}` : ''}`, {
        method: dish ? 'PATCH' : 'POST',
        body: JSON.stringify(fields(form)),
      });
      onSaved(updated);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="merchant-editor"
      aria-labelledby={discard ? 'discard-dish-title' : 'dish-editor-title'}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onPointerDown={(event) => {
        backdrop.current = outside(event);
      }}
      onClick={(event) => {
        if (backdrop.current && outside(event)) close();
        backdrop.current = false;
      }}
    >
      {discard ? (
        <div className="discard-dish">
          <span className="console-eyebrow">UNSAVED CHANGES</span>
          <h2 id="discard-dish-title" tabIndex={-1} ref={discardHeading}>
            Discard your changes?
          </h2>
          <p>Your edits have not been saved to the menu.</p>
          <div>
            <button className="button console-primary" onClick={() => setDiscard(false)}>
              Keep editing
            </button>
            <button className="button secondary" onClick={onClose}>
              Discard changes
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <header className="merchant-editor-header">
            <div>
              <span className="console-eyebrow">
                {dish ? 'UPDATE YOUR COLLECTION' : 'BUILD YOUR COLLECTION'}
              </span>
              <h2 id="dish-editor-title" tabIndex={-1} ref={formHeading}>
                {dish ? 'Edit dish' : 'Add a dish'}
              </h2>
              <p>Help customers know exactly what they are ordering.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              disabled={busy}
              aria-label="Close dish editor"
              onClick={close}
            >
              <X size={22} />
            </button>
          </header>
          <fieldset className="merchant-editor-body" disabled={busy}>
            <aside className="dish-editor-preview">
              <div className="dish-editor-photo">
                <img src={formPhoto(form)} alt="Dish photo preview" />
                <span>{form.image ? 'Your photo' : 'Library photo'}</span>
              </div>
              <h3>{form.name.trim() || 'Your dish name'}</h3>
              <strong>{money(Number(form.price) || 0)}</strong>
              <span>
                {form.veg ? <Leaf size={14} /> : <Utensils size={14} />}{' '}
                {form.veg ? 'Vegetarian' : 'Non-vegetarian'}
              </span>
              <PhotoPicker
                label="Dish photo"
                image={form.image}
                imageKey={form.imageKey}
                disabled={saving}
                onBusyChange={setUploading}
                onChange={(photo) => setForm((previous) => ({ ...previous, ...photo }))}
              />
            </aside>
            <div className="dish-editor-fields">
              <label className="field-label">
                Dish name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  maxLength={80}
                  placeholder="e.g. Paneer Tikka"
                  required
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={update}
                  rows={3}
                  maxLength={600}
                  placeholder="Ingredients, flavours and what comes with the dish"
                  required
                />
              </label>
              <div className="form-grid">
                <label className="field-label">
                  Category
                  <select name="category" value={form.category} onChange={update}>
                    {categories.slice(1).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Price (₹)
                  <input
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={update}
                    min="1"
                    max="100000"
                    step="1"
                    required
                  />
                </label>
              </div>
              <label className="editor-option">
                <span>
                  <strong>Vegetarian</strong>
                  <small>Help customers choose by dietary preference.</small>
                </span>
                <input type="checkbox" name="veg" checked={form.veg} onChange={update} />
              </label>
              <label className="editor-option">
                <span>
                  <strong>Available to order</strong>
                  <small>Turn off when the dish is sold out.</small>
                </span>
                <input
                  type="checkbox"
                  name="available"
                  checked={form.available}
                  onChange={update}
                />
              </label>
              <p className="editor-pricing-note">
                Regular portion price. Large portions add ₹100; optional add-ons use the prices
                shown at checkout.
              </p>
            </div>
          </fieldset>
          <div className="editor-error">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
          <footer className="merchant-editor-footer">
            <span>Changes are applied when you save.</span>
            <div>
              <button type="button" className="button secondary" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button className="button console-primary" disabled={busy}>
                {uploading
                  ? 'Uploading photo...'
                  : saving
                    ? 'Saving…'
                    : dish
                      ? 'Save dish'
                      : 'Add to menu'}
                <ArrowRight size={16} />
              </button>
            </div>
          </footer>
        </form>
      )}
    </dialog>
  );
}
