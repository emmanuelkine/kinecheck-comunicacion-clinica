import { cleanText, demoIdentifier, makeContactUrl, normalizeProfile, toLocalISO } from './demo-core.mjs';

const SUPABASE_URL = 'https://mhnqtyvwxytppekktvxb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JLWKq6m0g4yB30iIQLE4bg_AkspSDYD';
const SESSION_KEY = 'kc_hours_demo_auth_v1';
const PILOT_TESTER_USER_ID = '9a5052da-48f4-4224-8d1f-c57288ceb150';
const PILOT_MESSAGE = 'KineCheck Horas Disponibles está preparando un piloto controlado con instituciones. Por ahora, el registro y la publicación o modificación de perfiles y horarios están temporalmente deshabilitados. Pronto se habilitarán. Gracias por tu paciencia.';
const $ = (selector, root = document) => root.querySelector(selector);
const state = { session: readSession(), profile: null, slots: [], profiles: [], publicSlots: [] };

function isPilotTester() { return state.session?.user?.id === PILOT_TESTER_USER_ID; }
function readSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { localStorage.removeItem(SESSION_KEY); return null; } }
function saveSession(session) { state.session = session; if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }
function message(target, text, bad = false) { const el = typeof target === 'string' ? $(target) : target; el.textContent = text; el.classList.toggle('error', bad); }
function node(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
function fmtDate(value) { return new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'full', timeStyle: 'short' }).format(new Date(value)); }
function apiHeaders(extra = {}) { return { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra }; }
async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (method !== 'GET' && !isPilotTester()) throw new Error(PILOT_MESSAGE);
  const headers = apiHeaders(state.session?.access_token ? { Authorization: `Bearer ${state.session.access_token}` } : {});
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.message || data?.hint || 'No se pudo completar la operación.');
  return data;
}
async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body), cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'No se pudo iniciar sesión.');
  return data;
}
async function refreshSession() {
  if (!state.session?.refresh_token) return null;
  try { const fresh = await authRequest('token?grant_type=refresh_token', { refresh_token: state.session.refresh_token }); saveSession(fresh); return fresh; }
  catch { saveSession(null); return null; }
}
async function hydrateSessionUser() {
  if (!state.session?.access_token || state.session.user?.id) return;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: apiHeaders({ Authorization: `Bearer ${state.session.access_token}` }),
    cache: 'no-store',
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) {
    saveSession(null);
    throw new Error('La sesión no pudo validarse. Solicita un nuevo enlace de acceso.');
  }
  saveSession({ ...state.session, user });
}
async function ensureFreshSession() {
  if (!state.session) return;
  if (Number(state.session.expires_at || 0) < Date.now() / 1000 + 60) await refreshSession();
  await hydrateSessionUser();
}
async function handleMagicLink() {
  const url = new URL(location.href);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && ['email', 'magiclink', 'signup'].includes(type)) {
    try {
      const result = await authRequest('verify', { token_hash: tokenHash, type });
      saveSession({ ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in });
      url.searchParams.delete('token_hash'); url.searchParams.delete('type'); history.replaceState({}, '', url.pathname + url.search + url.hash);
      message('#authMessage', 'Sesión iniciada. Ya puedes completar el perfil DEMO.');
    } catch (error) { message('#authMessage', `No se pudo validar el enlace: ${error.message}`, true); }
  } else if (url.hash.includes('access_token=')) {
    const hash = new URLSearchParams(url.hash.slice(1));
    const accessToken = hash.get('access_token'); const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      saveSession({ access_token: accessToken, refresh_token: refreshToken, expires_at: Number(hash.get('expires_at') || (Date.now() / 1000 + Number(hash.get('expires_in') || 3600))), user: { email: hash.get('user') || '' } });
      history.replaceState({}, '', url.pathname + url.search);
      try { await hydrateSessionUser(); }
      catch (error) { message('#authMessage', error.message, true); }
    }
  }
}

function setView(name) {
  const professional = name === 'professional';
  $('#patientView').classList.toggle('hidden', professional);
  $('#professionalView').classList.toggle('hidden', !professional);
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  if (professional) renderWorkspace();
}

