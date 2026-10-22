const demo = [
  {
    name: 'Dra. Camila Torres',
    specialty: 'Traumatología',
    city: 'Rancagua',
    date: '2026-10-23',
    time: '10:30',
    address: 'Centro de Rancagua (ejemplo)',
    contact: 'Contacto de demostración',
  },
  {
    name: 'Matías Herrera',
    specialty: 'Kinesiología',
    city: 'Machalí',
    date: '2026-10-24',
    time: '15:00',
    address: 'Consulta de Machalí (ejemplo)',
    contact: 'Contacto de demostración',
  },
];
const key = 'kinecheck-preview-slots';
const $ = id => document.getElementById(id);
const escape = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );
function slots() {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
function render() {
  const term = $('specialty').value,
    city = $('city').value;
  const rows = [
    ...demo.map((x, i) => ({ ...x, id: 'demo' + i, demo: true })),
    ...slots(),
  ].filter(
    x =>
      (!term || x.specialty === term) &&
      (!city || x.city.toLowerCase().includes(city.toLowerCase())) &&
      new Date(x.date + 'T' + x.time) >= new Date()
  );
  $('results').innerHTML = rows.length
    ? rows
        .map(
          x =>
            '<article class="card"><div class="tag">' +
            (x.demo ? 'EJEMPLO · NO RESERVABLE' : 'VISTA PREVIA LOCAL') +
            '</div><h3>' +
            escape(x.name) +
            '</h3><div class="meta">' +
            escape(x.specialty) +
            ' · ' +
            escape(x.city) +
            '</div><p>📅 ' +
            escape(x.date) +
            ' · ' +
            escape(x.time) +
            '</p><p>📍 ' +
            escape(x.address) +
            '</p><div class="meta">Contacto: ' +
            escape(x.contact) +
            '</div>' +
            (x.demo
              ? ''
              : '<button class="secondary" data-id="' +
                escape(x.id) +
                '">Desactivar hora</button>') +
            '</article>'
        )
        .join('')
    : '<p>No hay horas que coincidan con los filtros.</p>';
  document.querySelectorAll('[data-id]').forEach(
    b =>
      (b.onclick = () => {
        localStorage.setItem(
          key,
          JSON.stringify(slots().filter(x => x.id !== b.dataset.id))
        );
        render();
      })
  );
}
$('searchBtn').onclick = () => {
  $('searchPanel').scrollIntoView({ behavior: 'smooth' });
};
$('publishBtn').onclick = () => {
  $('publishPanel').classList.remove('hidden');
  $('publishPanel').scrollIntoView({ behavior: 'smooth' });
};
$('filterBtn').onclick = render;
$('publishForm').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const x = Object.fromEntries(f.entries());
  if (new Date(x.date + 'T' + x.time) <= new Date()) {
    $('message').textContent = 'Selecciona una fecha y hora futuras.';
    return;
  }
  x.id = 'slot' + Date.now();
  localStorage.setItem(key, JSON.stringify([...slots(), x]));
  $('message').textContent =
    'Hora publicada en esta demostración local. No es visible para otros usuarios.';
  e.target.reset();
  render();
};
render();

if(location.hash==='#publishPanel') { $('publishPanel').classList.remove('hidden'); setTimeout(()=>$('publishPanel').scrollIntoView(),100); }
if(location.hash==='#searchPanel') setTimeout(()=>$('searchPanel').scrollIntoView(),100);
