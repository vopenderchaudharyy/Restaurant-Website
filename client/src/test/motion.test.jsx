import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Reveal from '../components/Reveal.jsx';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function observers({ reduced = false, top = 1200 } = {}) {
  let intersect, preferenceChanged;
  const disconnect = vi.fn();
  const observe = vi.fn();
  const preference = {
    matches: reduced,
    addEventListener: vi.fn((_, callback) => {
      preferenceChanged = callback;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => preference),
  );
  const Observer = vi.fn(function (callback) {
    intersect = callback;
    this.observe = observe;
    this.disconnect = disconnect;
  });
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 10000,
  });
  return {
    observe,
    disconnect,
    Observer,
    preference,
    enter: () => intersect([{ isIntersecting: true }]),
    reduce: () => preferenceChanged({ matches: true }),
  };
}
describe('scroll reveals', () => {
  it('never hides content already visible on screen', () => {
    const observer = observers({ top: 0 });
    render(
      <Reveal>
        <h2>Visible content</h2>
      </Reveal>,
    );
    expect(screen.getByText('Visible content').parentElement.classList.contains('is-pending')).toBe(
      false,
    );
    expect(observer.observe).not.toHaveBeenCalled();
  });
  it('reveals a tall section on intersection without a percentage threshold', () => {
    const observer = observers();
    render(
      <Reveal>
        <h2>Tall menu</h2>
      </Reveal>,
    );
    const section = screen.getByText('Tall menu').parentElement;
    expect(section.classList.contains('is-pending')).toBe(true);
    expect(observer.Observer.mock.calls[0][1].threshold).toBe(0);
    observer.enter();
    expect(section.classList.contains('is-pending')).toBe(false);
    expect(observer.disconnect).toHaveBeenCalled();
  });
  it('reveals pending content immediately when reduced motion is enabled', () => {
    const observer = observers();
    render(
      <Reveal>
        <h2>Offscreen menu</h2>
      </Reveal>,
    );
    observer.reduce();
    expect(screen.getByText('Offscreen menu').parentElement.classList.contains('is-pending')).toBe(
      false,
    );
  });
  it('does not animate with reduced motion and exposes keyboard-focused content', () => {
    const observer = observers({ reduced: true });
    const view = render(<Reveal>Reduced motion</Reveal>);
    expect(observer.observe).not.toHaveBeenCalled();
    view.unmount();
    observers();
    render(
      <Reveal>
        <button>Explore</button>
      </Reveal>,
    );
    fireEvent.focusIn(screen.getByRole('button', { name: 'Explore' }));
    expect(
      screen
        .getByRole('button', { name: 'Explore' })
        .parentElement.classList.contains('is-pending'),
    ).toBe(false);
  });
});
