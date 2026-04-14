(async ()=>{
  await App.renderHeaderFooter('contacto');
  const { settings } = window.__BOOTSTRAP__;
  document.querySelector('main').innerHTML = `
    <section class="page-hero reveal"><div class="container"><h1 class="serif">Políticas</h1></div></section>
    <section class="section"><div class="container"><article class="card panel reveal">${App.nl2p(settings.policies_text || '')}</article></div></section>
  `;
})();