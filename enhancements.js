(() => {
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };
  let deferredPrompt = null;
  let studySeconds = Number(localStorage.getItem('kcStudySeconds') || 0);
  let timerTick = Date.now();
  let favorites = new Set(store.get('kcFavorites', []));
  let currentSlideForTools = Number(localStorage.getItem('kcCommLastSlide') || 1);

  function toast(msg){
    const el = $('#kcToast'); if(!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function name(){
    return localStorage.getItem('kcStudentName') || '';
  }
  function completedSlides(){
    return new Set(store.get('kcCommSlides', []));
  }
  function completedModules(){
    return new Set(store.get('kcCommModules', []));
  }
  function formatTime(sec){
    if(sec < 3600) return Math.max(1, Math.round(sec/60)) + ' min';
    const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
    return `${h} h ${m} min`;
  }
  function saveTime(){
    const now = Date.now();
    if(!document.hidden) studySeconds += Math.max(0, Math.round((now - timerTick)/1000));
    timerTick = now;
    localStorage.setItem('kcStudySeconds', String(studySeconds));
  }
  setInterval(() => { saveTime(); updateDashboard(); }, 30000);
  document.addEventListener('visibilitychange', saveTime);
  window.addEventListener('beforeunload', saveTime);

  function updateDashboard(){
    const slides = completedSlides(), modules = completedModules();
    const pct = Math.round(slides.size / 154 * 100);
    $('#kcMetricProgress') && ($('#kcMetricProgress').textContent = pct + '%');
    $('#kcMetricModules') && ($('#kcMetricModules').textContent = `${modules.size}/12`);
    $('#kcMetricTime') && ($('#kcMetricTime').textContent = formatTime(studySeconds));
    $('#kcMetricFavs') && ($('#kcMetricFavs').textContent = favorites.size);
    $('#kcGreeting') && ($('#kcGreeting').textContent = name() ? `Hola, ${name()} 👋` : 'Hola 👋');

    const next = Math.min(12, modules.size ? Math.max(...modules) + 1 : 1);
    $('#kcNextGoal') && ($('#kcNextGoal').textContent = modules.size >= 12 ? 'Has completado todos los módulos.' : `Continúa con el módulo ${next}.`);
    const certReady = slides.size >= 154 && modules.size >= 12;
    $('#kcCertificateStatus') && ($('#kcCertificateStatus').textContent = certReady ? 'Tu certificado está habilitado.' : `Disponible al completar el curso. Progreso actual: ${pct}%.`);
    const btn = $('#kcPrintCertificate');
    if(btn){ btn.disabled = !certReady; btn.title = certReady ? '' : 'Completa las 154 diapositivas y los 12 módulos'; }
    renderFavorites();
  }

  function renderFavorites(){
    const box = $('#kcFavorites'); if(!box) return;
    if(!favorites.size){ box.innerHTML = '<p>Aún no has guardado favoritos.</p>'; return; }
    box.innerHTML = [...favorites].sort((a,b)=>a-b).map(n => `<div class="kc-favorite-item"><span>Diapositiva ${n}</span><button class="text-btn" data-kc-open="${n}">Abrir</button></div>`).join('');
    box.querySelectorAll('[data-kc-open]').forEach(b => b.onclick = () => {
      const n = Number(b.dataset.kcOpen);
      const jump = $('#pageJump'); if(jump) jump.value = n;
      const nav = document.querySelector('[data-view="slides"]'); if(nav) nav.click();
      setTimeout(() => { if(jump) jump.value = n; $('#jumpBtn')?.click(); }, 80);
    });
  }

  function showDashboard(){
    document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'dashboard');
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.toggle('active', b.dataset.view === 'dashboard'));
    $('#sidebar')?.classList.remove('open');
    window.scrollTo({top:0, behavior:'smooth'});
    updateDashboard();
  }
  document.querySelectorAll('[data-view="dashboard"]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); showDashboard(); }));

  const notes = $('#kcGlobalNotes');
  if(notes){
    notes.value = localStorage.getItem('kcGlobalNotes') || '';
    let t;
    notes.addEventListener('input', () => {
      clearTimeout(t);
      $('#kcNotesStatus').textContent = 'Guardando…';
      t = setTimeout(() => {
        localStorage.setItem('kcGlobalNotes', notes.value);
        $('#kcNotesStatus').textContent = 'Guardado automáticamente';
      }, 500);
    });
  }

  function welcome(){
    const modal = $('#kcWelcome');
    if(!localStorage.getItem('kcWelcomeSeen')) modal.hidden = false;
    $('#kcStartExperience')?.addEventListener('click', () => {
      const n = ($('#kcWelcomeName')?.value || '').trim();
      if(n){ localStorage.setItem('kcStudentName', n); $('#kcStudentName').value = n; }
      localStorage.setItem('kcWelcomeSeen', '1'); modal.hidden = true; showDashboard();
    });
    $('#kcSkipWelcome')?.addEventListener('click', () => {
      localStorage.setItem('kcWelcomeSeen', '1'); modal.hidden = true;
    });
  }

  function focus(on){
    document.body.classList.toggle('kc-focus-mode', on);
    $('#kcFocusExit').hidden = !on;
    toast(on ? 'Modo concentración activado' : 'Modo concentración desactivado');
  }
  $('#kcFocusStart')?.addEventListener('click', () => focus(true));
  $('#kcFocusSlide')?.addEventListener('click', () => focus(true));
  $('#kcFocusExit')?.addEventListener('click', () => focus(false));
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && document.body.classList.contains('kc-focus-mode')) focus(false); });

  const slideImg = $('#slideImage');
  if(slideImg){
    const obs = new MutationObserver(() => {
      currentSlideForTools = Number($('#pageJump')?.value || localStorage.getItem('kcCommLastSlide') || 1);
      updateFavoriteButton();
    });
    obs.observe(slideImg, {attributes:true, attributeFilter:['src']});
  }
  function updateFavoriteButton(){
    const btn = $('#kcFavoriteSlide'); if(!btn) return;
    btn.textContent = favorites.has(currentSlideForTools) ? '★ Quitar de favoritos' : '☆ Añadir a favoritos';
  }
  $('#kcFavoriteSlide')?.addEventListener('click', () => {
    currentSlideForTools = Number($('#pageJump')?.value || currentSlideForTools || 1);
    favorites.has(currentSlideForTools) ? favorites.delete(currentSlideForTools) : favorites.add(currentSlideForTools);
    store.set('kcFavorites', [...favorites]);
    updateFavoriteButton(); updateDashboard(); toast('Favoritos actualizados');
  });
  $('#kcAddSlideNote')?.addEventListener('click', () => {
    currentSlideForTools = Number($('#pageJump')?.value || currentSlideForTools || 1);
    const key = `kcSlideNote${currentSlideForTools}`;
    const current = localStorage.getItem(key) || '';
    const value = prompt(`Nota para la diapositiva ${currentSlideForTools}:`, current);
    if(value !== null){ localStorage.setItem(key, value); toast('Nota guardada'); }
  });

  $('#kcContinueDashboard')?.addEventListener('click', () => $('#continueBtn')?.click());
  $('#kcGoNext')?.addEventListener('click', () => $('#continueBtn')?.click());

  const studentName = $('#kcStudentName');
  if(studentName){
    studentName.value = name();
    studentName.addEventListener('input', () => localStorage.setItem('kcStudentName', studentName.value.trim()));
  }
  $('#kcPrintCertificate')?.addEventListener('click', () => {
    const slides = completedSlides(), modules = completedModules();
    if(slides.size < 154 || modules.size < 12){ toast('Completa el curso antes de generar el certificado'); return; }
    const n = ($('#kcStudentName')?.value || name()).trim();
    if(!n){ toast('Escribe tu nombre completo'); return; }
    localStorage.setItem('kcStudentName', n);
    $('#kcCertificateName').textContent = n;
    $('#kcCertificateDate').textContent = new Intl.DateTimeFormat('es-CL', {dateStyle:'long'}).format(new Date());
    window.print();
  });

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e;
    $('#installBtn')?.classList.add('ready');
  });
  $('#installBtn')?.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null; $('#installBtn')?.classList.remove('ready');
  });

  // Refresca métricas cada vez que se marcan diapositivas o módulos.
  document.addEventListener('click', e => {
    if(e.target.closest('#slideDone,#moduleDoneBtn,#quizNext')) setTimeout(updateDashboard, 120);
  });

  welcome(); updateDashboard(); updateFavoriteButton();
})();