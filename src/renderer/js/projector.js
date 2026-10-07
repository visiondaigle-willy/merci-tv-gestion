'use strict';
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const textEl = document.querySelector('.text');
const refEl = document.querySelector('.ref');

window.api.onProjectorData(d => {
  document.body.classList.toggle('black', !!d.black);
  document.body.classList.toggle('green', d.background === 'green');
  if (d.black) return;
  const chars = d.verses.reduce((n, v) => n + v.t.length, 0);
  // taille du texte adaptée à la longueur du passage
  const size = chars < 120 ? 7 : chars < 250 ? 5.8 : chars < 450 ? 4.6 : chars < 700 ? 3.8 : chars < 1000 ? 3.1 : 2.5;
  document.documentElement.style.setProperty('--size', size * (d.scale || 1) + 'vh');
  textEl.classList.remove('idle');
  textEl.innerHTML = d.verses.map(v => (d.verses.length > 1 ? `<sup>${v.v}</sup>` : '') + esc(v.t)).join(' ');
  refEl.textContent = d.ref;
});
document.addEventListener('dblclick', () => window.api.projectorFullscreen());
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.api.projectorClose(); if (e.key === 'f' || e.key === 'F11') window.api.projectorFullscreen(); });
