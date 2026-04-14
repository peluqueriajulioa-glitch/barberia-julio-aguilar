(async ()=>{
  await App.renderHeaderFooter('index');
  const data = window.__BOOTSTRAP__;
  const s = data.settings;
  const main = document.querySelector('main');
  document.documentElement.style.setProperty('--hero-bg', `url('${s.hero_image_url || '/assets/img/hero-default.svg'}')`);
  const formatDmy = d => { const [y,m,day]=String(d||'').split('-'); return day&&m&&y ? `${day}-${m}-${y}` : d; };
  const noticeHtml = data.notice ? `<div class="hero-notice"><strong>Aviso importante</strong><div>Del ${formatDmy(data.notice.start_date)} al ${formatDmy(data.notice.end_date)} no habrá servicio por el siguiente motivo:</div><div class="mt-1">${App.escape(data.notice.reason)}</div><div class="mt-1">Disculpa las molestias y gracias por tu comprensión.</div></div>` : '';
  main.innerHTML = `
    <section class="hero">
      <div class="container hero-card reveal">
        ${noticeHtml}
        <span class="badge">Barbershop Premium</span>
        <h1 class="serif">Peluquería <span>${App.escape(s.business_name)}</span></h1>
        <p>${App.escape(s.slogan)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/agendar.html"><span>Agendar Cita</span></a>
          <a class="btn btn-green" href="${s.whatsapp_url}" target="_blank">${App.icon('whatsapp')}<span>WhatsApp</span></a>
        </div>
      </div>
    </section>
    <section class="section-lg reveal">
      <div class="container center">
        <span class="badge">Servicios & Precios</span>
        <h2 class="serif" style="font-size:clamp(44px,6vw,86px)">Nuestros <span style="color:var(--gold)">Servicios</span></h2>
        <div class="grid grid-3 mt-4" id="homeServices"></div>
      </div>
    </section>
    <section class="section reveal">
      <div class="container center">
        <span class="badge">Selección premium</span>
        <h2 class="serif" style="font-size:clamp(40px,5vw,70px)">Productos <span style="color:var(--gold)">Destacados</span></h2>
        <div class="grid grid-3 mt-4" id="homeProducts"></div>
      </div>
    </section>
    <section class="section reveal">
      <div class="container review-grid">
        <div>
          <span class="badge">Reseñas</span>
          <h2 class="serif" style="font-size:clamp(36px,5vw,64px)">Lo que dicen nuestros clientes</h2>
          <div class="review-list mt-3" id="homeReviews"></div>
        </div>
        <form class="card panel" id="homeReviewForm">
          <h3 class="serif">Deja tu reseña</h3>
          <label>Nombre <input name="name" placeholder="Tu nombre" required></label>
          <label>Calificación<select name="rating"><option value="5">5 estrellas</option><option value="4">4 estrellas</option><option value="3">3 estrellas</option><option value="2">2 estrellas</option><option value="1">1 estrella</option></select></label>
          <label>Comentario <textarea name="message" placeholder="Cuéntanos tu experiencia" required></textarea></label>
          <button class="btn btn-primary" type="submit">Enviar reseña</button>
        </form>
      </div>
    </section>
  `;
  const services = data.services.slice(0,6);
  const products = data.products.slice(0,3);
  document.getElementById('homeServices').innerHTML = services.map(s => App.renderServiceCard(s,{compact:true})).join('');
  document.getElementById('homeProducts').innerHTML = products.map(App.renderProductCard).join('');
  document.querySelectorAll('.add-product-btn').forEach(btn => btn.onclick = ()=>{
    const p = products.find(x => x.id === Number(btn.dataset.id));
    if (!p) return;
    App.cart.add(p,1);
    App.toast('Producto agregado al carrito');
  });
  document.getElementById('homeReviews').innerHTML = (data.reviews||[]).slice(0,6).map(r => `<article class="review-card"><div class="review-stars">${App.stars(r.rating)}</div><p>“${App.escape(r.message)}”</p><strong>${App.escape(r.author_name)}</strong></article>`).join('') || '<div class="muted">Aún no hay reseñas publicadas.</div>';
  document.getElementById('homeReviewForm').onsubmit = async e => { e.preventDefault(); try { await App.api('/api/public/review', { method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); App.toast('Gracias por compartir tu experiencia'); e.target.reset(); } catch (err) { App.toast(err.message, true); } };
})();
