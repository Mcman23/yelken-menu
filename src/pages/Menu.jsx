import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMenu } from '../lib/api.js';
import { L, T, initialLang, saveLang, norm } from '../lib/i18n.js';
import ItemCard from '../components/ItemCard.jsx';
import ItemSheet from '../components/ItemSheet.jsx';

const LANGS = ['az', 'ru', 'en'];

export default function Menu() {
  const [lang, setLang] = useState(initialLang);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [active, setActive] = useState('');
  const [sheet, setSheet] = useState(null);
  const [allOpen, setAllOpen] = useState(false);
  const t = T[lang];
  const navRef = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(() => {
    setState('loading');
    fetchMenu().then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
  }, []);
  useEffect(load, [load]);

  const changeLang = (l) => { setLang(l); saveLang(l); };

  const cats = useMemo(
    () => (data?.categories || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [data],
  );
  const itemsByCat = useMemo(() => {
    const m = new Map();
    for (const it of data?.items || []) {
      if (!m.has(it.categoryKey)) m.set(it.categoryKey, []);
      m.get(it.categoryKey).push(it);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return m;
  }, [data]);
  const varsByItem = useMemo(() => {
    const m = new Map();
    for (const v of data?.variants || []) {
      if (!m.has(v.itemId)) m.set(v.itemId, []);
      m.get(v.itemId).push(v);
    }
    return m;
  }, [data]);
  const catName = useCallback((c) => L(c, 'name', lang), [lang]);

  const q = norm(query);
  const results = useMemo(() => {
    if (!q) return null;
    const out = [];
    for (const c of cats) {
      for (const it of itemsByCat.get(c.key) || []) {
        const hay = [it.nameAz, lang === 'ru' ? it.nameRu : it.nameEn, it.portion].filter(Boolean).map(norm).join(' ');
        if (hay.includes(q)) out.push({ item: it, cat: c });
      }
    }
    return out;
  }, [q, cats, itemsByCat, lang]);

  // active category from scroll position
  useEffect(() => {
    if (!data || results) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const offset = 118;
        let cur = cats[0]?.key || '';
        for (const c of cats) {
          const el = document.getElementById('cat-' + c.key);
          if (el && el.getBoundingClientRect().top - offset <= 4) cur = c.key;
        }
        setActive(cur);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [data, cats, results]);

  // keep active chip visible
  useEffect(() => {
    const scroller = navRef.current;
    if (!scroller || !active) return;
    const chip = scroller.querySelector(`[data-cat="${active}"]`);
    if (!chip) return;
    const target = chip.offsetLeft - scroller.clientWidth / 2 + chip.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [active]);

  const goTo = (key) => {
    setAllOpen(false);
    setSearchOpen(false);
    setQuery('');
    const el = document.getElementById('cat-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openItem = (item, variants) => setSheet({ item, variants: variants || varsByItem.get(item.itemId) || [] });
  const catOf = sheet ? cats.find((c) => c.key === sheet.item.categoryKey) : null;

  const feeNote = L(data?.settings, 'serviceFeeNote', lang) || (data?.settings?.serviceFeePercent ? `+${data.settings.serviceFeePercent}%` : '');
  const photoNote = L(data?.settings, 'photoNote', lang);
  const fishNote = L(data?.settings, 'fishNote', lang);
  const footer = L(data?.settings, 'menuFooter', lang);
  const logoUrl = data?.settings?.logoUrl;
  const logoMark = data?.settings?.logoMark || 'Yelkən';
  const s = data?.settings || {};

  return (
    <>
      <header className="hdr">
        <div className="wrap hdr-in">
          <a className="brand" href="/menu" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            {logoUrl ? <img src={logoUrl} alt={logoMark} /> : <img src={import.meta.env.BASE_URL + "logo.png"} alt={logoMark} />}
            <span className="brand-txt">
              <span className="brand-sub">{s.tagline || 'Şüvəlan'}</span>
            </span>
          </a>
          <div className="hdr-actions">
            <div className="langs" role="group" aria-label={t.lang}>
              {LANGS.map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => changeLang(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button className="icon-btn" type="button" aria-label={t.search} aria-expanded={searchOpen}
              onClick={() => { setSearchOpen((v) => !v); setTimeout(() => inputRef.current?.focus(), 60); }}>
              {searchOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              )}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="searchbar">
            <div className="wrap search-row">
              <input ref={inputRef} className="search-input" type="search" value={query} placeholder={t.searchPh}
                onChange={(e) => setQuery(e.target.value)} aria-label={t.search} autoComplete="off" />
              {query && <button className="btn btn-sm" type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>{t.clear}</button>}
            </div>
          </div>
        )}
      </header>

      {!results && cats.length > 0 && (
        <nav className="catnav" aria-label={t.categories}>
          <div className="wrap catnav-in">
            <div className="catscroll" ref={navRef}>
              {cats.map((c, i) => (
                <button key={c.key} type="button" className="chip" data-cat={c.key}
                  aria-current={active === c.key} onClick={() => goTo(c.key)}>
                  <b>{String(i + 1).padStart(2, '0')}</b>{catName(c)}
                </button>
              ))}
            </div>
            <button className="btn btn-sm nav-all" type="button" onClick={() => setAllOpen(true)}>{t.all}</button>
          </div>
        </nav>
      )}

      <main className="main">
        <div className="wrap">
          {state === 'loading' && <div className="loading"><div className="spinner" />{t.loading}</div>}
          {state === 'error' && (
            <div className="empty">
              <h3>{t.error}</h3>
              <button className="btn btn-primary" type="button" onClick={load}>{t.retry}</button>
            </div>
          )}

          {state === 'ready' && results && (
            <section className="section" style={{ paddingTop: 14 }}>
              <div className="sec-head">
                <h2 className="sec-title">{t.results}</h2>
                <span className="sec-count">{results.length}</span>
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => { setQuery(''); setSearchOpen(false); }}>{t.reset}</button>
              </div>
              {results.length === 0 ? (
                <div className="empty">
                  <h3>{t.nothing}</h3>
                  <p>{t.nothingHint}</p>
                  <button className="btn btn-primary" type="button" onClick={() => { setQuery(''); setSearchOpen(false); }}>{t.reset}</button>
                </div>
              ) : (
                <div className="cards">
                  {results.map(({ item }) => (
                    <ItemCard key={item.itemId} item={item} variants={varsByItem.get(item.itemId)} lang={lang} onOpen={openItem} />
                  ))}
                </div>
              )}
            </section>
          )}

          {state === 'ready' && !results && cats.length === 0 && (
            <div className="empty"><h3>{t.empty}</h3></div>
          )}

          {state === 'ready' && !results && cats.map((c, i) => {
            const items = itemsByCat.get(c.key) || [];
            return (
              <section className="section" id={'cat-' + c.key} key={c.key}>
                <div className="sec-head">
                  <span className="sec-num">{String(i + 1).padStart(2, '0')}</span>
                  <h2 className="sec-title">{catName(c)}</h2>
                  <span className="sec-count">{items.length}</span>
                </div>
                {c.key === 'baliq' && fishNote ? <p className="sec-note">{fishNote}</p> : null}
                <div className="cards">
                  {items.map((item) => (
                    <ItemCard key={item.itemId} item={item} variants={varsByItem.get(item.itemId)} lang={lang} onOpen={openItem} />
                  ))}
                </div>
              </section>
            );
          })}

          {state === 'ready' && (
            <footer className="foot">
              {feeNote ? <p className="fee">{feeNote}</p> : null}
              {photoNote ? <p>{photoNote}</p> : null}
              {footer ? <p>{footer}</p> : null}
              <div className="foot-links">
                {s.whatsapp ? <a className="btn btn-sm" href={`https://wa.me/${String(s.whatsapp).replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">{t.whatsapp}</a> : null}
                {s.phone ? <a className="btn btn-sm" href={`tel:${String(s.phone).replace(/[^\d+]/g, '')}`}>{t.call}</a> : null}
                {s.mapUrl ? <a className="btn btn-sm" href={s.mapUrl} target="_blank" rel="noreferrer">{t.map}</a> : null}
              </div>
            </footer>
          )}
        </div>
      </main>

      {sheet && <ItemSheet data={sheet} lang={lang} categoryName={catOf ? catName(catOf) : ''} onClose={() => setSheet(null)} />}

      {allOpen && (
        <div className="sheet-back" onClick={(e) => e.target === e.currentTarget && setAllOpen(false)} role="presentation">
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t.all} style={{ maxWidth: 480 }}>
            <div className="sheet-body">
              <div className="sheet-sub">{t.all}</div>
              <div className="allcat-list">
                {cats.map((c, i) => (
                  <button key={c.key} type="button" onClick={() => goTo(c.key)}>
                    <b>{String(i + 1).padStart(2, '0')}</b>
                    <span>{catName(c)}</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>{(itemsByCat.get(c.key) || []).length}</span>
                  </button>
                ))}
              </div>
              <button className="btn" type="button" style={{ marginTop: 14, width: '100%' }} onClick={() => setAllOpen(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
