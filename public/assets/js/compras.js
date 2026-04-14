
(async ()=>{
  await App.renderHeaderFooter('productos');
  const items = App.cart.get();
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="page-hero"><div class="container"><h1 class="serif">Finalizar <span>Compra</span></h1></div></section>
    <section class="section">
      <div class="container grid grid-2">
        <div class="card panel">
          <h2 class="serif">Tus productos</h2>
          <div id="checkoutItems"></div>
        </div>
        <form class="card panel" id="orderForm">
          <h2 class="serif">Tus datos</h2>
          <label>Nombre completo * <input name="name" required></label>
          <label>Teléfono * <input name="phone" required></label>
          <label>Email <input name="email"></label>
          <button class="btn btn-primary mt-3" type="submit">Enviar compra</button>
        </form>
      </div>
    </section>
  `;
  const wrap = document.getElementById('checkoutItems');
  if (!items.length) {
    wrap.innerHTML = '<div class="empty">No tienes productos en tu carrito.</div>';
  } else {
    wrap.innerHTML = items.map(i => `<div class="summary-row"><span>${App.escape(i.name)} x ${i.qty}</span><strong>${App.money(i.price*i.qty)}</strong></div>`).join('') +
      `<div class="summary-row total mt-2"><span>Total</span><strong>${App.money(App.cart.total())}</strong></div>`;
  }
  document.getElementById('orderForm').onsubmit = async e => {
    e.preventDefault();
    if (!items.length) return App.toast('Tu carrito está vacío', true);
    const fd = new FormData(e.target);
    try {
      await App.api('/api/public/order-products', {
        method:'POST',
        body: JSON.stringify({ customer: Object.fromEntries(fd.entries()), items })
      });
      App.cart.clear();
      App.toast('Compra enviada correctamente');
      location.href = '/index.html';
    } catch (err) { App.toast(err.message, true); }
  };
})();
