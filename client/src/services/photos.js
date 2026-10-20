import { foodImages } from '../../../shared/restaurants.js';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const photoUrl = (image) =>
  image?.startsWith('/api/photos/') ? `${baseUrl}${image.slice(4)}` : image;

export function photoFields(image, fallback = 'pizza') {
  const key = foodImages.find(([key]) => image === `/images/design/${key}.jpg`)?.[0];
  return { image: image?.startsWith('/api/photos/') ? image : '', imageKey: key || fallback };
}

export const formPhoto = (form) => photoUrl(form.image || `/images/design/${form.imageKey}.jpg`);
