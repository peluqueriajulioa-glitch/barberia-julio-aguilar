App.renderServiceCard = (s, opts={}) => `
<article class="service-card card reveal">
  <div class="media ${s.image_url ? 'has-image' : ''}">
    ${s.featured ? '<span class="pill">Popular</span>' : ''}
    ${s.image_url ? `<img src="${s.image_url}" alt="${App.escape(s.name)}">` : ''}
  </div>
  <div class="card-body">
    <div>
      <h3 class="card-title serif">${App.escape(s.name)}</h3>
      <p class="muted card-copy">${App.escape(s.description)}</p>
    </div>
    <div class="card-line"></div>
    <div class="price-row">
      <div class="price"><strong>${App.money(s.price)}</strong></div>
      <div class="meta">${App.icon('clock')} ${s.duration_min} min</div>
    </div>
    <div class="actions-row">
      <a class="btn btn-primary" href="/agendar.html?service=${s.id}">Agendar</a>
    </div>
  </div>
</article>`;
App.renderProductCard = p => `
<article class="product-card card reveal">
  <div class="media product-alt ${p.image_url ? 'has-image' : ''}">
    <span class="pill">${App.escape(p.category)}</span>
    ${p.stock <= 0 ? '<span class="pill soldout" style="left:auto;right:16px">Agotado</span>' : ''}
    ${p.image_url ? `<img src="${p.image_url}" alt="${App.escape(p.name)}">` : ''}
  </div>
  <div class="card-body">
    <div>
      <h3 class="card-title serif">${App.escape(p.name)}</h3>
      <p class="muted card-copy">${App.escape(p.description)}</p>
    </div>
    <div class="price-row">
      <div class="price"><strong>${App.money(p.price)}</strong></div>
      ${p.stock > 0 ? `<button class="btn btn-primary add-product-btn" data-id="${p.id}">Agregar</button>` : '<span class="muted">Sin stock</span>'}
    </div>
  </div>
</article>`;
