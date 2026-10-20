import { useEffect, useRef, useState } from 'react';
import { Upload, Check, LoaderCircle } from 'lucide-react';
import { foodImages } from '../../../shared/restaurants.js';
import { apiRequest } from '../services/api.js';
import { ErrorMessage } from './ui.jsx';

export default function PhotoPicker({
  label,
  image,
  imageKey,
  onChange,
  onBusyChange,
  disabled = false,
}) {
  const input = useRef(null);
  const request = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState('');
  useEffect(() => () => request.current?.abort(), []);

  async function upload(files) {
    if (disabled || request.current) return;
    setDragging(false);
    setError('');
    if (!files?.length) return;
    if (files.length !== 1) return setError('Choose one photo at a time.');
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return setError('Choose a JPG, PNG or WebP photo.');
    if (!file.size || file.size > 5 * 1024 * 1024)
      return setError('Choose a photo between 1 byte and 5 MB.');
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setFilename(file.name);
    onBusyChange(true);
    try {
      const result = await apiRequest('/partner/photos', {
        method: 'POST',
        body: file,
        headers: { 'Content-Type': file.type },
        signal: controller.signal,
      });
      if (!controller.signal.aborted) onChange({ image: result.image, imageKey });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }
  return (
    <div className="photo-picker">
      <span className="photo-picker-label">{label}</span>
      <div
        className={`photo-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy && !disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          upload(event.dataTransfer.files);
        }}
        aria-busy={busy}
      >
        <input
          ref={input}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          aria-label={`Upload ${label.toLowerCase()}`}
          disabled={busy || disabled}
          onChange={(event) => {
            upload(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="photo-upload-button"
          disabled={busy || disabled}
          onClick={() => input.current?.click()}
        >
          {busy ? (
            <LoaderCircle size={19} className="photo-upload-spinner" />
          ) : (
            <Upload size={19} />
          )}
          {busy ? 'Uploading photo…' : image ? 'Replace photo' : 'Upload photo'}
        </button>
        <p>
          Choose a file or drop it here.
          <br />
          JPG, PNG or WebP · Up to 5 MB
        </p>
      </div>
      <div className="photo-upload-status" role="status">
        {busy ? (
          `Optimising ${filename}…`
        ) : image ? (
          <>
            <Check size={14} /> Photo ready. Save the form to apply it.
          </>
        ) : null}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {image ? (
        <button
          type="button"
          className="photo-library-reset"
          disabled={busy || disabled}
          onClick={() => {
            setError('');
            onChange({ image: '', imageKey });
          }}
        >
          Use a library photo instead
        </button>
      ) : (
        <label className="field-label">
          Or choose a library photo
          <select
            value={imageKey}
            disabled={busy || disabled}
            onChange={(event) => onChange({ image: '', imageKey: event.target.value })}
          >
            {foodImages.map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
