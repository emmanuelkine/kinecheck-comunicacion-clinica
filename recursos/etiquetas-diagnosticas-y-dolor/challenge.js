document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('#check');
  const feedback = document.querySelector('#feedback');
  if (!button || !feedback) return;

  button.addEventListener('click', () => {
    const selected = document.querySelector('input[name="q"]:checked');
    if (!selected) {
      feedback.textContent = 'Selecciona una respuesta antes de comprobar.';
      feedback.dataset.state = 'error';
      return;
    }

    if (selected.value === 'b') {
      feedback.textContent = 'Correcto. Valida el dolor, comunica la incertidumbre y propone un plan compartido sin prometer un resultado.';
      feedback.dataset.state = 'success';
      return;
    }

    feedback.textContent = 'Revisa tu elección: evita invalidar el dolor, atribuir causalidad estructural sin sustento o prometer plazos de recuperación.';
    feedback.dataset.state = 'error';
  });
});
