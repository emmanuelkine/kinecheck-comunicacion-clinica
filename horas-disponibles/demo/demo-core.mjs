export function cleanText(value, max = 180) {
  return String(value ?? '').normalize('NFC').trim().slice(0, max);
}

export function normalizeProfile(form) {
  const exercise = cleanText(form.exercise_type, 20);
  const institution = cleanText(form.institution_name, 180);
  const contactType = cleanText(form.contact_type, 30);
  const contactValue = cleanText(form.contact_value, 1500);
  const profile = {
    public_name: cleanText(form.public_name, 120),
    profession: cleanText(form.profession, 100),
    specialty: cleanText(form.specialty, 120),
    region: cleanText(form.region, 100),
    comuna: cleanText(form.comuna, 100),
    location_label: cleanText(form.location_label, 180),
    modality: cleanText(form.modality, 30),
    exercise_type: exercise,
    institution_name: exercise === 'institutional' ? institution : null,
    contact_type: contactType,
    contact_value: contactValue,
    published: true,
  };
  const required = ['public_name', 'profession', 'region', 'comuna', 'location_label'];
  if (required.some(key => profile[key].length < 2)) throw new Error('Completa los campos obligatorios con información de prueba.');
  if (!['Presencial', 'Domiciliaria', 'Teleatención'].includes(profile.modality)) throw new Error('Selecciona una modalidad válida.');
  if (!['independent', 'institutional'].includes(exercise)) throw new Error('Selecciona un tipo de ejercicio válido.');
  if (exercise === 'independent') {
    if (contactType !== 'whatsapp' || !/^\+?[1-9]\d{7,14}$/.test(contactValue)) throw new Error('Para un perfil independiente, usa un número WhatsApp ficticio en formato internacional.');
  } else {
    if (institution.length < 2) throw new Error('Indica el nombre de una institución ficticia.');
    if (contactType === 'institution_whatsapp') {
      if (!/^\+?[1-9]\d{7,14}$/.test(contactValue)) throw new Error('Usa un WhatsApp institucional ficticio en formato internacional.');
    } else if (contactType === 'institution_website') {
      let url;
      try { url = new URL(contactValue); } catch { throw new Error('Ingresa el enlace HTTPS oficial de agendamiento.'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('El enlace de agendamiento debe usar HTTPS y no incluir credenciales.');
    } else throw new Error('Selecciona el canal institucional.');
  }
  return profile;
}

export function makeContactUrl(profile, startsAt) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) throw new Error('La fecha seleccionada no es válida.');
  const formatted = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const note = `Hola, encontré su disponibilidad DEMO en KineCheck Horas Disponibles. Me interesa solicitar una atención para el día ${formatted}, a las ${time}. ¿Podría confirmar si continúa disponible? Esta demostración no genera una reserva real.`;
  if (profile.contact_type === 'whatsapp' || profile.contact_type === 'institution_whatsapp') {
    const digits = String(profile.contact_value).replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(digits)) throw new Error('El número de contacto no es válido.');
    return `https://wa.me/${digits}?text=${encodeURIComponent(note)}`;
  }
  let url;
  try { url = new URL(profile.contact_value); } catch { throw new Error('El enlace institucional no es válido.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('El canal institucional debe ser un enlace HTTPS válido.');
  return url.href;
}

export function toLocalISO(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Selecciona una fecha y hora válidas.');
  const value = new Date(`${date}T${time}:00`);
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isFinite(value.getTime()) || value.getFullYear() !== year || value.getMonth() + 1 !== month || value.getDate() !== day || value.getHours() !== hour || value.getMinutes() !== minute) throw new Error('Selecciona una fecha y hora existentes.');
  if (value.getTime() <= Date.now()) throw new Error('La disponibilidad debe ser una fecha futura.');
  return value.toISOString();
}

export function demoIdentifier(randomBytes = crypto.getRandomValues(new Uint8Array(8))) {
  return `DEMO-${Array.from(randomBytes, n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
