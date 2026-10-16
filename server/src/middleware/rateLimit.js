export function rateLimit({ limit = 60, windowMs = 15 * 60000 } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + windowMs };
    if (entry.count >= limit) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
    }
    entry.count++;
    attempts.set(key, entry);
    next();
  };
}
