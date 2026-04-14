document.body.classList.add('page-ready');
(async ()=>{
  document.body.dataset.noCart='1';
  const root = document.querySelector('main');
  if (!root) return;

  const tabs = ['dashboard','configuracion','servicios','productos','citas','cupones','bloqueos','resenas','lealtad'];
  const titleMap = {dashboard:'Dashboard',configuracion:'Configuración',servicios:'Servicios',productos:'Productos',citas:'Citas',cupones:'Cupones',bloqueos:'Bloqueos',resenas:'Reseñas',lealtad:'Lealtad'};

  function showError(err){
    root.innerHTML = `<section class="login-shell"><div class="card login-card"><h1 class="serif section-title">Error en Admin</h1><p class="muted">${App.escape(err?.message || String(err))}</p><button class="btn btn-primary mt-3" id="retryAdmin">Reintentar</button></div></section>`;
    const b = document.getElementById('retryAdmin');
    if (b) b.onclick = ()=> location.reload();
  }

  function showLogin(message=''){
    root.innerHTML = `<section class="login-shell"><form class="card login-card" id="adminLoginForm"><h1 class="serif section-title">Acceso Admin</h1>${message?`<p class="muted">${App.escape(message)}</p>`:''}<label>Correo autorizado<input name="email" required></label><label>Contraseña<input type="password" name="password" required></label><button class="btn btn-primary mt-3" type="submit">Entrar</button></form></section>`;
    document.getElementById('adminLoginForm').onsubmit = async e => {
      e.preventDefault();
      try {
        await App.api('/api/admin/login',{ method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) });
        location.reload();
      } catch (err) {
        App.toast(err.message, true);
        showLogin(err.message);
      }
    };
  }

  function shell(){
    root.innerHTML = `<div class="admin-layout"><aside class="admin-sidebar"><a class="brand" href="/index.html"><div class="brand-mark">${App.icon('brand_scissors')}</div><div class="brand-stack"><strong>Julio Aguilar</strong><span>BARBERSHOP PREMIUM</span></div></a><nav class="admin-nav" id="adminNav">${tabs.map(t=>`<button data-tab="${t}">${titleMap[t]}</button>`).join('')}<button id="logoutBtn">Cerrar sesión</button></nav></aside><section class="admin-main"><div id="adminContent"></div></section></div>`;
  }

  async function ensureLogin(){
    try {
      await App.api('/api/admin/overview');
      shell();
      init();
    } catch (err) {
      showLogin(err.message === 'No autorizado' ? '' : err.message);
    }
  }

  async function init(){
    const nav = document.getElementById('adminNav');
    const content = document.getElementById('adminContent');
    document.getElementById('logoutBtn').onclick = async ()=> { try { await App.api('/api/admin/logout',{method:'POST'}); } catch {} location.reload(); };

    const setActiveTab = tab => nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));

    const categoryOptions = (items=[]) => [...new Set(items.map(x => String(x.category || '').trim()).filter(Boolean))];
    const slotStep = Number((window.__BOOTSTRAP__ && window.__BOOTSTRAP__.settings && window.__BOOTSTRAP__.settings.slot_step_min) || 30);
    const timeRangeToSlots = (rangesStr='') => {
      const out = [];
      String(rangesStr).split(',').map(x=>x.trim()).filter(Boolean).forEach(part => {
        const bits = part.split('-').map(x=>x.trim());
        if (bits.length !== 2) return;
        const start = bits[0], end = bits[1];
        const toMin = hm => { const [h,m]=hm.split(':').map(Number); return h*60+m; };
        const fromMin = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
        for (let t = toMin(start); t + slotStep <= toMin(end); t += slotStep) out.push(fromMin(t));
      });
      return out;
    };
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.onclick = ()=> load(b.dataset.tab));

    async function load(tab='dashboard'){
      setActiveTab(tab);
      try {
        if (tab === 'dashboard') return renderDashboard();
        if (tab === 'configuracion') return renderConfig();
        if (tab === 'servicios') return renderServices();
        if (tab === 'productos') return renderProducts();
        if (tab === 'citas') return renderBookings();
        if (tab === 'cupones') return renderCoupons();
        if (tab === 'bloqueos') return renderBlocks();
        if (tab === 'resenas') return renderReviews();
        if (tab === 'lealtad') return renderLoyalty();
      } catch (err) {
        App.toast(err.message, true);
        content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Error</h2><p>${App.escape(err.message)}</p></section>`;
      }
    }

    async function renderDashboard(){
      const [data, b] = await Promise.all([App.api('/api/admin/overview'), App.api('/api/admin/bookings?active_only=1')]);
      const bookingCount = (b.items || []).length;
      content.innerHTML = `<div class="admin-grid">${[
        ['Citas hoy', bookingCount, 'citas'],
        ['Stock bajo', data.stats.low_stock, 'productos'],
        ['Cupones activos', data.stats.active_coupons, 'cupones'],
        ['Servicios', data.stats.services, 'servicios'],
        ['Reseñas', data.stats.reviews || 0, 'resenas']
      ].map(([t,v,go])=>`<article class="card kpi" data-go="${go}"><span>${t}</span><strong>${v}</strong></article>`).join('')}</div><section class="card panel mt-4"><h2 class="serif section-title">Citas activas</h2><div class="table-wrap" id="dashBookings"></div></section>`;
      content.querySelectorAll('[data-go]').forEach(x=>x.onclick = ()=> load(x.dataset.go));
      document.getElementById('dashBookings').innerHTML = `<table><thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Acción</th></tr></thead><tbody>${b.items.map(item=>`<tr><td>${item.date_ymd}</td><td>${item.start_time}</td><td>${App.escape(item.customer_name)}<br>${App.escape(item.customer_phone)}</td><td>${App.escape(item.service_name)}</td><td><button class="btn btn-dark mini cancel-book" data-id="${item.id}">Cancelar</button></td></tr>`).join('') || '<tr><td colspan="5">Sin citas activas.</td></tr>'}</tbody></table>`;
      content.querySelectorAll('.cancel-book').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/bookings/${btn.dataset.id}/cancel`,{method:'POST'}); renderDashboard(); });
    }

    async function renderConfig(){
      const data = await App.api('/api/admin/overview');
      const s = data.settings;
      const hours = data.hours_json;
      const exceptions = data.hours_exceptions_json || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
      const dayNames = {mon:'Lunes',tue:'Martes',wed:'Miércoles',thu:'Jueves',fri:'Viernes',sat:'Sábado',sun:'Domingo'};
      const splitRanges = ranges => {
        const arr = Array.isArray(ranges) ? ranges : [];
        return {
          s1: arr[0]?.[0] || '', e1: arr[0]?.[1] || '',
          s2: arr[1]?.[0] || '', e2: arr[1]?.[1] || ''
        };
      };
      const buildRanges = (fd, key) => {
        const out = [];
        const pairs = [[fd.get(`${key}_start_1`), fd.get(`${key}_end_1`)], [fd.get(`${key}_start_2`), fd.get(`${key}_end_2`)]];
        pairs.forEach(([a,b])=>{ if (a && b) out.push([String(a), String(b)]); });
        return out;
      };
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Configuración general</h2><form id="settingsForm" class="admin-form-grid"><label>Nombre del negocio<input name="business_name" value="${App.escape(s.business_name||'')}"></label><label>Slogan<input name="slogan" value="${App.escape(s.slogan||'')}"></label><label>Teléfono<input name="contact_phone" value="${App.escape(s.contact_phone||'')}"></label><label>Email<input name="contact_email" value="${App.escape(s.contact_email||'')}"></label><label class="full">Dirección<input name="contact_address" value="${App.escape(s.contact_address||'')}"></label><label>WhatsApp URL<input name="whatsapp_url" value="${App.escape(s.whatsapp_url||'')}"></label><label>Google Maps URL<input name="google_maps_url" value="${App.escape(s.google_maps_url||'')}"></label><label class="full">Google Maps embed<input name="google_maps_embed" value="${App.escape(s.google_maps_embed||'')}"></label><label>Instagram URL<input name="instagram_url" value="${App.escape(s.instagram_url||'')}"></label><label>Facebook URL<input name="facebook_url" value="${App.escape(s.facebook_url||'')}"></label><label>TikTok URL<input name="tiktok_url" value="${App.escape(s.tiktok_url||'')}"></label><label class="full">Políticas<textarea name="policies_text">${App.escape(s.policies_text||'')}</textarea></label><label class="full">Imagen del hero<input type="file" name="hero_image" accept="image/*"></label><div class="full"><button class="btn btn-primary" type="submit">Guardar configuración</button></div></form></section><section class="card panel mt-4"><h2 class="serif section-title">Horarios por día</h2><form id="hoursForm" class="admin-grid">${Object.entries(hours).map(([key,val])=>{ const r=splitRanges(val.ranges||[]); const slots=timeRangeToSlots((val.ranges||[]).map(x=>x.join('-')).join(', ')); const off = new Set(exceptions[key] || []); return `<article class="card day-card"><div class="between items-center"><h4 class="serif">${dayNames[key]}</h4><label class="day-toggle"><input type="checkbox" name="${key}_active" ${val.active?'checked':''}> Activo</label></div><div class="time-grid"><label>Inicio 1<input type="time" name="${key}_start_1" value="${r.s1}"></label><label>Fin 1<input type="time" name="${key}_end_1" value="${r.e1}"></label><label>Inicio 2<input type="time" name="${key}_start_2" value="${r.s2}"></label><label>Fin 2<input type="time" name="${key}_end_2" value="${r.e2}"></label></div><p class="muted">Toca solo los bloques de abajo para deshabilitar descansos, comida o cierres puntuales.</p><div class="range-preview">${slots.map(slot => `<button type="button" class="token slot-token ${off.has(slot)?'off':''}" data-day="${key}" data-slot="${slot}">${slot}</button>`).join('')}</div></article>`; }).join('')}</form><div class="mt-3"><button class="btn btn-primary" id="saveHoursBtn">Guardar horarios</button></div></section>`;
      document.getElementById('settingsForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const hero = fd.get('hero_image');
        const settings = {};
        for (const [k,v] of fd.entries()) if (k !== 'hero_image') settings[k] = v;
        await App.api('/api/admin/settings',{ method:'POST', body: JSON.stringify({ settings }) });
        if (hero && hero.size) {
          const imgFd = new FormData(); imgFd.append('hero_image', hero);
          const r = await fetch('/api/admin/assets/hero-image',{ method:'POST', body: imgFd });
          if (!r.ok) throw new Error('No se pudo subir la imagen del hero');
        }
        App.toast('Configuración guardada');
        renderConfig();
      };
      content.querySelectorAll('.slot-token').forEach(btn => btn.onclick = ()=> btn.classList.toggle('off'));
      document.getElementById('saveHoursBtn').onclick = async ()=> {
        const fd = new FormData(document.getElementById('hoursForm'));
        const out = {}; const ex = {};
        for (const key of ['mon','tue','wed','thu','fri','sat','sun']) {
          out[key] = { active: fd.get(`${key}_active`) === 'on', ranges: buildRanges(fd, key) };
          ex[key] = [...content.querySelectorAll(`.slot-token[data-day="${key}"].off`)].map(el=>el.dataset.slot);
        }
        await App.api('/api/admin/hours',{ method:'POST', body: JSON.stringify({ hours_json: out, hours_exceptions_json: ex }) });
        App.toast('Horarios actualizados');
        renderConfig();
      };
    }

    async function renderServices(){
      const data = await App.api('/api/admin/services');
      const cats = categoryOptions(data.items);
      content.innerHTML = crudSection('Servicios', data.items, [
        {name:'name',label:'Nombre'},
        {name:'description',label:'Descripción',full:true},
        {name:'price',label:'Precio',type:'number'},
        {name:'duration_min',label:'Duración',type:'number'},
        {name:'category',label:'Categoría',datalist:cats},
        {name:'active',label:'Activo',type:'select-bool'},
        {name:'featured',label:'Popular',type:'select-bool'},
        {name:'image',label:'Imagen',type:'file',full:true}
      ], 'services');
      bindCrud('/api/admin/services', renderServices, data.items);
    }

    async function renderProducts(){
      const data = await App.api('/api/admin/products');
      const cats = categoryOptions(data.items);
      content.innerHTML = crudSection('Productos', data.items, [
        {name:'name',label:'Nombre'},
        {name:'description',label:'Descripción',full:true},
        {name:'price',label:'Precio',type:'number'},
        {name:'stock',label:'Stock',type:'number'},
        {name:'category',label:'Categoría',datalist:cats},
        {name:'active',label:'Activo',type:'select-bool'},
        {name:'featured',label:'Destacado',type:'select-bool'},
        {name:'image',label:'Imagen',type:'file',full:true}
      ], 'products');
      bindCrud('/api/admin/products', renderProducts, data.items);
    }

    function crudSection(title, items, fields, sectionKey){
      const cols = fields.filter(f=>f.type !== 'file');
      return `<section class="card panel"><h2 class="serif section-title">${title}</h2><div class="table-wrap"><table><thead><tr>${cols.map(f=>`<th>${f.label}</th>`).join('')}<th>Imagen</th><th>Acción</th></tr></thead><tbody>${items.map(row=>`<tr>${cols.map(f=>`<td>${App.escape(String(row[f.name] ?? ''))}</td>`).join('')}<td>${row.image_url ? '<span class="muted">Sí</span>' : '—'}</td><td><button class="btn btn-dark mini edit-row" data-id="${row.id}">Editar</button> <button class="btn btn-dark mini del-row" data-id="${row.id}">Eliminar</button></td></tr>`).join('') || `<tr><td colspan="20">Sin registros.</td></tr>`}</tbody></table></div><h3 class="serif mt-4">Agregar o editar</h3><form class="admin-form-grid" id="crudForm" enctype="multipart/form-data" autocomplete="off"><input type="hidden" name="id">${fields.map(f=>{ if (f.type==='file') return `<label class="full">${f.label}<input type="file" name="${f.name}" accept="image/*"></label>`; if (f.type==='select-bool') return `<label ${f.full?'class="full"':''}>${f.label}<select name="${f.name}"><option value="1">Sí</option><option value="0">No</option></select></label>`; if (f.datalist) return `<label ${f.full?'class="full"':''}>${f.label}<select name="${f.name}" data-role="category-select"><option value="">Selecciona una categoría</option>${f.datalist.map(x=>`<option value="${App.escape(x)}">${App.escape(x)}</option>`).join('')}<option value="__custom__">Nueva categoría…</option></select><input class="mt-1 hidden" name="${f.name}_custom" data-role="category-custom" placeholder="Escribe una nueva categoría"></label>`; return `<label ${f.full?'class="full"':''}>${f.label}<input name="${f.name}" ${f.type==='number'?'type="number"':''}></label>`; }).join('')}<div class="full"><button class="btn btn-primary">Guardar</button></div></form></section>`;
    }

    function bindCrud(endpoint, refresh, items){
      const form = document.getElementById('crudForm');
      const catSelect = form.querySelector('[data-role="category-select"]');
      const catCustom = form.querySelector('[data-role="category-custom"]');
      if (catSelect && catCustom) {
        catSelect.onchange = () => catCustom.classList.toggle('hidden', catSelect.value !== '__custom__');
      }
      content.querySelectorAll('.del-row').forEach(btn=>btn.onclick = async ()=> { await App.api(`${endpoint}/${btn.dataset.id}`,{ method:'DELETE' }); refresh(); });
      content.querySelectorAll('.edit-row').forEach(btn=>btn.onclick = ()=> {
        const row = items.find(x => x.id === Number(btn.dataset.id));
        if (!row) return;
        for (const [k,v] of Object.entries(row)) {
          const el = form.elements[k];
          if (el && el.type !== 'file') el.value = v ?? '';
        }
        if (catSelect && catCustom) {
          const exists = [...catSelect.options].some(o => o.value === String(row.category ?? ''));
          if (exists) { catSelect.value = row.category ?? ''; catCustom.value = ''; catCustom.classList.add('hidden'); }
          else { catSelect.value = '__custom__'; catCustom.value = row.category ?? ''; catCustom.classList.remove('hidden'); }
        }
        form.scrollIntoView({ behavior:'smooth', block:'start' });
      });
      form.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        if (catSelect) {
          const category = catSelect.value === '__custom__' ? (catCustom?.value || '').trim() : catSelect.value;
          fd.set('category', category);
          fd.delete('category_custom');
        }
        const r = await fetch(endpoint,{ method:'POST', body: fd });
        if (!r.ok) throw new Error(await r.text());
        App.toast('Guardado correctamente');
        refresh();
      };
    }

    async function renderBookings(){
      const data = await App.api('/api/admin/bookings');
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Citas</h2><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${data.items.map(x=>`<tr><td>${x.date_ymd}</td><td>${x.start_time}</td><td>${App.escape(x.customer_name)}<br>${App.escape(x.customer_phone)}</td><td>${App.escape(x.service_name)}</td><td>${App.escape(x.status)}</td><td><button class="btn btn-dark mini cancel-book" data-id="${x.id}">Cancelar</button> <button class="btn btn-dark mini delete-book" data-id="${x.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="6">Sin citas.</td></tr>'}</tbody></table></div></section>`;
      content.querySelectorAll('.cancel-book').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/bookings/${btn.dataset.id}/cancel`,{method:'POST'}); renderBookings(); });
      content.querySelectorAll('.delete-book').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/bookings/${btn.dataset.id}`,{method:'DELETE'}); renderBookings(); });
    }

    async function renderCoupons(){
      const data = await App.api('/api/admin/coupons');
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Cupones</h2><div class="table-wrap"><table><thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Mínimo</th><th>Disponibles</th><th>Vigencia</th><th>Activo</th><th>Acción</th></tr></thead><tbody>${data.items.map(x=>`<tr><td>${App.escape(x.code)}</td><td>${App.escape(x.discount_type)}</td><td>${x.discount_value}</td><td>${x.min_total}</td><td>${x.remaining_uses ?? 0}</td><td>${x.expires_at || '—'}</td><td>${x.active?'Sí':'No'}</td><td><button class="btn btn-dark mini edit-coupon" data-id="${x.id}">Editar</button> <button class="btn btn-dark mini del-coupon" data-id="${x.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="8">Sin cupones.</td></tr>'}</tbody></table></div><form class="admin-form-grid mt-4" id="couponForm"><input type="hidden" name="id"><label>Código<input name="code" placeholder="Código" required></label><label>Tipo<select name="discount_type"><option value="percent">Porcentaje</option><option value="fixed">Fijo</option></select></label><label>Valor<input name="discount_value" type="number" placeholder="Valor" required></label><label>Mínimo<input name="min_total" type="number" placeholder="Mínimo"></label><label>Cantidad disponible<input name="remaining_uses" type="number" min="0" value="1"></label><label>Fecha de vigencia<input name="expires_at" type="date"></label><label>Activo<select name="active"><option value="1">Sí</option><option value="0">No</option></select></label><div class="full"><button class="btn btn-primary">Guardar cupón</button></div></form></section>`;
      content.querySelectorAll('.del-coupon').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/coupons/${btn.dataset.id}`,{method:'DELETE'}); renderCoupons(); });
      content.querySelectorAll('.edit-coupon').forEach(btn=>btn.onclick = ()=> {
        const row = data.items.find(x => x.id === Number(btn.dataset.id));
        if (!row) return;
        const form = document.getElementById('couponForm');
        Object.entries(row).forEach(([k,v])=> { if (form.elements[k]) form.elements[k].value = v ?? ''; });
      });
      document.getElementById('couponForm').onsubmit = async e => { e.preventDefault(); await App.api('/api/admin/coupons',{ method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); App.toast('Cupón guardado'); renderCoupons(); };
    }

    async function renderBlocks(){
      const data = await App.api('/api/admin/overview');
      const items = data.blocked_periods || [];
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Bloqueos y cierres</h2><div class="table-wrap"><table><thead><tr><th>Inicio</th><th>Fin</th><th>Motivo</th><th>Activo</th><th>Aviso</th><th>Acción</th></tr></thead><tbody>${items.map(x=>`<tr><td>${x.start_date}</td><td>${x.end_date}</td><td>${App.escape(x.reason)}</td><td>${x.active?'Sí':'No'}</td><td>${x.show_notice?'Sí':'No'}</td><td><button class="btn btn-dark mini del-block" data-id="${x.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="6">Sin bloqueos.</td></tr>'}</tbody></table></div><form class="admin-form-grid mt-4" id="blockForm"><label>Fecha inicio<input name="start_date" type="date" required></label><label>Fecha fin<input name="end_date" type="date" required></label><label class="full">Motivo<input name="reason" placeholder="Motivo" required></label><label>Mostrar aviso<select name="show_notice"><option value="1">Sí</option><option value="0">No</option></select></label><label>Activo<select name="active"><option value="1">Sí</option><option value="0">No</option></select></label><div class="full"><button class="btn btn-primary">Guardar bloqueo</button></div></form></section>`;
      content.querySelectorAll('.del-block').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/blocked-periods/${btn.dataset.id}`,{method:'DELETE'}); renderBlocks(); });
      document.getElementById('blockForm').onsubmit = async e => { e.preventDefault(); await App.api('/api/admin/blocked-periods',{ method:'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) }); App.toast('Bloqueo guardado'); renderBlocks(); };
    }

    async function renderReviews(){
      const data = await App.api('/api/admin/reviews');
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Reseñas</h2><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estrellas</th><th>Comentario</th><th>Visible</th><th>Acciones</th></tr></thead><tbody>${data.items.map(x=>`<tr><td>${App.escape(x.author_name)}</td><td>${App.stars(x.rating)}</td><td>${App.escape(x.message)}</td><td>${x.approved?'Sí':'No'}</td><td><button class="btn btn-dark mini toggle-review" data-id="${x.id}" data-approved="${x.approved?0:1}">${x.approved?'Ocultar':'Mostrar'}</button> <button class="btn btn-dark mini del-review" data-id="${x.id}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">Sin reseñas.</td></tr>'}</tbody></table></div></section>`;
      content.querySelectorAll('.toggle-review').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/reviews/${btn.dataset.id}/visibility`,{ method:'POST', body: JSON.stringify({ approved:Number(btn.dataset.approved) }) }); renderReviews(); });
      content.querySelectorAll('.del-review').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/reviews/${btn.dataset.id}`,{ method:'DELETE' }); renderReviews(); });
    }

    async function renderLoyalty(){
      const data = await App.api('/api/admin/loyalty');
      content.innerHTML = `<section class="card panel"><h2 class="serif section-title">Lealtad</h2><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Teléfono</th><th>Visitas</th><th>Cortes gratis</th><th>Acción</th></tr></thead><tbody>${data.items.map(x=>`<tr><td>${App.escape(x.name||'')}</td><td>${App.escape(x.phone)}</td><td>${x.visits_count}</td><td>${x.free_cuts_earned}</td><td><button class="btn btn-dark mini del-loyalty" data-phone="${encodeURIComponent(x.phone)}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="5">Sin clientes registrados aún.</td></tr>'}</tbody></table></div></section>`;
      content.querySelectorAll('.del-loyalty').forEach(btn=>btn.onclick = async ()=> { await App.api(`/api/admin/loyalty/${btn.dataset.phone}`,{ method:'DELETE' }); renderLoyalty(); });
    }

    load('dashboard');
  }

  try { await ensureLogin(); } catch (err) { showError(err); }
})();
