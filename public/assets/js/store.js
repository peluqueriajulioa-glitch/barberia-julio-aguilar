
window.App = window.App || {};
App.store = {
  get(key, fallback){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); },
  remove(key){ localStorage.removeItem(key); }
};
App.cart = {
  key: 'ja_cart_products',
  get(){ return App.store.get(this.key, []); },
  set(items){ App.store.set(this.key, items); document.dispatchEvent(new CustomEvent('cart:updated')); },
  add(product, qty=1){
    const items = this.get();
    const found = items.find(x => x.product_id === product.id);
    if (found) found.qty += qty;
    else items.push({ product_id: product.id, name: product.name, price: product.price, qty });
    this.set(items);
  },
  update(product_id, qty){
    let items = this.get().map(x => x.product_id === product_id ? { ...x, qty } : x).filter(x => x.qty > 0);
    this.set(items);
  },
  clear(){ this.set([]); },
  count(){ return this.get().reduce((a,b)=> a + Number(b.qty||0), 0); },
  total(){ return this.get().reduce((a,b)=> a + Number(b.price)*Number(b.qty||0), 0); }
};
App.bookingDraft = {
  key:'ja_booking_draft',
  get(){ return App.store.get(this.key, {}); },
  set(v){ App.store.set(this.key, { ...this.get(), ...v }); },
  clear(){ App.store.remove(this.key); }
};
