export function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status, expose: true });
}
export function requiredText(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`Please provide a valid ${label}.`);
  return value.trim();
}
