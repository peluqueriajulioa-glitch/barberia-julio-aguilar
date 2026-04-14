(async ()=>{
  await App.renderHeaderFooter('productos');
  const { products } = window.__BOOTSTRAP__;
  const categories = ['Todos', ...new Set(products.map(p => p.category))];
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="page-hero reveal">
      <div class="container">
        <span class="badge">Productos & cuidado</span>
        <h1 class="serif">Productos <span>Premium</span></h1>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="chips animated" id="productChips"></div>
        <div class="grid grid-3 mt-4 switch-sections" id="productsGrid"></div>
      </div>
    </section>
  `;
  const chips = document.getElementById('productChips');
  const grid = document.getElementById('productsGrid');
  chips.innerHTML = categories.map((c,i)=> `<button class="chip ${i===0?'active':''}" data-cat="${c}">${c}</button>`).join('');
  const render = (cat='Todos') => {
    App.switcher(grid, products.filter(p => cat === 'Todos' || p.category === cat).map(App.renderProductCard).join(''));
    setTimeout(()=>{
      grid.querySelectorAll('.add-product-btn').forEach(btn => btn.onclick = ()=> {
        const p = products.find(x => x.id === Number(btn.dataset.id));
        if (!p) return;
        App.cart.add(p,1);
        App.toast('Producto agregado al carrito');
      });
    }, 170);
  };
  render();
  chips.querySelectorAll('.chip').forEach(chip => chip.onclick = ()=> {
    chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
    chip.classList.add('active');
    render(chip.dataset.cat);
  });
})();