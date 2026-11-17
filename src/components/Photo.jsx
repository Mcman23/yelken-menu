import { useState } from 'react';

// Neutral branded placeholder + 4:3 crop with focus point. Never shows a broken image.
export default function Photo({ src, alt, focusX = 50, focusY = 50, eager = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  const show = src && !failed;
  return (
    <div className={`ph ${className}`}>
      {show ? (
        <img
          src={src}
          alt={alt || ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={eager ? 'high' : 'auto'}
          style={{ objectPosition: `${focusX}% ${focusY}%` }}
          onError={() => setFailed(true)}
        />
      ) : (
        <img className="ph-mark" src="/logo.svg" alt="" aria-hidden="true" style={{ opacity: .38 }} />
      )}
    </div>
  );
}
