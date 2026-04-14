window.App = window.App || {};
App.renderHeaderFooter = async (page) => {
  const data = await App.api('/api/public/bootstrap');
  window.__BOOTSTRAP__ = data;
  const s = data.settings;
  document.title = `${s.business_name} | ${page[0].toUpperCase()+page.slice(1)}`;
  const links = [
    ['index','Inicio','/index.html'],
    ['servicios','Servicios','/servicios.html'],
    ['productos','Productos','/productos.html'],
    ['agendar','Agendar','/agendar.html'],
    ['contacto','Contacto','/contacto.html']
  ];
  const header = `
  <header class="site-header" id="siteHeader">
    <div class="container header-shell">
      <div class="row top-row">
        <a class="brand" href="/index.html">
          <div class="brand-mark">${App.icon('brand_scissors')}</div>
          <div class="brand-stack"><strong>${App.escape(s.business_name)}</strong><span>${App.escape(s.business_subtitle)}</span></div>
        </a>
        <nav class="nav">${links.map(([k,l,u]) => `<a class="${page===k?'active':''}" href="${u}">${l}</a>`).join('')}</nav>
        <a class="btn btn-primary btn-icon header-cta" href="/agendar.html"><span>Agendar Cita</span></a>
      </div>
      <nav class="mobile-inline-nav">${links.map(([k,l,u]) => `<a class="${page===k?'active':''}" href="${u}">${l}</a>`).join('')}</nav>
    </div>
  </header>`;
  const footer = `
  <footer class="footer reveal">
    <div class="container footer-grid">
      <div>
        <a class="brand" href="/index.html">
          <div class="brand-mark">${App.icon('brand_scissors')}</div>
          <div class="brand-stack"><strong>${App.escape(s.business_name)}</strong><span>${App.escape(s.business_subtitle)}</span></div>
        </a>
        <p class="muted mt-2">${App.escape(s.slogan)}</p>
        <div class="socials mt-2">
          <a class="social" href="${s.instagram_url}" target="_blank" aria-label="Instagram">${App.icon('instagram')}</a>
          <a class="social" href="${s.facebook_url}" target="_blank" aria-label="Facebook">${App.icon('facebook')}</a>
          <a class="social" href="${s.tiktok_url}" target="_blank" aria-label="TikTok">${App.icon('tiktok')}</a>
        </div>
      </div>
      <div>
        <h3 class="serif">Enlaces</h3>
        <div class="grid small-links">
          <a href="/servicios.html">Servicios</a>
          <a href="/productos.html">Productos</a>
          <a href="/agendar.html">Agendar Cita</a>
          <a href="/politicas.html">Políticas</a>
        </div>
      </div>
      <div>
        <h3 class="serif">Contacto</h3>
        <div class="grid small-links">
          <a href="tel:${s.contact_phone.replace(/[^\d+]/g,'')}">${App.escape(s.contact_phone)}</a>
          <a href="mailto:${s.contact_email}">${App.escape(s.contact_email)}</a>
          <a href="${s.google_maps_url || '#'}" target="_blank">${App.escape(s.contact_address)}</a>
        </div>
      </div>
    </div>
    <div class="container bottom-bar">
      <span>© 2026 Peluquería Julio Aguilar. Todos los derechos reservados.</span>
      <div class="flex gap-1"><a href="/politicas.html">Políticas</a><a href="/admin.html">Admin</a></div>
    </div>
  </footer>`;
  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer);
  let lastY = 0;
  const siteHeader = document.getElementById('siteHeader');
  window.addEventListener('scroll', ()=> {
    const y = window.scrollY;
    siteHeader.classList.toggle('hide', y > lastY && y > 120);
    lastY = y;
  }, { passive:true });
  document.addEventListener('DOMContentLoaded', ()=>document.body.classList.add('page-ready'));
  requestAnimationFrame(()=> document.body.classList.add('page-ready'));
  App.mountCart();
};
App.mountCart = async () => {
  if (document.body.dataset.noCart === '1') return;
  const wrap = App.el('div','floating-cart');
  wrap.innerHTML = `
    <div class="cart-panel card" id="floatingCartPanel"></div>
    <button class="cart-fab" id="floatingCartButton" aria-label="Abrir carrito">${App.icon('cart')}<span class="cart-count" id="cartCount">0</span></button>
  `;
  document.body.appendChild(wrap);
  const btn = wrap.querySelector('#floatingCartButton');
  const panel = wrap.querySelector('#floatingCartPanel');
  btn.onclick = ()=> {
    panel.classList.toggle('open');
    App.renderCartPanel();
  };
  document.addEventListener('cart:updated', App.renderCartPanel);
  App.renderCartPanel();
};
App.renderCartPanel = () => {
  const panel = document.getElementById('floatingCartPanel');
  const count = document.getElementById('cartCount');
  if (!panel || !count) return;
  const items = App.cart.get();
  count.textContent = App.cart.count();
  if (!items.length) {
    panel.innerHTML = `<div class="empty">Tu carrito está vacío.</div>`;
    return;
  }
  panel.innerHTML = `
    <h3 class="serif">Carrito</h3>
    ${items.map(item => `
      <div class="cart-item">
        <div>
          <strong>${App.escape(item.name)}</strong>
          <div class="muted">${App.money(item.price)} x ${item.qty}</div>
        </div>
        <div class="cart-item-actions">
          <button class="btn btn-dark mini" data-act="minus" data-id="${item.product_id}">-</button>
          <button class="btn btn-dark mini" data-act="plus" data-id="${item.product_id}">+</button>
          <button class="btn btn-dark mini" data-act="del" data-id="${item.product_id}">×</button>
        </div>
      </div>`).join('')}
    <div class="summary-row total mt-2"><span>Total</span><strong>${App.money(App.cart.total())}</strong></div>
    <div class="grid mt-2">
      <a class="btn btn-primary" href="/agendar.html">Agendar un servicio</a>
      <a class="btn btn-dark" href="/compras.html">Pagar solo productos</a>
      <button class="btn btn-ghost" id="clearCartBtn">Vaciar carrito</button>
    </div>
  `;
  panel.querySelectorAll('[data-act]').forEach(btn => btn.onclick = ()=> {
    const id = Number(btn.dataset.id);
    const item = App.cart.get().find(x => x.product_id === id);
    if (!item) return;
    if (btn.dataset.act === 'plus') App.cart.update(id, item.qty + 1);
    if (btn.dataset.act === 'minus') App.cart.update(id, item.qty - 1);
    if (btn.dataset.act === 'del') App.cart.update(id, 0);
  });
  const clearBtn = panel.querySelector('#clearCartBtn');
  if (clearBtn) clearBtn.onclick = ()=> App.cart.clear();
};
App.switcher = (container, html) => {
  container.classList.add('switch-out');
  setTimeout(()=> {
    container.innerHTML = html;
    container.classList.remove('switch-out');
    container.classList.add('switch-in');
    setTimeout(()=>container.classList.remove('switch-in'), 380);
  }, 160);
};
