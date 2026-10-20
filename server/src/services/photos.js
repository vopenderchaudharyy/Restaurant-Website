import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { foodImages } from '../../../shared/restaurants.js';
import { fail } from '../utils/errors.js';

export const photoDirectory = resolve(
  process.env.MENUMATE_UPLOAD_DIR || fileURLToPath(new URL('../../.uploads/', import.meta.url)),
);
const ownerKey = (id) => createHash('sha256').update(id).digest('hex');
const photoPattern =
  /^\/api\/photos\/([a-f0-9]{64})\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp)$/;
const processing = new Set();

export function photoPath(url) {
  const match = typeof url === 'string' && url.match(photoPattern);
  return match ? join(photoDirectory, match[1], match[2]) : null;
}

export async function resolvePhoto(body, userId, fallback) {
  if (body.image) {
    const path = photoPath(body.image);
    if (!path || body.image.split('/')[3] !== ownerKey(userId))
      fail('Choose a photo uploaded by your account.', 403);
    await access(path).catch(() => fail('This photo is no longer available. Upload it again.'));
    return body.image;
  }
  const key = body.imageKey || fallback;
  if (!foodImages.some(([id]) => id === key)) fail('Choose a valid library photo.');
  return `/images/design/${key}.jpg`;
}

export async function savePhoto(buffer, userId) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) fail('Choose a JPG, PNG or WebP photo.');
  if (buffer.length > 5 * 1024 * 1024) fail('Photo must be 5 MB or smaller.', 413);
  const jpeg = buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!jpeg && !png && !webp) fail('Only JPG, PNG and WebP photos are supported.', 415);
  if (processing.has(userId) || processing.size >= 4)
    fail('Another photo is processing. Please try again shortly.', 429);
  processing.add(userId);
  try {
    let result;
    try {
      const image = sharp(buffer, { limitInputPixels: 25_000_000, failOn: 'warning' });
      const metadata = await image.metadata();
      if ((metadata.pages || 1) > 1) fail('Animated photos are not supported.');
      result = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      fail(
        'Photo could not be processed. Choose a valid, still JPG, PNG or WebP under 25 megapixels.',
      );
    }
    const directory = join(photoDirectory, ownerKey(userId));
    await mkdir(directory, { recursive: true });
    const files = await readdir(directory);
    const sizes = await Promise.all(
      files.map(async (name) => (await stat(join(directory, name))).size),
    );
    if (
      files.length >= 200 ||
      sizes.reduce((sum, size) => sum + size, 0) + result.data.length > 100 * 1024 * 1024
    )
      fail('Your photo storage is full. Contact support before uploading more photos.', 409);
    const name = `${randomUUID()}.webp`;
    await writeFile(join(directory, name), result.data, { flag: 'wx' });
    return {
      image: `/api/photos/${ownerKey(userId)}/${name}`,
      width: result.info.width,
      height: result.info.height,
      bytes: result.data.length,
    };
  } finally {
    processing.delete(userId);
  }
}
