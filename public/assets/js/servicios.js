(async ()=>{
  await App.renderHeaderFooter('servicios');
  const { services, reviews } = window.__BOOTSTRAP__;
  const categories = [...new Set(services.map(s => s.category))];
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="page-hero reveal">
      <div class="container">
        <span class="badge">Servicios & precios</span>
        <h1 class="serif">Nuestros <span>Servicios</span></h1>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="chips animated" id="categoryChips"></div>
        <div id="serviceSections" class="mt-4 switch-sections"></div>
      </div>
    </section>
    <section class="section reveal">
      <div class="container review-grid">
        <div>
          <h2 class="serif" style="font-size:clamp(34px,4vw,54px)">Reseñas reales</h2>
          <div class="review-list mt-3" id="servicesReviews"></div>
        </div>
        <form class="card panel" id="servicesReviewForm">
          <h3 class="serif">Evalúa tu visita</h3>
          <label>Nombre <input name="name" placeholder="Tu nombre" required></label>
          <label>Calificación<select name="rating"><option value="5">5 estrellas</option><option value="4">4 estrellas</option><option value="3">3 estrellas</option><option value="2">2 estrellas</option><option value="1">1 estrella</option></select></label>
          <label>Comentario <textarea name="message" placeholder="Cuéntanos tu experiencia" required></textarea></label>
          <button class="btn btn-primary" type="submit">Enviar reseña</button>
        </form>
      </div>
    </section>
  `;
  const chips = document.getElementById('categoryChips');
  chips.innerHTML = ['Todos', ...categories].map((c,i)=> `<button class="chip ${i===0?'active':''}" data-cat="${c}">${c}</button>`).join('');
  const sections = document.getElementById('serviceSections');
  const render = (filter='Todos') => {
    const cats = filter === 'Todos' ? categories : [filter];
    App.switcher(sections, cats.map(cat => `
      <section class="mt-4 reveal">
        <h2 class="serif" style="font-size:clamp(32px,4vw,58px)">${App.escape(cat)}</h2>
        <div class="grid grid-3 mt-2">${services.filter(s => s.category===cat).map(s => App.renderServiceCard(s)).join('')}</div>
      </section>`).join(''));
  };
  render();
  chips.querySelectorAll('.chip').forEach(chip => chip.onclick = ()=> {
    chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    chip.classList.add('active');
    render(chip.dataset.cat);
  });
  document.getElementById('servicesReviews').innerHTML = (reviews||[]).slice(0,6).map(r => `<article class="review-card"><div class="review-stars">${App.stars(r.rating)}</div><p>“${App.escape(r.message)}”</p><strong>${App.escape(r.author_name)}</strong></article>`).join('') || '<div class="muted">Aún no hay reseñas publicadas.</div>';
  document.getElementById('servicesReviewForm').onsubmit = async e => { e.preventDefault(); try { await App.api('/api/public/review', { method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); App.toast('Gracias por dejar tu reseña'); e.target.reset(); } catch (err) { App.toast(err.message, true); } };
})();
