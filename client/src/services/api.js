const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function apiRequest(path, options = {}) {
  let session = localStorage.getItem('menumate-session');
  if (!session) {
    session = crypto.randomUUID();
    localStorage.setItem('menumate-session', session);
  }
  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'MenuMate',
      'X-Demo-Session': session,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => {
    throw new Error('The restaurant service is unavailable. Please try again.');
  });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new Event('menumate:unauthorized'));
    throw Object.assign(new Error(data.message || `Request failed (${response.status})`), {
      status: response.status,
    });
  }
  return data;
}
