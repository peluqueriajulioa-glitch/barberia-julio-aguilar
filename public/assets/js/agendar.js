(async ()=>{
  await App.renderHeaderFooter('agendar');
  const data = window.__BOOTSTRAP__;
  const services = data.services;
  const products = data.products.filter(p => p.stock > 0);
  const blockedPeriods = (data.blocked_periods || []).filter(x => Number(x.active) === 1);
  const isDateBlocked = (ymd) => blockedPeriods.some(b => ymd >= b.start_date && ymd <= b.end_date);
  const params = new URLSearchParams(location.search);
  const preService = Number(params.get('service') || 0);
  const main = document.querySelector('main');
  main.innerHTML = `
    <section class="page-hero reveal">
      <div class="container"><h1 class="serif">Agenda tu <span>Experiencia</span></h1></div>
    </section>
    <div class="steps">
      <div class="step-item active" data-step="1"><div class="step-badge">1</div><span>Servicio</span></div>
      <div class="step-item" data-step="2"><div class="step-badge">2</div><span>Fecha y Hora</span></div>
      <div class="step-item" data-step="3"><div class="step-badge">3</div><span>Tus Datos</span></div>
    </div>
    <section class="scheduler"><div class="panel card agendar-compact" id="agendarPanel"></div></section>
  `;
  const state = { step:1, service:services.find(s => s.id === preService) || null, date:null, time:null, qtySlots:1, products:App.cart.get().map(item => ({ ...item })), coupon_code:'', coupon_discount:0 };
  function markSteps(){ document.querySelectorAll('.step-item').forEach(item => { const n = Number(item.dataset.step); item.classList.toggle('active', n===state.step); item.classList.toggle('done', n<state.step); item.querySelector('.step-badge').textContent = n < state.step ? '✓' : n; }); }
  function serviceView(){
    const panel = document.getElementById('agendarPanel');
    panel.innerHTML = `
      <h2 class="serif center">Selecciona tu servicio</h2>
      <div class="grid grid-2 mt-3">${services.map(s => `
        <button class="service-card card" data-service="${s.id}" style="text-align:left">
          <div class="card-body"><div><h3 class="card-title serif">${App.escape(s.name)}</h3><div class="muted">${App.escape(s.description)}</div></div><div class="price-row"><div class="price"><strong>${App.money(s.price)}</strong></div><div class="meta">${App.icon('clock')} ${s.duration_min} min</div></div></div>
        </button>`).join('')}</div>`;
    panel.querySelectorAll('[data-service]').forEach(btn => btn.onclick = ()=>{ state.service = services.find(s => s.id === Number(btn.dataset.service)); state.step=2; markSteps(); timeView(); });
  }
  async function timeView(){
    const panel = document.getElementById('agendarPanel');
    const today = new Date(); const days = [...Array(14)].map((_,i) => App.dateYmd(App.addDays(today, i)));
    panel.innerHTML = `
      <h2 class="serif">Elige fecha y hora</h2>
      <label>Fecha</label><div class="date-strip mt-2" id="dateStrip"></div>
      <div class="mt-3"><label>Espacios a reservar</label><div class="chips mt-2" id="qtyChips">${[1,2,3,4,5].map(n=> `<button class="qty-btn ${n===state.qtySlots?'active':''}" data-qty="${n}">${n} espacio${n>1?'s':''}</button>`).join('')}</div></div>
      <div class="mt-3"><label>Hora</label><div class="slot-grid mt-2" id="slotGrid"></div></div>
      <div class="flex between mt-4"><button class="btn btn-dark" id="backToServices">Atrás</button><button class="btn btn-primary" id="goStep3" disabled>Continuar</button></div>`;
    const dateStrip = document.getElementById('dateStrip');
    dateStrip.innerHTML = days.map(ymd => `<button class="date-card ${state.date===ymd?'active':''} ${isDateBlocked(ymd)?'disabled':''}" data-date="${ymd}"><div class="dow">${App.dowShort(ymd)}</div><div class="day">${ymd.slice(8,10)}</div><div class="month">${App.monthShort(ymd)}</div></button>`).join('');
    function requiredBlocks(){ return Math.max(Math.ceil(Number(state.service.duration_min||30)/30), Number(state.qtySlots||1)); }
    function paintSelection(grid, startTime){
      const req = requiredBlocks();
      const btns = [...grid.querySelectorAll('.slot-btn:not(.disabled)')];
      btns.forEach(x=>x.classList.remove('active','preview'));
      if (!startTime) return;
      const all = [...grid.querySelectorAll('.slot-btn')];
      const startIndex = all.findIndex(x=>x.dataset.time===startTime);
      for (let i=0;i<req;i++) {
        const el = all[startIndex+i];
        if (el) el.classList.add(i===0?'active':'preview');
      }
    }
    async function loadSlots(ymd){
      state.date=ymd; state.time=null; document.getElementById('goStep3').disabled=true;
      dateStrip.querySelectorAll('.date-card').forEach(x=>x.classList.toggle('active', x.dataset.date===ymd));
      const data = await App.api(`/api/public/availability?date=${ymd}&service_id=${state.service.id}&qtySlots=${state.qtySlots}`);
      const grid = document.getElementById('slotGrid');
      if (data.blocked) { grid.innerHTML = `<div class="alert">No hay servicio disponible en esta fecha. ${App.escape(data.blocked.reason)}</div>`; return; }
      grid.innerHTML = data.items.map(item => `<button class="slot-btn ${item.disabled?'disabled':''}" data-time="${item.time}"><strong>${item.time}</strong></button>`).join('');
      grid.querySelectorAll('.slot-btn:not(.disabled)').forEach(btn => btn.onclick = ()=>{ state.time=btn.dataset.time; paintSelection(grid, state.time); document.getElementById('goStep3').disabled=false; });
    }
    panel.querySelectorAll('.qty-btn').forEach(btn => btn.onclick = async ()=>{ state.qtySlots=Number(btn.dataset.qty); panel.querySelectorAll('.qty-btn').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); if (state.date) await loadSlots(state.date); });
    dateStrip.querySelectorAll('.date-card:not(.disabled)').forEach(btn => btn.onclick = ()=> loadSlots(btn.dataset.date));
    document.getElementById('backToServices').onclick = ()=> { state.step=1; markSteps(); serviceView(); };
    document.getElementById('goStep3').onclick = ()=> { state.step=3; markSteps(); detailsView(); };
    const firstOpen = days.find(d => !isDateBlocked(d)) || days[0];
    if (state.date && !isDateBlocked(state.date)) loadSlots(state.date); else loadSlots(firstOpen);
  }
  function calcTotals(){ const productsTotal = state.products.reduce((a,b)=> a + b.price*b.qty, 0); const serviceTotal = Number(state.service.price) * Number(state.qtySlots || 1); const subtotal = serviceTotal + productsTotal; const total = Math.max(0, subtotal - state.coupon_discount); return { serviceTotal, productsTotal, subtotal, total }; }
  function detailsView(){
    const panel = document.getElementById('agendarPanel'); const totals = calcTotals();
    panel.innerHTML = `
      <h2 class="serif center">Tus datos</h2>
      <div class="booking-layout mt-3">
        <div class="grid">
          <div class="summary">
            <h3 class="serif">Resumen final</h3>
            <div class="summary-row"><span>Servicio</span><strong>${App.escape(state.service.name)}</strong></div>
            <div class="summary-row"><span>Fecha</span><strong>${state.date}</strong></div>
            <div class="summary-row"><span>Hora</span><strong>${state.time}</strong></div>
            <div class="summary-row"><span>Espacios</span><strong>${state.qtySlots}</strong></div>
            <div class="summary-row"><span>Servicio x ${state.qtySlots}</span><strong>${App.money(totals.serviceTotal)}</strong></div>
            ${state.products.map((p, idx) => `<div class="summary-row"><span>${App.escape(p.name)} x ${p.qty}</span><strong style="display:flex;align-items:center;gap:10px">${App.money(p.price*p.qty)} <button type="button" class="btn btn-dark mini remove-product" data-index="${idx}">Quitar</button></strong></div>`).join('')}
            <div class="coupon-box mt-2">
              <label>Cupón</label>
              <div class="flex gap-2 mt-1">
                <input id="couponCode" placeholder="Escribe tu cupón" value="${App.escape(state.coupon_code || '')}">
                <button type="button" class="btn btn-dark mini" id="applyCouponBtn">Aplicar</button>
              </div>
              <div class="muted mt-1" id="couponStatus">${state.coupon_discount ? `Descuento aplicado: ${App.money(state.coupon_discount)}` : ''}</div>
            </div>
            ${state.coupon_discount ? `<div class="summary-row"><span>Descuento</span><strong>- ${App.money(state.coupon_discount)}</strong></div>` : ''}
            <div class="summary-row total"><span>Total</span><strong>${App.money(totals.total)}</strong></div>
          </div>
          <div class="form-grid">
            <label>Nombre completo * <input id="customerName" placeholder="Tu nombre"></label>
            <label>Teléfono * <input id="customerPhone" placeholder="55 1234 5678"></label>
            <label>Email (opcional) <input id="customerEmail" placeholder="tu@email.com"></label>
            <label>Notas (opcional) <textarea id="customerNotes" placeholder="¿Alguna indicación especial?"></textarea></label>
          </div>
          <div class="alert">Respetamos tu tiempo y el de nuestros clientes. En caso de cancelación, avísanos con al menos 2 horas de anticipación.</div>
        </div>
        <aside class="summary">
          <h3 class="serif">Productos recomendados</h3>
          <div class="reco-list mt-2">
            ${products.slice(0,5).map(p => `<article class="reco-item"><strong>${App.escape(p.name)}</strong><div class="muted">${App.escape(p.description)}</div><div class="between items-center mt-1"><span class="muted">${App.money(p.price)}</span><button class="btn btn-primary mini add-reco" data-id="${p.id}">Agregar</button></div></article>`).join('')}
          </div>
        </aside>
      </div>
      <div class="flex between mt-4"><button class="btn btn-dark" id="backToTime">Atrás</button><button class="btn btn-primary" id="confirmBooking">Confirmar Cita</button></div>`;
    panel.querySelectorAll('.add-reco').forEach(btn => btn.onclick = ()=>{ const p = products.find(x => x.id === Number(btn.dataset.id)); if (!p) return; const found = state.products.find(x => x.product_id === p.id); if (found) found.qty += 1; else state.products.push({ product_id:p.id, name:p.name, price:p.price, qty:1 }); App.cart.set(state.products.map(({product_id,name,price,qty})=>({product_id,name,price,qty}))); App.toast('Producto agregado al resumen'); detailsView(); });
    panel.querySelectorAll('.remove-product').forEach(btn => btn.onclick = ()=>{ const idx = Number(btn.dataset.index); if (Number.isInteger(idx) && state.products[idx]) { state.products.splice(idx,1); App.cart.set(state.products.map(({product_id,name,price,qty})=>({product_id,name,price,qty}))); App.toast('Producto eliminado del resumen'); detailsView(); } });
    document.getElementById('applyCouponBtn').onclick = async ()=>{
      const code = document.getElementById('couponCode').value.trim().toUpperCase();
      state.coupon_code = code;
      state.coupon_discount = 0;
      const status = document.getElementById('couponStatus');
      if (!code) { status.textContent = ''; detailsView(); return; }
      try {
        const resp = await App.api('/api/public/apply-coupon', { method:'POST', body: JSON.stringify({ code, subtotal: calcTotals().subtotal }) });
        state.coupon_discount = Number(resp.discount || 0);
        status.textContent = `Descuento aplicado: ${App.money(state.coupon_discount)}`;
        detailsView();
      } catch (err) {
        state.coupon_discount = 0;
        App.toast(err.message, true);
        status.textContent = err.message;
      }
    };
    document.getElementById('backToTime').onclick = ()=> { state.step=2; markSteps(); timeView(); };
    document.getElementById('confirmBooking').onclick = async ()=>{
      const body = { service_id:state.service.id, date_ymd:state.date, time_hm:state.time, qtySlots:state.qtySlots, coupon_code:state.coupon_code, notes:document.getElementById('customerNotes').value, customer:{ name:document.getElementById('customerName').value, phone:document.getElementById('customerPhone').value, email:document.getElementById('customerEmail').value }, products:state.products };
      try { const result = await App.api('/api/public/book', { method:'POST', body: JSON.stringify(body) }); App.bookingDraft.clear(); App.cart.clear(); panel.innerHTML = `<div class="center"><h2 class="serif">Cita confirmada</h2><p class="muted">Tu folio es <strong>${result.booking.folio}</strong></p><div class="summary mt-3"><div class="summary-row"><span>Servicio</span><strong>${App.escape(result.booking.service_name)}</strong></div><div class="summary-row"><span>Fecha</span><strong>${result.booking.date_ymd}</strong></div><div class="summary-row"><span>Hora</span><strong>${result.booking.start_time}</strong></div><div class="summary-row total"><span>Total</span><strong>${App.money(result.booking.total)}</strong></div></div><a class="btn btn-primary mt-3" href="/index.html">Volver al inicio</a></div>`; }
      catch (err) { App.toast(err.message, true); }
    };
  }
  markSteps(); if (state.service){ state.step=2; markSteps(); timeView(); } else serviceView();
})();