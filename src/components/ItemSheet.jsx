import { useEffect, useRef } from 'react';
import Photo from './Photo.jsx';
import { L, money, T } from '../lib/i18n.js';

export default function ItemSheet({ data, lang, categoryName, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  if (!data) return null;
  const { item, variants } = data;
  const t = T[lang];
  const name = L(item, 'name', lang);
  const desc = L(item, 'desc', lang);
  const note = L(item, 'note', lang);
  const vs = (variants || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const priceText = money(item.price) || item.priceRaw || '';

  return (
    <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={name} ref={ref}>
        <div className="sheet-hero">
          <Photo src={item.imageUrl || item.thumbUrl} alt={name} focusX={item.focusX} focusY={item.focusY} eager />
          <button className="sheet-x" onClick={onClose} aria-label={t.close}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="sheet-body">
          {categoryName ? <div className="sheet-sub">{categoryName}</div> : null}
          <h2>{name}</h2>
          {item.portion ? <div className="sheet-sub" style={{ textTransform: 'none', letterSpacing: 0 }}>{t.portion}: {item.portion}</div> : null}
          {priceText && !vs.length ? <div className="sheet-price">{priceText}</div> : null}
          {item.available === false ? <div className="badge" style={{ marginTop: 10 }}>{t.unavailable}</div> : null}
          {desc ? (<><div className="sheet-h">{t.ingredients}</div><p className="sheet-desc">{desc}</p></>) : null}
          {vs.length ? (
            <>
              <div className="sheet-h">{t.variants}</div>
              {vs.map((v) => (
                <div className="var-row" key={v.id || v.labelAz}>
                  <span>{L(v, 'label', lang)}</span>
                  <b>{money(v.price) || v.priceRaw}</b>
                </div>
              ))}
            </>
          ) : null}
          {note ? (<><div className="sheet-h">{t.note}</div><div className="sheet-note">{note}</div></>) : null}
        </div>
      </div>
    </div>
  );
}
