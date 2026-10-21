import { useLayoutEffect, useRef, useState } from 'react';
import {
  Store,
  Utensils,
  MapPin,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  Clock,
  LockKeyhole,
  Info,
} from 'lucide-react';
import { cuisineOptions } from '../../../shared/restaurants.js';
import { money } from '../../../shared/menu.js';
import { apiRequest } from '../services/api.js';
import { ErrorMessage } from './ui.jsx';
import PhotoPicker from './PhotoPicker.jsx';
import { photoFields, formPhoto } from '../services/photos.js';
const defaults = {
  name: '',
  cuisine: 'Indian',
  city: '',
  area: '',
  address: '',
  phone: '',
  description: '',
  imageKey: 'restaurant',
  image: '',
  deliveryFee: 40,
  minOrder: 100,
  etaMin: 25,
  etaMax: 40,
  acceptingOrders: false,
};
const steps = [
  { name: 'Restaurant details', description: 'Name, cuisine and introduction', Icon: Store },
  { name: 'Location & contact', description: 'Where customers can find you', Icon: MapPin },
  {
    name: 'Order preferences',
    description: 'Fees, timings and cover photo',
    Icon: SlidersHorizontal,
  },
];
export default function RestaurantSetup({ restaurant, onSaved }) {
  const [form, setForm] = useState(
    restaurant
      ? {
          ...restaurant,
          ...photoFields(restaurant.image, 'restaurant'),
        }
      : defaults,
  );
  const [step, setStep] = useState(0);
  const [saving, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = saving || uploading;
  const [error, setError] = useState('');
  const headingRef = useRef(null);
  const previousStep = useRef(0);
  useLayoutEffect(() => {
    if (previousStep.current !== step) {
      const heading = headingRef.current;
      heading?.focus({ preventScroll: true });
      if (heading && heading.getBoundingClientRect().top < 0)
        heading.scrollIntoView?.({ block: 'start', behavior: 'instant' });
      previousStep.current = step;
    }
  }, [step]);
  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!restaurant && step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest('/partner', {
        method: restaurant ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...form,
          ...Object.fromEntries(
            ['deliveryFee', 'minOrder', 'etaMin', 'etaMax'].map((key) => [key, Number(form[key])]),
          ),
        }),
      });
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const stageTitle = restaurant ? 'Storefront details' : steps[step].name;
  return (
    <div className={`restaurant-setup ${restaurant ? 'is-settings' : ''}`}>
      {!restaurant && (
        <aside className="setup-rail">
          <span className="setup-rail-label">SET UP YOUR WORKSPACE</span>
          <nav aria-label="Restaurant setup steps">
            {steps.map(({ name, description, Icon }, index) => (
              <button
                key={name}
                type="button"
                disabled={index > step || busy}
                aria-current={index === step ? 'step' : undefined}
                className={`${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`}
                onClick={() => setStep(index)}
              >
                <span className="setup-step-icon">
                  {index < step ? <Check size={17} /> : <Icon size={18} />}
                </span>
                <span>
                  <small>0{index + 1}</small>
                  <strong>{name}</strong>
                  <em>{description}</em>
                </span>
              </button>
            ))}
          </nav>
          <div className="setup-rail-note">
            <LockKeyhole size={18} />
            <h3>You decide when to go live.</h3>
            <p>
              Create your workspace first. Add your menu, then publish when your kitchen is ready.
            </p>
          </div>
        </aside>
      )}
      <form
        className="setup-form"
        onSubmit={submit}
        aria-label={restaurant ? 'Restaurant settings' : 'Restaurant registration'}
      >
        <div className="setup-form-heading">
          <span className="eyebrow">
            {restaurant ? 'STOREFRONT SETTINGS' : `STEP 0${step + 1} OF 03`}
          </span>
          <h2 ref={headingRef} tabIndex={-1}>
            {stageTitle}
          </h2>
          <p>
            {restaurant
              ? 'Keep your public details and ordering preferences up to date.'
              : step === 0
                ? 'Introduce your restaurant to its next regular customer.'
                : step === 1
                  ? 'Add your location and a number for business enquiries.'
                  : 'Set clear expectations before customers place an order.'}
          </p>
        </div>
        <fieldset className="setup-fields" disabled={busy}>
          {(restaurant || step === 0) && (
            <section className="setup-field-section" aria-label="Restaurant details">
              {restaurant && <h3>Restaurant details</h3>}
              <label className="field-label">
                Restaurant name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder="e.g. The Green Table"
                  maxLength={80}
                  autoComplete="organization"
                  required
                />
              </label>
              <label className="field-label">
                Cuisine
                <select name="cuisine" value={form.cuisine} onChange={update}>
                  {cuisineOptions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                About your restaurant
                <textarea
                  aria-label="About your restaurant"
                  name="description"
                  value={form.description}
                  onChange={update}
                  placeholder="Tell customers about your food, your kitchen and what makes you special."
                  maxLength={500}
                  required
                  rows={4}
                />
                <span className="setup-input-help">
                  <span>This appears on your public restaurant page.</span>
                  <span>{form.description.length}/500</span>
                </span>
              </label>
            </section>
          )}
          {(restaurant || step === 1) && (
            <section className="setup-field-section" aria-label="Location and contact">
              {restaurant && <h3>Location & contact</h3>}
              <div className="form-grid">
                <label className="field-label">
                  City
                  <input
                    name="city"
                    value={form.city}
                    onChange={update}
                    placeholder="e.g. Bengaluru"
                    maxLength={60}
                    autoComplete="address-level2"
                    required
                  />
                </label>
                <label className="field-label">
                  Neighbourhood / area
                  <input
                    name="area"
                    value={form.area}
                    onChange={update}
                    placeholder="e.g. Indiranagar"
                    maxLength={80}
                    required
                  />
                </label>
              </div>
              <label className="field-label">
                Restaurant address
                <textarea
                  name="address"
                  value={form.address}
                  onChange={update}
                  placeholder="Building, street and nearby landmark"
                  maxLength={250}
                  autoComplete="street-address"
                  required
                  rows={3}
                />
              </label>
              <label className="field-label">
                Business phone
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={update}
                  placeholder="e.g. +91 98765 43210"
                  pattern="(?:[0-9+ ]|\(|\)|-){7,20}"
                  maxLength={20}
                  autoComplete="tel"
                  required
                />
              </label>
              <p className="setup-field-hint">
                Use your restaurant's contact number. It is kept out of the public listing.
              </p>
            </section>
          )}
          {(restaurant || step === 2) && (
            <section className="setup-field-section" aria-label="Order preferences">
              {restaurant && <h3>Order preferences</h3>}
              <div className="form-grid">
                {[
                  ['deliveryFee', 'Delivery fee (₹)', 0, 500],
                  ['minOrder', 'Minimum order (₹)', 0, 5000],
                  ['etaMin', 'Estimated minutes: from', 10, 120],
                  ['etaMax', 'Estimated minutes: to', Number(form.etaMin), 180],
                ].map(([name, label, min, max]) => (
                  <label className="field-label" key={name}>
                    {label}
                    <input
                      type="number"
                      name={name}
                      value={form[name]}
                      onChange={update}
                      min={min}
                      max={max}
                      step="1"
                      required
                    />
                  </label>
                ))}
              </div>
              <p className="setup-field-hint">
                Delivery fees and estimates are shown before checkout. Set minimum order to 0 if
                none applies.
              </p>
              <PhotoPicker
                label="Cover photo"
                image={form.image}
                imageKey={form.imageKey}
                disabled={saving}
                onBusyChange={setUploading}
                onChange={(photo) => setForm((previous) => ({ ...previous, ...photo }))}
              />
              {restaurant && (
                <label className="setup-accepting">
                  <span>
                    <strong>Accept new orders</strong>
                    <small>Pause incoming orders when your kitchen is unavailable.</small>
                  </span>
                  <input
                    type="checkbox"
                    name="acceptingOrders"
                    checked={form.acceptingOrders}
                    onChange={update}
                  />
                </label>
              )}
            </section>
          )}
        </fieldset>
        <ErrorMessage>{error}</ErrorMessage>
        <div className="setup-form-footer">
          <span className="setup-save-note">
            <LockKeyhole size={14} />
            {restaurant
              ? 'Changes update your storefront'
              : 'Your restaurant starts as a private draft'}
          </span>
          <div>
            {!restaurant && step > 0 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <button className="button setup-primary" disabled={busy} type="submit">
              {uploading
                ? 'Uploading photo...'
                : saving
                  ? 'Saving…'
                  : restaurant
                    ? 'Save restaurant'
                    : step < 2
                      ? 'Continue'
                      : 'Create restaurant workspace'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </form>
      <aside className="setup-preview" aria-label="Live restaurant preview">
        <div className="setup-preview-heading">
          <Eye size={16} />
          <span>STOREFRONT PREVIEW</span>
        </div>
        <div className="setup-preview-card">
          <div className="setup-preview-image">
            <img src={formPhoto(form)} alt="Selected restaurant cover preview" />
            <span>{restaurant?.status || 'Draft'}</span>
          </div>
          <div className="setup-preview-content">
            <h3>{form.name.trim() || 'Your restaurant name'}</h3>
            <p>
              {form.cuisine} · {form.area.trim() || 'Neighbourhood'}
              {form.city.trim() ? `, ${form.city.trim()}` : ''}
            </p>
            <div className="setup-preview-facts">
              <span>
                <Clock size={13} />
                {form.etaMin || '—'}–{form.etaMax || '—'} min
              </span>
              <span>
                {Number(form.deliveryFee)
                  ? `${money(Number(form.deliveryFee))} delivery`
                  : 'Free delivery'}
              </span>
            </div>
            <p className="setup-preview-description">
              {form.description.trim() ||
                'Your introduction will appear here. Make it welcoming and specific to your kitchen.'}
            </p>
            {Number(form.minOrder) > 0 && (
              <small>Minimum order {money(Number(form.minOrder))}</small>
            )}
          </div>
        </div>
        <div className="setup-preview-note">
          <Info size={16} />
          <p>
            {restaurant
              ? 'Preview reflects your edits. Save changes to update the storefront.'
              : 'Only you can see this preview. Your restaurant becomes discoverable after you publish.'}
          </p>
        </div>
        {!restaurant && (
          <div className="setup-next">
            <span className="eyebrow">UP NEXT</span>
            <h3>Bring your menu to life.</h3>
            <p>Add your dishes, prices and availability once your workspace is created.</p>
            <span>
              <Utensils size={14} /> Menu setup follows registration
            </span>
          </div>
        )}
      </aside>
    </div>
  );
}
