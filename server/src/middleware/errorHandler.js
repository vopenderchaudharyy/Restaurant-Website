export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(error, _req, res, _next) {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : 500;
  if (status >= 500 && !error.expose) console.error(error);
  res
    .status(status)
    .json({ message: status >= 500 && !error.expose ? 'Internal server error' : error.message });
}
