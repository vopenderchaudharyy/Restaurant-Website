import { photoPath, savePhoto } from '../services/photos.js';
import { dirname } from 'node:path';
import { ownedRestaurant } from '../services/marketplace.js';
import { fail } from '../utils/errors.js';

export async function uploadPhoto(req, res) {
  if (!req.is(['image/jpeg', 'image/png', 'image/webp']))
    fail('Only JPG, PNG and WebP photos are supported.', 415);
  const restaurant = await ownedRestaurant(req.user.id);
  if (restaurant?.status === 'suspended') fail('Restaurant is suspended.', 403);
  res.status(201).json(await savePhoto(req.body, req.user.id));
}

export function servePhoto(req, res, next) {
  const path = photoPath(`/api/photos/${req.params.owner}/${req.params.file}`);
  if (!path) return res.status(404).json({ message: 'Photo not found.' });
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  // Keep the validated storage directory in root: passing its absolute path as
  // the filename makes Express reject our private .uploads directory as a dotfile.
  res.sendFile(req.params.file, { root: dirname(path), maxAge: '1y', immutable: true }, (error) => {
    if (!error) return;
    if (error.code === 'ENOENT' || error.status === 404)
      return res.status(404).json({ message: 'Photo not found.' });
    next(error);
  });
}
