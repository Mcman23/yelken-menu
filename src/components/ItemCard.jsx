import Photo from './Photo.jsx';
import { L, money, T } from '../lib/i18n.js';

export default function ItemCard({ item, variants, lang, onOpen }) {
  const name = L(item, 'name', lang);
  const vs = (variants || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const priceText = vs.length
    ? vs.map((v) => money(v.price) || v.priceRaw).filter(Boolean).join(' / ')
    : money(item.price) || item.priceRaw || '';
  const meta = [];
  if (item.portion) meta.push(item.portion);
  if (vs.length) meta.push(vs.map((v) => L(v, 'label', lang)).join(' · '));
  return (
    <button className="card" type="button" onClick={() => onOpen(item, vs)} aria-label={`${name}. ${priceText}`}>
      <div className="card-img">
        <Photo src={item.thumbUrl || item.imageUrl} alt={name} focusX={item.focusX} focusY={item.focusY} />
      </div>
      <div className="card-body">
        <div className="card-name">{name}</div>
        <div className="card-meta">
          {meta.filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}
          {item.available === false && <span className="badge">{T[lang].unavailable}</span>}
        </div>
      </div>
      {priceText ? <div className="card-price">{priceText}</div> : null}
    </button>
  );
}
