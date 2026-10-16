import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
// jsdom has no native dialog top layer. Emulate open/close for interaction tests;
// browser focus trapping and rendering still require a real browser check.
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() {
    this.setAttribute('open', '');
    this.querySelector('[autofocus], button, input, a')?.focus();
  },
});
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() {
    this.removeAttribute('open');
  },
});