function setContactFields() {
  const institutional = $('#exerciseType').value === 'institutional';
  $('#institutionNameField').classList.toggle('hidden', !institutional);
  $('#contactTypeField').replaceChildren();
  const label = node('span', '', 'Canal de contacto');
  const select = node('select'); select.name = 'contact_type'; select.id = 'contactType'; select.required = true;
  const choices = institutional ? [['institution_whatsapp', 'WhatsApp institucional'], ['institution_website', 'Sitio oficial de agendamiento']] : [['whatsapp', 'WhatsApp']];
  for (const [value, text] of choices) { const option = node('option', '', text); option.value = value; select.append(option); }
  $('#contactTypeField').append(label, select);
  const contact = $('#profileForm [name="contact_value"]');
  contact.placeholder = institutional && select.value === 'institution_website' ? 'https://agenda.institucion.cl/demo' : '+56912345678';
  select.addEventListener('change', () => { contact.placeholder = select.value === 'institution_website' ? 'https://agenda.institucion.cl/demo' : '+56912345678'; });
}

async function sendMagicLink(event) {
  event.preventDefault();
  const email = cleanText($('#authEmail').value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return message('#authMessage', 'Ingresa un correo válido.', true);
  const button = $('#magicLinkForm button'); button.disabled = true;
  try {
    const redirect = `${location.origin}${location.pathname}`;
    await authRequest(`otp?redirect_to=${encodeURIComponent(redirect)}`, { email, create_user: false, gotrue_meta_security: { captcha_token: '' } });
    message('#authMessage', 'Si el correo puede recibir mensajes, llegará un enlace de acceso. Revisa también spam.');
  } catch (error) { message('#authMessage', error.message, true); }
  finally { button.disabled = false; }
}

async function loadProfessional() {
  await ensureFreshSession();
  if (!isPilotTester()) { state.profile = null; state.slots = []; return; }
  if (!state.session?.access_token) { state.profile = null; state.slots = []; return; }
  const userId = state.session.user?.id;
  if (!userId) { state.profile = null; return; }
  const profiles = await rest(`kc_demo_health_profiles?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
  state.profile = profiles?.[0] || null;
  if (state.profile) state.slots = await rest(`kc_demo_health_slots?select=id,profile_id,starts_at,status&owner_user_id=eq.${encodeURIComponent(userId)}&order=starts_at.asc&limit=100`);
  else state.slots = [];
}

function organizationIdentifier() { return `DEMO-ORG-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }

async function loadInstitutionWorkspace() {
  const box = $('#institutionWorkspace'); box.replaceChildren();
  if (!isPilotTester() || !state.session?.user?.id) return;
  const userId = encodeURIComponent(state.session.user.id);
  const institutions = await rest(`kc_demo_institutions?select=id,demo_identifier,name,region,comuna,booking_url,status&owner_user_id=eq.${userId}&order=created_at.desc&limit=20`);
  const profiles = await rest(`kc_demo_health_profiles?select=id,demo_identifier,public_name,profession&user_id=eq.${userId}&limit=1`);
  for (const institution of institutions || []) {
    const card = node('article', 'institution-card');
    card.append(node('div', 'tag', `${institution.demo_identifier} · INSTITUCIÓN DEMO`));
    card.append(node('h4', '', institution.name));
    card.append(node('p', 'meta', `${institution.comuna}, ${institution.region}`));
    const url = node('p', 'small', institution.booking_url); card.append(url);
    const request = node('button', 'button secondary', 'Solicitar vínculo del perfil'); request.type = 'button';
    request.disabled = !profiles?.length;
    request.addEventListener('click', async () => {
      try {
        await rest('kc_demo_institution_memberships', { method: 'POST', body: {
          institution_id: institution.id, profile_id: profiles[0].id,
          professional_user_id: state.session.user.id, status: 'pending',
        }, prefer: 'return=minimal' });
        message('#institutionMessage', 'Solicitud de vínculo creada. Cámbiate al rol coordinador DEMO para revisarla.');
        await loadInstitutionWorkspace();
      } catch (error) { message('#institutionMessage', error.message.includes('duplicate') ? 'Este perfil ya tiene una solicitud o vínculo con la institución.' : error.message, true); }
    });
    card.append(request);
    const memberships = await rest(`kc_demo_institution_memberships?select=id,profile_id,status,created_at&institution_id=eq.${encodeURIComponent(institution.id)}&order=created_at.desc&limit=50`);
    for (const membership of memberships || []) {
      const profile = (profiles || []).find(item => item.id === membership.profile_id);
      const row = node('div', 'institution-card');
      row.append(node('p', 'meta', `${profile?.public_name || 'Perfil DEMO'} · ${profile?.profession || ''} · ${membership.status === 'pending' ? 'solicitud pendiente' : membership.status === 'active' ? 'vínculo activo' : 'solicitud rechazada'}`));
      if (membership.status === 'pending') {
        const actions = node('div', 'actions');
        const approve = node('button', 'button', 'Confirmar vínculo'); approve.type = 'button';
        approve.addEventListener('click', async () => {
          try {
            await rest(`kc_demo_institution_memberships?id=eq.${encodeURIComponent(membership.id)}`, { method: 'PATCH', body: { status: 'active', updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
            await rest(`kc_demo_health_profiles?id=eq.${encodeURIComponent(membership.profile_id)}`, { method: 'PATCH', body: {
              exercise_type: 'institutional', institution_name: institution.name,
              contact_type: 'institution_website', contact_value: institution.booking_url,
              updated_at: new Date().toISOString(),
            }, prefer: 'return=minimal' });
            message('#institutionMessage', 'Vínculo confirmado. El perfil DEMO muestra ahora a la institución y su canal de agenda.');
            await loadProfessional(); fillProfileForm(); await loadInstitutionWorkspace(); await loadPublicResults();
          } catch (error) { message('#institutionMessage', error.message, true); }
        });
        const reject = node('button', 'button secondary', 'Rechazar'); reject.type = 'button';
        reject.addEventListener('click', async () => {
          try { await rest(`kc_demo_institution_memberships?id=eq.${encodeURIComponent(membership.id)}`, { method: 'PATCH', body: { status: 'rejected', updated_at: new Date().toISOString() }, prefer: 'return=minimal' }); await loadInstitutionWorkspace(); }
          catch (error) { message('#institutionMessage', error.message, true); }
        });
        actions.append(approve, reject); row.append(actions);
      }
      card.append(row);
    }
    box.append(card);
  }
  if (!institutions?.length) box.append(node('p', 'small', 'Todavía no hay instituciones DEMO. Crea una con datos ficticios para recorrer el flujo.'));
  if (!profiles?.length) box.append(node('p', 'small', 'Para solicitar un vínculo, primero guarda un perfil profesional DEMO.'));
}

async function createInstitution(event) {
  event.preventDefault();
  if (!isPilotTester() || !state.session?.user?.id) return message('#institutionMessage', PILOT_MESSAGE, true);
  const form = event.currentTarget;
  try {
    const values = Object.fromEntries(new FormData(form));
    const url = new URL(String(values.booking_url || ''));
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('El enlace de agenda debe ser HTTPS y no incluir credenciales.');
    await ensureFreshSession();
    await rest('kc_demo_institutions', { method: 'POST', body: {
      owner_user_id: state.session.user.id, demo_identifier: organizationIdentifier(),
      name: cleanText(values.name, 140), region: cleanText(values.region, 100),
      comuna: cleanText(values.comuna, 100), booking_url: url.href, status: 'active',
    }, prefer: 'return=minimal' });
    form.reset(); message('#institutionMessage', 'Institución DEMO creada. Ahora puedes vincular un perfil de prueba.');
    await loadInstitutionWorkspace();
  } catch (error) { message('#institutionMessage', error.message, true); }
}

function fillProfileForm() {
  const form = $('#profileForm'); form.reset();
  if (!state.profile) { $('#exerciseType').value = 'independent'; setContactFields(); return; }
  for (const field of form.elements) if (field.name && Object.hasOwn(state.profile, field.name)) field.value = state.profile[field.name] ?? '';
  $('#exerciseType').value = state.profile.exercise_type;
  setContactFields();
  $('#contactType').value = state.profile.contact_type;
  form.elements.demo_ack.checked = false;
  message('#profileState', `Identificador ${state.profile.demo_identifier} · Perfil ${state.profile.published ? 'publicado' : 'desactivado'} · credenciales no verificadas oficialmente.`);
}

async function saveProfile(event) {
  event.preventDefault(); const form = event.currentTarget;
  if (!form.elements.demo_ack.checked) return message('#profileMessage', 'Confirma que todos los datos son ficticios y que aceptas su publicación en la DEMO.', true);
  try {
    const profile = normalizeProfile(Object.fromEntries(new FormData(form)));
    await ensureFreshSession();
    if (!state.session?.user?.id) throw new Error('La sesión no tiene una identidad válida. Solicita un nuevo enlace de acceso.');
    profile.user_id = state.session.user.id;
    profile.demo_identifier = state.profile?.demo_identifier || demoIdentifier();
    if (!state.profile) {
      const rows = await rest('kc_demo_health_profiles', { method: 'POST', body: profile, prefer: 'return=representation' });
      state.profile = rows[0];
    } else {
      const rows = await rest(`kc_demo_health_profiles?id=eq.${encodeURIComponent(state.profile.id)}`, { method: 'PATCH', body: profile, prefer: 'return=representation' });
      state.profile = rows[0] || { ...state.profile, ...profile };
    }
    message('#profileMessage', 'Perfil DEMO guardado. El identificador y los datos están aislados del servicio operativo.');
    await loadProfessional(); fillProfileForm(); await loadInstitutionWorkspace(); await loadPublicResults(); renderWorkspace();
  } catch (error) { message('#profileMessage', error.message, true); }
}

function addAvailabilityRow(copyDate = '') {
  const rows = $('#slotRows');
  if (rows.children.length >= 20) return message('#slotMessage', 'Puedes publicar hasta 20 horarios en una sola operación.', true);
  const row = node('div', 'slot-entry');
  const dateLabel = node('label', '', 'Fecha');
  const date = node('input'); date.type = 'date'; date.className = 'slot-date'; date.required = true; date.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); date.value = copyDate;
  dateLabel.append(date);
  const timeLabel = node('label', '', 'Hora');
  const time = node('input'); time.type = 'time'; time.className = 'slot-time'; time.required = true;
  timeLabel.append(time);
  const remove = node('button', 'button secondary remove-slot', 'Quitar'); remove.type = 'button';
  remove.addEventListener('click', () => {
    if (rows.children.length === 1) { date.value = ''; time.value = ''; return; }
    row.remove(); updateAvailabilityRowControls();
  });
  row.append(dateLabel, timeLabel, remove); rows.append(row); updateAvailabilityRowControls();
}

function updateAvailabilityRowControls() {
  const rows = $('#slotRows');
  for (const button of rows.querySelectorAll('.remove-slot')) button.disabled = rows.children.length === 1;
  $('#addSlotRow').disabled = rows.children.length >= 20;
}

async function addSlot(event) {
  event.preventDefault();
  if (!state.profile?.published) return message('#slotMessage', 'Guarda y activa primero un perfil DEMO.', true);
  const form = event.currentTarget;
  if (form.dataset.submitting === 'true') return;
  form.dataset.submitting = 'true';
  const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
  try {
    const entries = [...form.querySelectorAll('.slot-entry')];
    if (!entries.length || entries.some(row => !row.querySelector('.slot-date').value || !row.querySelector('.slot-time').value)) {
      throw new Error('Completa fecha y hora en cada fila, o quita las filas que no usarás.');
    }
    const startsAtList = entries.map(row => toLocalISO(row.querySelector('.slot-date').value, row.querySelector('.slot-time').value));
    if (new Set(startsAtList).size !== startsAtList.length) throw new Error('Hay una fecha y hora repetida en la lista. Elimínala antes de publicar.');
    await ensureFreshSession();
    if (!isPilotTester() || !state.session?.user?.id) throw new Error(PILOT_MESSAGE);
    await loadProfessional();
    const existing = new Set(state.slots.map(slot => new Date(slot.starts_at).toISOString()));
    const duplicate = startsAtList.find(value => existing.has(value));
    if (duplicate) throw new Error('Uno de esos horarios ya está en “Mis horarios”. Modifica el existente o elige otra hora.');
    const body = startsAtList.map(starts_at => ({ profile_id: state.profile.id, owner_user_id: state.session.user.id, starts_at, status: 'active' }));
    await rest('kc_demo_health_slots', { method: 'POST', body, prefer: 'return=minimal' });
    $('#slotRows').replaceChildren(); addAvailabilityRow();
    message('#slotMessage', `${body.length} horario(s) guardado(s). Actualizando la vista paciente…`);
    await loadProfessional(); renderMySlots(); await loadPublicResults();
    message('#slotMessage', `${body.length} horario(s) DEMO publicados y visibles en el buscador.`);
  } catch (error) { message('#slotMessage', error.message, true); }
  finally { form.dataset.submitting = 'false'; submit.disabled = false; updateAvailabilityRowControls(); }
}

async function mutateSlot(id, action, newISO) {
  const slot = state.slots.find(item => item.id === id); if (!slot) return;
  try {
    await ensureFreshSession();
    if (action === 'delete') await rest(`kc_demo_health_slots?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
    else await rest(`kc_demo_health_slots?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: action === 'deactivate' ? 'inactive' : 'active', ...(newISO ? { starts_at: newISO } : {}), updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
    await loadProfessional(); renderMySlots(); await loadPublicResults(); message('#slotMessage', 'Cambio reflejado en la vista paciente.');
  } catch (error) { message('#slotMessage', error.message, true); }
}

function renderMySlots() {
  const list = $('#mySlots'); list.replaceChildren();
  if (!state.slots.length) { list.append(node('p', 'small', 'Todavía no hay horarios publicados.')); return; }
  for (const slot of state.slots) {
    const row = node('div', 'slot-row'); const info = node('div');
    info.append(node('p', '', fmtDate(slot.starts_at)), node('span', slot.status === 'active' ? 'tag' : 'small', slot.status === 'active' ? 'ACTIVA' : 'DESACTIVADA'));
    const actions = node('div', 'actions');
    const edit = node('button', 'button secondary', 'Modificar'); edit.type = 'button'; edit.addEventListener('click', () => {
      const initial = new Date(slot.starts_at); const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(initial);
      const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(initial);
      const d = prompt('Nueva fecha (AAAA-MM-DD)', date); if (!d) return;
      const t = prompt('Nueva hora (HH:MM)', time); if (!t) return;
      try { mutateSlot(slot.id, slot.status === 'active' ? 'activate' : 'activate', toLocalISO(d, t)); } catch (error) { message('#slotMessage', error.message, true); }
    });
    const toggle = node('button', 'button secondary', slot.status === 'active' ? 'Desactivar' : 'Reactivar'); toggle.type = 'button'; toggle.addEventListener('click', () => mutateSlot(slot.id, slot.status === 'active' ? 'deactivate' : 'activate'));
    const remove = node('button', 'button secondary', 'Eliminar'); remove.type = 'button'; remove.addEventListener('click', () => mutateSlot(slot.id, 'delete'));
    actions.append(edit, toggle, remove); row.append(info, actions); list.append(row);
  }
}

async function deactivateProfile() {
  if (!state.profile) return;
  try {
    await rest(`kc_demo_health_profiles?id=eq.${encodeURIComponent(state.profile.id)}`, { method: 'PATCH', body: { published: false, updated_at: new Date().toISOString() }, prefer: 'return=minimal' });
    state.profile.published = false; message('#profileMessage', 'Perfil desactivado; dejará de aparecer en el buscador.');
    await loadPublicResults(); fillProfileForm();
  } catch (error) { message('#profileMessage', error.message, true); }
}

function renderWorkspace() {
  const tester = isPilotTester();
  const signedIn = Boolean(state.session?.user?.id);
  $('#pilotLock').classList.toggle('hidden', tester);
  $('#authPanel').classList.toggle('hidden', tester || signedIn);
  $('#workspace').classList.toggle('hidden', !tester);
  $('#sessionStatus').textContent = tester
    ? 'Acceso de prueba autorizado · entorno DEMO aislado'
    : 'Piloto controlado en preparación · acceso de edición restringido';
  if (!tester && signedIn) {
    message('#pilotLock', 'Esta sesión no tiene acceso de edición a la DEMO. El piloto está reservado a la cuenta de prueba autorizada; la búsqueda pública sigue disponible.');
  }
}

function safeFilter(profile) {
  const includes = (id, value) => !value || String(profile[id] || '').toLocaleLowerCase('es-CL').includes(value.toLocaleLowerCase('es-CL'));
  return includes('profession', $('#filterProfession').value.trim()) && includes('specialty', $('#filterSpecialty').value.trim()) && includes('region', $('#filterRegion').value.trim()) && includes('comuna', $('#filterComuna').value.trim()) && (!$('#filterModality').value || profile.modality === $('#filterModality').value);
}

function drawResults() {
  const results = $('#results'); results.replaceChildren();
  const hours = Number($('#filterHorizon').value || 168); const now = Date.now(); const end = now + hours * 3600000;
  const profiles = new Map(state.profiles.map(profile => [profile.id, profile]));
  const slots = state.publicSlots.filter(slot => new Date(slot.starts_at).getTime() > now && new Date(slot.starts_at).getTime() <= end && profiles.has(slot.profile_id) && safeFilter(profiles.get(slot.profile_id)));
  if (!slots.length) { results.append(node('p', 'small', 'No hay horarios para estos filtros en este periodo. Publica un perfil y una hora DEMO desde la vista profesional.')); return; }
  for (const slot of slots) {
    const profile = profiles.get(slot.profile_id); const card = node('article', 'card');
    card.append(node('div', 'tag', `${profile.demo_identifier} · DEMO · NO VERIFICADO`));
    card.append(node('h3', '', profile.public_name));
    card.append(node('p', 'meta', `${profile.profession}${profile.specialty ? ` · ${profile.specialty}` : ''}`));
    card.append(node('p', 'meta', `${profile.comuna}, ${profile.region} · ${profile.location_label}`));
    card.append(node('p', 'meta', `Modalidad ${profile.modality} · ${fmtDate(slot.starts_at)}`));
    if (profile.exercise_type === 'institutional') card.append(node('p', 'meta', `Institución demostrativa: ${profile.institution_name}`));
    card.append(node('p', 'small', 'Solicitud de contacto · la disponibilidad no es una reserva confirmada.'));
    const link = node('a', 'button', profile.exercise_type === 'institutional' ? 'Ir al canal institucional' : 'Contactar por WhatsApp');
    try { link.href = makeContactUrl(profile, slot.starts_at); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; }
    catch { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
    card.append(link); results.append(card);
  }
}

async function loadPublicResults() {
  message('#searchMessage', 'Consultando disponibilidades DEMO…');
  try {
    const min = new Date().toISOString(); const max = new Date(Date.now() + 7 * 24 * 3600000).toISOString();
    const [profiles, slots] = await Promise.all([
      rest('kc_demo_health_profiles?select=id,demo_identifier,public_name,profession,specialty,region,comuna,location_label,modality,exercise_type,institution_name,contact_type,contact_value,verification_status&published=eq.true&limit=100'),
      rest(`kc_demo_health_slots?select=id,profile_id,starts_at,status&status=eq.active&starts_at=gt.${encodeURIComponent(min)}&starts_at=lt.${encodeURIComponent(max)}&order=starts_at.asc&limit=200`),
    ]);
    state.profiles = profiles || []; state.publicSlots = slots || [];
    drawResults(); message('#searchMessage', `${state.publicSlots.length} horario(s) de prueba dentro de los próximos siete días.`);
  } catch (error) { message('#searchMessage', `No se pudieron cargar datos de DEMO: ${error.message}`, true); }
}

async function signOut() { try { if (state.session?.access_token) await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: apiHeaders({ Authorization: `Bearer ${state.session.access_token}` }) }); } finally { saveSession(null); state.profile = null; state.slots = []; renderWorkspace(); } }

async function init() {
  $('#exerciseType').addEventListener('change', setContactFields); setContactFields();
  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('#magicLinkForm').addEventListener('submit', sendMagicLink); $('#profileForm').addEventListener('submit', saveProfile); $('#slotForm').addEventListener('submit', addSlot);
  $('#institutionForm').addEventListener('submit', createInstitution);
  $('#signOut').addEventListener('click', signOut); $('#unpublishProfile').addEventListener('click', deactivateProfile); $('#refreshSearch').addEventListener('click', loadPublicResults);
  $('#addSlotRow').addEventListener('click', () => { const firstDate = $('#slotRows .slot-date')?.value || ''; addAvailabilityRow(firstDate); });
  addAvailabilityRow();
  for (const control of document.querySelectorAll('#patientView input,#patientView select')) control.addEventListener('input', drawResults);
  for (const control of document.querySelectorAll('#patientView select')) control.addEventListener('change', drawResults);
  await handleMagicLink(); await ensureFreshSession(); renderWorkspace();
  if (isPilotTester()) { await loadProfessional(); fillProfileForm(); renderMySlots(); await loadInstitutionWorkspace(); }
  await loadPublicResults();
}
init();
