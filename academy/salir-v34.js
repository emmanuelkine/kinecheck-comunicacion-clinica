(() => {
  try {
    localStorage.removeItem("kinecheck_secure_session_v1");
    sessionStorage.removeItem("kinecheck_secure_session_v1");
  } catch (error) {
    console.warn("No se pudo limpiar el almacenamiento de sesión.", error);
  }

  const status = document.querySelector("#logout-status");
  if (status) status.textContent = "La sesión se cerró en este dispositivo.";
})();
