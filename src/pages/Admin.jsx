import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { admin, getToken, setToken } from '../lib/api.js';
import { makeImage } from '../lib/imaging.js';
import { money } from '../lib/i18n.js';

const TABS = [
  ['items', 'Блюда'],
  ['cats', 'Категории'],
  ['settings', 'Настройки'],
  ['review', 'На уточнение'],
  ['export', 'Экспорт'],
  ['security', 'Доступ'],
];

const emptyItem = (cat) => ({
  itemId: '', categoryKey: cat || '', sortOrder: 999, visible: true, available: true,
  priceRaw: '', portion: '', nameAz: '', nameRu: '', nameEn: '', descAz: '', descRu: '', descEn: '',
  noteAz: '', noteRu: '', noteEn: '', imageKey: '', imageUrl: '', thumbUrl: '', focusX: 50, focusY: 50,
  needsReview: false, reviewNote: '',
});

function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{label}</span>
      {children}
      {hint ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{hint}</span> : null}
    </label>
  );
}
const input = { width: '100%', padding: '10px 11px', border: '1px solid var(--border)', borderRadius: 9, background: '#fff' };

export default function Admin() {
  const [phase, setPhase] = useState('checking'); // checking | setup | login | ready
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('items');
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [vars, setVars] = useState([]);
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    admin('status')
      .then((s) => setPhase(s.setupDone ? (getToken() ? 'ready' : 'login') : 'setup'))
      .catch(() => setPhase('login'));
    const onLogout = () => setPhase('login');
    window.addEventListener('admin-logout', onLogout);
    return () => window.removeEventListener('admin-logout', onLogout);
  }, []);

  const reload = useCallback(async () => {
    const d = await admin('load');
    setData(d);
    setPhase('ready');
    return d;
  }, []);

  useEffect(() => { if (phase === 'ready' && !data) reload().catch(() => setPhase('login')); }, [phase, data, reload]);

  async function submitAuth(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusy(true); setErr('');
    try {
      const body = phase === 'setup'
        ? { email: f.get('email'), password: f.get('password'), setupCode: f.get('setupCode') }
        : { email: f.get('email'), password: f.get('password') };
      const r = await admin(phase === 'setup' ? 'setup' : 'login', body);
      setToken(r.token);
      await reload();
    } catch (ex) {
      setErr({
        bad_setup_code: 'Неверный код первичной настройки.',
        invalid_credentials: 'Неверная почта или пароль.',
        weak_password: 'Пароль слишком короткий: минимум 10 символов.',
        bad_email: 'Проверьте адрес почты.',
        locked: 'Слишком много попыток. Вход заблокирован на 15 минут.',
        not_setup: 'Первый администратор ещё не создан.',
        already_setup: 'Администратор уже создан. Войдите.',
      }[ex.message] || 'Ошибка: ' + ex.message);
    } finally { setBusy(false); }
  }

  const cats = useMemo(() => (data?.categories || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)), [data]);
  const catName = (key) => (cats.find((c) => c.key === key)?.nameAz) || key;

  async function saveItem() {
    setBusy(true);
    try {
      const payload = { data: { ...form, price: form.price === '' || form.price === null ? null : Number(form.price) }, variants: vars };
      await admin('saveItem', { id: editing?.id, ...payload });
      await reload();
      setForm(null); setEditing(null); flash('Сохранено');
    } catch (ex) { flash('Ошибка: ' + ex.message); } finally { setBusy(false); }
  }

  async function uploadPhoto(file) {
    if (!file) return;
    setBusy(true);
    try {
      const fx = Number(form.focusX ?? 50), fy = Number(form.focusY ?? 50);
      const key = form.itemId || 'new';
      const full = await makeImage(file, 1600, fx, fy, 0.82);
      const thumb = await makeImage(file, 480, fx, fy, 0.8);
      const u1 = await admin('uploadImage', { dataBase64: full, mime: 'image/jpeg', kind: 'full', name: key });
      const u2 = await admin('uploadImage', { dataBase64: thumb, mime: 'image/jpeg', kind: 'thumb', name: key });
      setForm((f) => ({ ...f, imageUrl: u1.url, thumbUrl: u2.url }));
      flash('Фото загружено. Нажмите «Сохранить».');
    } catch (ex) { flash('Ошибка загрузки: ' + ex.message); } finally { setBusy(false); }
  }

  async function removeItem() {
    if (!editing?.id || !window.confirm('Удалить блюдо из меню?')) return;
    setBusy(true);
    try { await admin('deleteItem', { id: editing.id }); await reload(); setForm(null); setEditing(null); flash('Удалено'); }
    catch (ex) { flash('Ошибка: ' + ex.message); } finally { setBusy(false); }
  }

  async function moveItem(item, dir) {
    const list = data.items.filter((i) => i.categoryKey === item.categoryKey).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const i = list.findIndex((x) => x.id === item.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await admin('reorderItems', { order: list.map((x, n) => ({ id: x.id, sortOrder: n + 1 })) });
    await reload();
  }

  async function saveCat(cat) {
    setBusy(true);
    try { await admin('saveCategory', { id: cat.id, data: cat }); await reload(); flash('Сохранено'); }
    catch (ex) { flash(ex.message === 'duplicate_key' ? 'Такой ключ уже есть' : 'Ошибка: ' + ex.message); } finally { setBusy(false); }
  }
  async function addCat() {
    setBusy(true);
    try {
      await admin('saveCategory', { data: { key: 'cat-' + Date.now().toString(36), nameAz: 'Новая категория', nameRu: 'Новый раздел', nameEn: 'New section', sortOrder: cats.length + 1, visible: true } });
      await reload(); flash('Категория добавлена');
    } catch (ex) { flash('Ошибка: ' + ex.message); } finally { setBusy(false); }
  }
  async function deleteCat(cat) {
    if (!window.confirm('Удалить категорию?')) return;
    setBusy(true);
    try { await admin('deleteCategory', { id: cat.id }); await reload(); }
    catch (ex) { flash(ex.message === 'category_not_empty' ? 'В категории есть блюда — сначала перенесите их' : 'Ошибка: ' + ex.message); } finally { setBusy(false); }
  }
  async function moveCat(cat, dir) {
    const list = cats.slice();
    const i = list.findIndex((c) => c.id === cat.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await admin('reorderCategories', { order: list.map((c, n) => ({ id: c.id, sortOrder: n + 1 })) });
    await reload();
  }

  const [setDraft, setSetDraft] = useState(null);
  useEffect(() => { if (data?.settings) setSetDraft(data.settings); }, [data?.settings]);
  async function saveSettings() {
    setBusy(true);
    try { await admin('saveSettings', { data: setDraft }); await reload(); flash('Настройки сохранены'); }
    catch (ex) { flash('Ошибка: ' + ex.message); } finally { setBusy(false); }
  }
  async function uploadLogo(file) {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
      const isSvg = file.type === 'image/svg+xml';
      const b64 = String(raw).split(',')[1];
      const r = await admin('uploadImage', { dataBase64: b64, mime: isSvg ? 'image/svg+xml' : file.type || 'image/png', kind: 'logo', name: 'logo' });
      setSetDraft((s) => ({ ...s, logoUrl: r.url }));
      flash('Логотип загружен. Нажмите «Сохранить».');
    } catch (ex) { flash('Ошибка: ' + ex.message); } finally { setBusy(false); }
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportJson() {
    download('yelken-menu.json', JSON.stringify({ categories: cats, items: data.items, variants: data.variants, settings: data.settings }, null, 2), 'application/json');
  }
  function exportCsv() {
    const head = ['category', 'itemId', 'nameAz', 'nameRu', 'nameEn', 'price', 'priceRaw', 'portion', 'available', 'visible', 'reviewNote'];
    const rows = data.items.map((i) => [catName(i.categoryKey), i.itemId, i.nameAz, i.nameRu, i.nameEn,
      i.price ?? '', i.priceRaw || '', i.portion || '', i.available === false ? 'no' : 'yes', i.visible === false ? 'no' : 'yes',
      (i.reviewNote || '').replace(/\s+/g, ' ')]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    download('yelken-menu.csv', '\ufeff' + csv, 'text/csv;charset=utf-8');
  }

  async function changePassword(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    setBusy(true);
    try {
      const r = await admin('changePassword', { oldPassword: f.get('old'), newPassword: f.get('next') });
      setToken(r.token); e.target.reset(); flash('Пароль изменён. Другие сессии завершены.');
    } catch (ex) {
      flash(ex.message === 'invalid_credentials' ? 'Текущий пароль неверен' : ex.message === 'weak_password' ? 'Минимум 10 символов' : 'Ошибка: ' + ex.message);
    } finally { setBusy(false); }
  }

  function logout() { setToken(''); setPhase('login'); setData(null); }

  // ---------- auth screens ----------
  if (phase === 'checking') return <div className="loading"><div className="spinner" /></div>;
  if (phase !== 'ready') {
    const isSetup = phase === 'setup';
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <form onSubmit={submitAuth} style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
          <img src={import.meta.env.BASE_URL + "logo.svg"} alt="Yelkən" style={{ height: 40, marginBottom: 14 }} />
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{isSetup ? 'Первый администратор' : 'Вход в панель'}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 18 }}>
            {isSetup
              ? 'Введите одноразовый код настройки, свою почту и пароль (минимум 10 символов). Код хранится в записи MenuAuth в базе Base44 и после настройки удаляется.'
              : 'Доступ только для администратора ресторана.'}
          </p>
          {isSetup && (
            <Field label="Одноразовый код настройки"><input name="setupCode" style={input} autoComplete="off" required /></Field>
          )}
          <Field label="E-mail"><input name="email" type="email" style={input} autoComplete="username" required /></Field>
          <Field label="Пароль" hint={isSetup ? 'Минимум 10 символов. Пароль не хранится в открытом виде.' : ''}>
            <input name="password" type="password" style={input} autoComplete={isSetup ? 'new-password' : 'current-password'} required />
          </Field>
          {err ? <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{err}</div> : null}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? '…' : isSetup ? 'Создать администратора' : 'Войти'}</button>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
            <a href="/menu">← Вернуться к меню</a>
          </p>
        </form>
      </div>
    );
  }

  if (!data) return <div className="loading"><div className="spinner" /></div>;

  const reviewItems = data.items.filter((i) => i.needsReview);
  const filtered = data.items
    .filter((i) => !filter || `${i.nameAz} ${i.nameRu} ${i.nameEn}`.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (catName(a.categoryKey) || '').localeCompare(catName(b.categoryKey) || '') || (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 20 }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 58 }}>
          <img src={data.settings?.logoUrl || (import.meta.env.BASE_URL + 'logo.svg')} alt="Yelkən" style={{ height: 26 }} />
          <span style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--sea)' }}>Admin</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <a className="btn btn-sm" href="/menu">Меню</a>
            <button className="btn btn-sm" onClick={logout}>Выйти</button>
          </div>
        </div>
        <div className="wrap" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
          {TABS.map(([k, label]) => (
            <button key={k} className="chip" aria-current={tab === k} onClick={() => { setTab(k); setForm(null); }}>
              {label}{k === 'review' && reviewItems.length ? ` · ${reviewItems.length}` : ''}
            </button>
          ))}
        </div>
      </header>

      <div className="wrap" style={{ paddingTop: 16 }}>
        {tab === 'items' && !form && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <input placeholder="Поиск по названию" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...input, flex: '1 1 200px' }} />
              <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(emptyItem(cats[0]?.key)); setVars([]); }}>+ Блюдо</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{filtered.length} из {data.items.length}</div>
            {filtered.map((it) => (
              <div key={it.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 56, height: 42, borderRadius: 8, overflow: 'hidden', background: 'var(--cream)', flex: '0 0 auto' }}>
                  {it.thumbUrl ? <img src={it.thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : null}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nameAz}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {catName(it.categoryKey)} · {money(it.price) || it.priceRaw}
                    {it.visible === false ? ' · скрыто' : ''}{it.available === false ? ' · нет в наличии' : ''}
                    {it.needsReview ? ' · проверка' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn btn-sm" onClick={() => moveItem(it, -1)} aria-label="Выше">↑</button>
                  <button className="btn btn-sm" onClick={() => moveItem(it, 1)} aria-label="Ниже">↓</button>
                  <button className="btn btn-sm btn-primary" onClick={() => { setEditing(it); setForm({ ...it }); setVars((data.variants || []).filter((v) => v.itemId === it.itemId).map((v) => ({ ...v }))); window.scrollTo({ top: 0 }); }}>Изменить</button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'items' && form && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>{editing ? 'Редактирование блюда' : 'Новое блюдо'}</h2>
            <Field label="Категория">
              <select style={input} value={form.categoryKey} onChange={(e) => setForm({ ...form, categoryKey: e.target.value })}>
                {cats.map((c) => <option key={c.key} value={c.key}>{c.nameAz}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              <Field label="Название AZ *"><input style={input} value={form.nameAz || ''} onChange={(e) => setForm({ ...form, nameAz: e.target.value })} /></Field>
              <Field label="Название RU"><input style={input} value={form.nameRu || ''} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} /></Field>
              <Field label="Название EN"><input style={input} value={form.nameEn || ''} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
              <Field label="Цена, ₼" hint="Число. 2.50 не округляется.">
                <input style={input} type="number" step="0.01" min="0" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </Field>
              <Field label="Исходная запись цены" hint="Например 15/25 ₼">
                <input style={input} value={form.priceRaw || ''} onChange={(e) => setForm({ ...form, priceRaw: e.target.value })} />
              </Field>
              <Field label="Порция"><input style={input} value={form.portion || ''} onChange={(e) => setForm({ ...form, portion: e.target.value })} /></Field>
              <Field label="Порядок"><input style={input} type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
              <Field label="Состав AZ"><textarea style={{ ...input, minHeight: 62 }} value={form.descAz || ''} onChange={(e) => setForm({ ...form, descAz: e.target.value })} /></Field>
              <Field label="Состав RU"><textarea style={{ ...input, minHeight: 62 }} value={form.descRu || ''} onChange={(e) => setForm({ ...form, descRu: e.target.value })} /></Field>
              <Field label="Состав EN"><textarea style={{ ...input, minHeight: 62 }} value={form.descEn || ''} onChange={(e) => setForm({ ...form, descEn: e.target.value })} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={form.visible !== false} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> Видимо
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={form.available !== false} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> В наличии
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={!!form.needsReview} onChange={(e) => setForm({ ...form, needsReview: e.target.checked })} /> Требует уточнения
              </label>
            </div>
            <Field label="Комментарий к проверке"><input style={input} value={form.reviewNote || ''} onChange={(e) => setForm({ ...form, reviewNote: e.target.value })} /></Field>

            {/* photo */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>ФОТО 4:3 · точка фокуса</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - r.left) / r.width) * 100);
                    const y = Math.round(((e.clientY - r.top) / r.height) * 100);
                    setForm((f) => ({ ...f, focusX: Math.max(0, Math.min(100, x)), focusY: Math.max(0, Math.min(100, y)) }));
                  }}
                  style={{ position: 'relative', width: 240, aspectRatio: '4 / 3', background: 'var(--cream)', borderRadius: 10, overflow: 'hidden', cursor: 'crosshair' }}
                >
                  {form.imageUrl || form.thumbUrl
                    ? <img src={form.imageUrl || form.thumbUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${form.focusX ?? 50}% ${form.focusY ?? 50}%` }} />
                    : <div style={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 12, color: 'var(--muted)' }}>нет фото</div>}
                  <div style={{ position: 'absolute', left: `${form.focusX ?? 50}%`, top: `${form.focusY ?? 50}%`, width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%', border: '2px solid #fff', background: 'var(--navy)', boxShadow: '0 0 0 1px rgba(0,0,0,.3)' }} />
                </div>
                <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadPhoto(e.target.files?.[0])} />
                  <button className="btn" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>Загрузить фото</button>
                  {(form.imageUrl || form.thumbUrl) && (
                    <button className="btn btn-danger" type="button" onClick={() => setForm({ ...form, imageUrl: '', thumbUrl: '' })}>Убрать фото</button>
                  )}
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', maxWidth: 220 }}>
                    Нажмите на превью, чтобы выбрать точку фокуса. Фото сжимается до 1600 px и миниатюры 480 px.
                  </div>
                </div>
              </div>
            </div>

            {/* variants */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>ВАРИАНТЫ (если есть)</div>
              {vars.map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 6, marginBottom: 6 }}>
                  <input style={input} placeholder="AZ" value={v.labelAz || ''} onChange={(e) => setVars(vars.map((x, n) => n === i ? { ...x, labelAz: e.target.value } : x))} />
                  <input style={input} placeholder="RU" value={v.labelRu || ''} onChange={(e) => setVars(vars.map((x, n) => n === i ? { ...x, labelRu: e.target.value } : x))} />
                  <input style={input} placeholder="EN" value={v.labelEn || ''} onChange={(e) => setVars(vars.map((x, n) => n === i ? { ...x, labelEn: e.target.value } : x))} />
                  <input style={input} type="number" step="0.01" placeholder="₼" value={v.price ?? ''} onChange={(e) => setVars(vars.map((x, n) => n === i ? { ...x, price: e.target.value } : x))} />
                  <input style={input} placeholder="исходно (6 ₼)" value={v.priceRaw || ''} onChange={(e) => setVars(vars.map((x, n) => n === i ? { ...x, priceRaw: e.target.value } : x))} />
                  <button className="btn btn-sm btn-danger" type="button" onClick={() => setVars(vars.filter((_, n) => n !== i))}>×</button>
                </div>
              ))}
              <button className="btn btn-sm" type="button" onClick={() => setVars([...vars, { labelAz: '', labelRu: '', labelEn: '', price: '', priceRaw: '' }])}>+ Вариант</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={saveItem} disabled={busy || !form.nameAz}>Сохранить</button>
              <button className="btn" onClick={() => { setForm(null); setEditing(null); }}>Отмена</button>
              {editing && <button className="btn btn-danger" onClick={removeItem} style={{ marginLeft: 'auto' }}>Удалить</button>}
            </div>
          </div>
        )}

        {tab === 'cats' && (
          <>
            <button className="btn btn-primary" onClick={addCat} style={{ marginBottom: 12 }}>+ Категория</button>
            {cats.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
                  <input style={input} value={c.nameAz || ''} onChange={(e) => setData({ ...data, categories: data.categories.map((x) => x.id === c.id ? { ...x, nameAz: e.target.value } : x) })} />
                  <input style={input} value={c.nameRu || ''} onChange={(e) => setData({ ...data, categories: data.categories.map((x) => x.id === c.id ? { ...x, nameRu: e.target.value } : x) })} />
                  <input style={input} value={c.nameEn || ''} onChange={(e) => setData({ ...data, categories: data.categories.map((x) => x.id === c.id ? { ...x, nameEn: e.target.value } : x) })} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
                    <input type="checkbox" checked={c.visible !== false} onChange={(e) => setData({ ...data, categories: data.categories.map((x) => x.id === c.id ? { ...x, visible: e.target.checked } : x) })} /> видима
                  </label>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>ключ: {c.key}</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm" onClick={() => moveCat(c, -1)}>↑</button>
                    <button className="btn btn-sm" onClick={() => moveCat(c, 1)}>↓</button>
                    <button className="btn btn-sm btn-primary" onClick={() => saveCat(c)}>Сохранить</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteCat(c)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'settings' && setDraft && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
              <Field label="Название ресторана"><input style={input} value={setDraft.restaurantName || ''} onChange={(e) => setSetDraft({ ...setDraft, restaurantName: e.target.value })} /></Field>
              <Field label="Подпись (Şüvəlan)"><input style={input} value={setDraft.tagline || ''} onChange={(e) => setSetDraft({ ...setDraft, tagline: e.target.value })} /></Field>
              <Field label="Текстовая замена логотипа"><input style={input} value={setDraft.logoMark || ''} onChange={(e) => setSetDraft({ ...setDraft, logoMark: e.target.value })} /></Field>
              <Field label="Телефон" hint="Кнопка появится только после заполнения."><input style={input} value={setDraft.phone || ''} onChange={(e) => setSetDraft({ ...setDraft, phone: e.target.value })} /></Field>
              <Field label="WhatsApp"><input style={input} value={setDraft.whatsapp || ''} onChange={(e) => setSetDraft({ ...setDraft, whatsapp: e.target.value })} /></Field>
              <Field label="Instagram"><input style={input} value={setDraft.instagram || ''} onChange={(e) => setSetDraft({ ...setDraft, instagram: e.target.value })} /></Field>
              <Field label="Адрес"><input style={input} value={setDraft.address || ''} onChange={(e) => setSetDraft({ ...setDraft, address: e.target.value })} /></Field>
              <Field label="Ссылка на карту"><input style={input} value={setDraft.mapUrl || ''} onChange={(e) => setSetDraft({ ...setDraft, mapUrl: e.target.value })} /></Field>
              <Field label="Сервисный сбор, %"><input style={input} type="number" step="0.1" value={setDraft.serviceFeePercent ?? 0} onChange={(e) => setSetDraft({ ...setDraft, serviceFeePercent: e.target.value })} /></Field>
            </div>
            <Field label="Текст о сервисном сборе (AZ)"><input style={input} value={setDraft.serviceFeeNoteAz || ''} onChange={(e) => setSetDraft({ ...setDraft, serviceFeeNoteAz: e.target.value })} /></Field>
            <Field label="Текст о сервисном сборе (RU)"><input style={input} value={setDraft.serviceFeeNoteRu || ''} onChange={(e) => setSetDraft({ ...setDraft, serviceFeeNoteRu: e.target.value })} /></Field>
            <Field label="Текст о сервисном сборе (EN)"><input style={input} value={setDraft.serviceFeeNoteEn || ''} onChange={(e) => setSetDraft({ ...setDraft, serviceFeeNoteEn: e.target.value })} /></Field>
            <Field label="Примечание о рыбе (AZ)"><textarea style={{ ...input, minHeight: 54 }} value={setDraft.fishNoteAz || ''} onChange={(e) => setSetDraft({ ...setDraft, fishNoteAz: e.target.value })} /></Field>
            <Field label="Примечание о фотографиях (AZ)"><input style={input} value={setDraft.photoNoteAz || ''} onChange={(e) => setSetDraft({ ...setDraft, photoNoteAz: e.target.value })} /></Field>
            <Field label="Подвал меню (AZ)"><input style={input} value={setDraft.menuFooterAz || ''} onChange={(e) => setSetDraft({ ...setDraft, menuFooterAz: e.target.value })} /></Field>
            <Field label="Логотип" hint="SVG или PNG. Пусто — используется логотип из PDF.">
              <input type="file" accept="image/*" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </Field>
            {setDraft.logoUrl ? <img src={setDraft.logoUrl} alt="logo" style={{ height: 40, marginBottom: 10 }} /> : null}
            <button className="btn btn-primary" onClick={saveSettings} disabled={busy}>Сохранить настройки</button>
          </div>
        )}

        {tab === 'review' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Позиции, где PDF допускает разные толкования. Ничего не исправлено автоматически — решите сами и снимите галочку.
            </p>
            {reviewItems.length === 0 && <div className="empty"><h3>Всё проверено</h3></div>}
            {reviewItems.map((it) => (
              <div key={it.id} style={{ border: '1px solid var(--border)', borderLeft: '3px solid var(--navy)', background: 'var(--surface)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{it.nameAz} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>· {catName(it.categoryKey)} · {money(it.price) || it.priceRaw}</span></div>
                <div style={{ fontSize: 12.5, color: '#4A5568', margin: '6px 0 8px' }}>{it.reviewNote || 'Без комментария'}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => { setTab('items'); setEditing(it); setForm({ ...it }); setVars((data.variants || []).filter((v) => v.itemId === it.itemId)); }}>Открыть</button>
                  <button className="btn btn-sm btn-primary" onClick={async () => { await admin('saveItem', { id: it.id, data: { needsReview: false } }); await reload(); }}>Проверено</button>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'export' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Экспорт меню</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>{cats.length} категорий · {data.items.length} блюд · {(data.variants || []).length} вариантов</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={exportJson}>Скачать JSON</button>
              <button className="btn" onClick={exportCsv}>Скачать CSV</button>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, maxWidth: 480 }}>
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Смена пароля</h2>
            <form onSubmit={changePassword}>
              <Field label="Текущий пароль"><input name="old" type="password" style={input} autoComplete="current-password" required /></Field>
              <Field label="Новый пароль" hint="Минимум 10 символов"><input name="next" type="password" style={input} autoComplete="new-password" required /></Field>
              <button className="btn btn-primary" disabled={busy}>Изменить пароль</button>
            </form>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
              После смены пароля все другие сессии завершаются. Запись в базу доступна только с действующим токеном администратора.
            </p>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '10px 16px', borderRadius: 999, fontSize: 13, zIndex: 90 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
