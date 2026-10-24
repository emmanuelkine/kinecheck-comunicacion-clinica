/* PWA exclusiva de Horas Disponibles. No intercepta sesiones ni reservas. */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/horas-disponibles/sw.js', { scope: '/horas-disponibles/' })
      .catch(() => { /* La web sigue disponible sin instalación. */ });
  });
}
