window.App = window.App || {};
App.money = n => `$${Number(n || 0).toFixed(0)} MXN`;
App.qs = (s, el=document) => el.querySelector(s);
App.qsa = (s, el=document) => [...el.querySelectorAll(s)];
App.el = (tag, cls='', html='') => { const e=document.createElement(tag); if(cls) e.className=cls; if(html!==undefined) e.innerHTML=html; return e; };
App.escape = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
App.nl2p = txt => String(txt || '').split(/\n+/).map(x=>x.trim()).filter(Boolean).map(p=>`<p>${App.escape(p)}</p>`).join('');
App.icons = {
  brand_scissors: `<img src="/assets/img/brand-scissors-gold.png" alt="" />`,
  whatsapp: `<img src="/assets/img/whatsapp-logo.png" alt="WhatsApp" />`,
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 1.9A3.9 3.9 0 0 0 3.9 7.8v8.4a3.9 3.9 0 0 0 3.9 3.9h8.4a3.9 3.9 0 0 0 3.9-3.9V7.8a3.9 3.9 0 0 0-3.9-3.9H7.8zm8.95 1.45a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.9A3.1 3.1 0 1 0 12 15a3.1 3.1 0 0 0 0-6.2z" fill="currentColor"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.64 21v-7.8h2.62l.39-3.04h-3.01V8.23c0-.88.24-1.49 1.51-1.49H16.8V4.02c-.28-.04-1.24-.12-2.35-.12-2.33 0-3.93 1.42-3.93 4.04v2.22H7.87v3.04h2.65V21h3.12z" fill="currentColor"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.8 3c.32 1.76 1.38 3.06 3.08 3.97.76.4 1.47.58 2.12.65v2.86a8.52 8.52 0 0 1-3.46-1.08v5.59a5.99 5.99 0 0 1-10.23 4.24A5.95 5.95 0 0 1 10.56 9v2.96a3.1 3.1 0 1 0 2.89 3.08V3h1.35z" fill="currentColor"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM3 4h2.1l1.32 7.08a2 2 0 0 0 1.97 1.62h7.83a2 2 0 0 0 1.95-1.56l1.12-4.62H7.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5c0 7.18 5.82 13 13 13h1.2a1.3 1.3 0 0 0 1.3-1.3v-2.4a1.3 1.3 0 0 0-1.1-1.28l-2.58-.37a1.3 1.3 0 0 0-1.19.44l-.57.64a10.6 10.6 0 0 1-4.79-4.79l.64-.57a1.3 1.3 0 0 0 .44-1.19L10.48 5.1A1.3 1.3 0 0 0 9.2 4H6.8a1.3 1.3 0 0 0-1.3 1.3v.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 8 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`
};
App.icon = name => `<span class="icon icon-${name}">${App.icons[name] || ''}</span>`;
App.api = async (url, opts={}) => {
  const res = await fetch(url, {
    headers: { ...(opts.body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(opts.headers || {}) },
    ...opts
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data.error || data || 'Error');
  return data;
};
App.toast = (msg, bad=false) => {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = App.el('div'); box.id='toast-box';
    box.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99;display:grid;gap:10px';
    document.body.appendChild(box);
  }
  const item = App.el('div','card');
  item.style.padding='14px 18px';
  item.style.borderColor = bad ? 'rgba(224,65,65,.35)' : 'rgba(228,165,47,.28)';
  item.style.background = bad ? 'rgba(224,65,65,.12)' : 'rgba(228,165,47,.10)';
  item.textContent = msg;
  box.appendChild(item);
  setTimeout(()=> item.remove(), 3200);
};
App.dateYmd = d => {
  const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,10);
};
App.addDays = (d, days) => { const n = new Date(d); n.setDate(n.getDate()+days); return n; };
App.dowShort = ymd => ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(`${ymd}T12:00:00`).getDay()];
App.monthShort = ymd => ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][new Date(`${ymd}T12:00:00`).getMonth()];

App.stars = n => '<span class="stars">' + '★'.repeat(Math.max(1, Math.min(5, Number(n||5)))) + '</span>';
