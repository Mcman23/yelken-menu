export const LANGS = ['az', 'ru', 'en'];
const KEY = 'yelken_lang';
export function initialLang() {
  try { const s = localStorage.getItem(KEY); if (LANGS.includes(s)) return s; } catch {}
  return 'az';
}
export function saveLang(l) { try { localStorage.setItem(KEY, l); } catch {} document.documentElement.lang = l; }

export const T = {
  az: {
    search: 'Axtar', searchPh: 'Yemək axtar…', clear: 'Təmizlə', categories: 'Bölmələr', all: 'Bütün bölmələr', close: 'Bağla',
    nothing: 'Heç nə tapılmadı', nothingHint: 'Başqa söz yoxlayın və ya axtarışı sıfırlayın.', reset: 'Axtarışı sıfırla',
    results: 'Nəticələr', back: 'Menyuya qayıt', unavailable: 'Hazırda mövcud deyil', variants: 'Variantlar', ingredients: 'Tərkib',
    note: 'Qeyd', loading: 'Yüklənir…', error: 'Menyunu yükləmək mümkün olmadı', retry: 'Yenidən cəhd et', empty: 'Menyu hələ doldurulmayıb',
    serviceFee: 'Servis haqqı', portion: 'Porsiya', call: 'Zəng et', whatsapp: 'WhatsApp', map: 'Xəritə', lang: 'Dil',
    details: 'Ətraflı', scrollTop: 'Yuxarı',
  },
  ru: {
    search: 'Поиск', searchPh: 'Найти блюдо…', clear: 'Очистить', categories: 'Разделы', all: 'Все разделы', close: 'Закрыть',
    nothing: 'Ничего не найдено', nothingHint: 'Попробуйте другое слово или сбросьте поиск.', reset: 'Сбросить поиск',
    results: 'Результаты', back: 'Назад к меню', unavailable: 'Временно недоступно', variants: 'Варианты', ingredients: 'Состав',
    note: 'Примечание', loading: 'Загрузка…', error: 'Не удалось загрузить меню', retry: 'Повторить', empty: 'Меню пока не заполнено',
    serviceFee: 'Сервисный сбор', portion: 'Порция', call: 'Позвонить', whatsapp: 'WhatsApp', map: 'Карта', lang: 'Язык',
    details: 'Подробнее', scrollTop: 'Наверх',
  },
  en: {
    search: 'Search', searchPh: 'Search dishes…', clear: 'Clear', categories: 'Sections', all: 'All sections', close: 'Close',
    nothing: 'Nothing found', nothingHint: 'Try another word or reset the search.', reset: 'Reset search',
    results: 'Results', back: 'Back to menu', unavailable: 'Currently unavailable', variants: 'Options', ingredients: 'Ingredients',
    note: 'Note', loading: 'Loading…', error: 'Could not load the menu', retry: 'Try again', empty: 'The menu has not been filled in yet',
    serviceFee: 'Service charge', portion: 'Portion', call: 'Call', whatsapp: 'WhatsApp', map: 'Map', lang: 'Language',
    details: 'Details', scrollTop: 'Top',
  },
};

// Pick the localized field; fall back to Azerbaijani, never empty.
export const L = (o, base, lang) => {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return (o && ((lang !== 'az' && o[base + cap(lang)]) || o[base + 'Az'])) || '';
};

// Diacritic-insensitive normalisation incl. Azerbaijani + Turkish letters + Cyrillic ё.
const MAP = { 'ə': 'e', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ü': 'u', 'ş': 's', 'ç': 'c', 'ğ': 'g', 'ё': 'е' };
export function norm(s) {
  return String(s || '')
    .replace(/[əıİöüşçğё]/gi, (c) => MAP[c] || MAP[c.toLowerCase()] || c)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s/]+/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Money: keep 2.50 as 2.50; show integers without trailing .00 only when exact.
export function money(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return `${s} ₼`;
}
