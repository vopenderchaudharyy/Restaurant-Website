import { useEffect, useRef } from 'react';

export default function Reveal({ children, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (
      !window.IntersectionObserver ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.remove('is-pending');
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    node.classList.add('is-pending');
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}
