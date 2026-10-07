'use strict';
/* Utilitaires partagés (formatage, dates, échappement). */
const U = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const num = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const money = v => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(num(v))).replace(/ | /g, ' ') + ' FCFA';
  const int = v => new Intl.NumberFormat('fr-FR').format(num(v)).replace(/ | /g, ' ');
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const parse = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const date = s => { const d = parse(s); return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };
  const dateLong = s => { const d = parse(s); return d ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
  const monthKey = s => (s || '').slice(0, 7);
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const monthLabel = key => { if (!key) return ''; const [y, m] = key.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfWeek = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
  // Numéro de semaine ISO 8601
  const isoWeek = d => {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return { year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / 86400000 + 1) / 7) };
  };
  const now = () => new Date().toISOString();
  const csvCell = v => { const s = String(v ?? ''); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const toCSV = rows => rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sum = (arr, f) => arr.reduce((a, x) => a + num(typeof f === 'function' ? f(x) : x[f]), 0);
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  return { esc, uid, num, money, int, pad, iso, today, parse, date, dateLong, monthKey, monthLabel, MONTHS, addDays, startOfWeek, isoWeek, now, toCSV, norm, sum, h };
})();
