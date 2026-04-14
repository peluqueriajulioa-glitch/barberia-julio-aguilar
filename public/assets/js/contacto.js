(async ()=>{
  await App.renderHeaderFooter('contacto');
  const data = window.__BOOTSTRAP__;
  const s = data.settings;
  const mapsUrl = s.google_maps_url || 'https://www.google.com/maps/place/Barberia+Y+Peluqueria+Julio+Aguilar/@16.2482602,-92.1445427,21z/data=!4m6!3m5!1s0x858d39a379ab34a3:0xfef5cad40e5ee0e3!8m2!3d16.2482946!4d-92.1445246!16s%2Fg%2F11gy56r0h9';
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="page-hero reveal"><div class="container"><h1 class="serif">Información de <span>Contacto</span></h1></div></section>
    <section class="section">
      <div class="container contact-grid">
        <div class="grid">
          <a class="contact-card card whatsapp-card" href="${s.whatsapp_url}" target="_blank">
            <div class="contact-icon">${App.icon('whatsapp')}</div><div><h3 class="serif">WhatsApp</h3><div class="muted">${App.escape(s.contact_phone)}</div></div>
          </a>
          <a class="contact-card card" href="tel:${s.contact_phone.replace(/[^\d+]/g,'')}">
            <div class="contact-icon">${App.icon('phone')}</div><div><h3 class="serif">Teléfono</h3><div class="muted">${App.escape(s.contact_phone)}</div></div>
          </a>
          <a class="contact-card card" href="mailto:${s.contact_email}">
            <div class="contact-icon">${App.icon('mail')}</div><div><h3 class="serif">Email</h3><div class="muted">${App.escape(s.contact_email)}</div></div>
          </a>
          <a class="contact-card card" href="${mapsUrl}" target="_blank">
            <div class="contact-icon">${App.icon('map')}</div><div><h3 class="serif">Ubicación</h3><div class="muted">${App.escape(s.contact_address)}</div></div>
          </a>
        </div>
        <div class="grid">
          <form class="card panel" id="suggestionForm">
            <h2 class="serif">Envíanos un mensaje</h2>
            <label>Nombre <input name="name" placeholder="Tu nombre"></label>
            <label>Email <input name="email" placeholder="tu@email.com"></label>
            <label>Mensaje <textarea name="message" placeholder="¿En qué podemos ayudarte?"></textarea></label>
            <button class="btn btn-primary" type="submit">Enviar Mensaje</button>
          </form>
          <div class="map-box card panel"><h3 class="serif">Google Maps</h3><iframe src="${s.google_maps_embed}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
        </div>
      </div>
    </section>
  `;
  document.getElementById('suggestionForm').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await App.api('/api/public/suggestion', { method:'POST', body: JSON.stringify(Object.fromEntries(fd.entries())) });
      App.toast('Mensaje enviado'); e.target.reset();
    } catch (err) { App.toast(err.message, true); }
  };
})();