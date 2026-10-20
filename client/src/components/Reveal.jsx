import { useLayoutEffect, useRef } from 'react';

export default function Reveal({ children, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    // Never hide content already on screen or rely on a fraction of a tall section.
    if (
      !window.IntersectionObserver ||
      preference?.matches ||
      node.getBoundingClientRect().top < window.innerHeight
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) show();
      },
      { threshold: 0 },
    );
    function show() {
      node.classList.remove('is-pending');
      observer.disconnect();
    }
    function preferenceChanged(event) {
      if (event.matches) show();
    }
    node.classList.add('is-pending');
    node.addEventListener('focusin', show);
    preference?.addEventListener('change', preferenceChanged);
    observer.observe(node);
    return () => {
      show();
      node.removeEventListener('focusin', show);
      preference?.removeEventListener('change', preferenceChanged);
    };
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
