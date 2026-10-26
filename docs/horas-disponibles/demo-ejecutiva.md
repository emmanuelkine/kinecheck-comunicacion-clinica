# KineCheck Horas Disponibles — demo ejecutiva

## Estado de conformidad

**Estado: implementación preparada, publicación pendiente de autorización de retorno de Auth y de verificación de flujo con correo.** No presentar el enlace de producción como completado hasta que la URL pública cargue, Supabase permita el retorno exacto, y la prueba entre dos sesiones termine con persistencia y contacto revisados.

| Control | Evidencia actual | Estado |
|---|---|---|
| Arquitectura revisada | PR #246 y #248 aportaban CTA y filtros guardados en el navegador; ninguno resolvía autenticación compartida, datos persistentes o RLS | Revisado |
| Separación de datos | Dos tablas `kc_demo_health_*` en KineCheck Staging (`mhnqtyvwxytppekktvxb`); la app contiene únicamente la URL y publishable key de staging | Implementado |
| Privilegios públicos | RLS activada y forzada en ambas tablas; `anon` no tiene privilegio de lectura sobre `user_id`; lectura anónima de tablas ejecutada en SQL con rol `anon`; sin datos de prueba precargados | Revisado |
| Autenticación | Acceso por enlace al correo; staging tiene registro por email y confirmación habilitados, sin sign-in anónimo | Código listo; falta retorno permitido y prueba con buzón controlado |
| Perfil y horarios | Validación en navegador y restricciones SQL; crear, editar, desactivar y eliminar; actualización del buscador | Prueba automatizada de funciones; E2E pendiente |
| Contacto | WhatsApp incluye fecha/hora seleccionadas; canal institucional admite WhatsApp o URL HTTPS; la apertura ocurre después de pulsar el enlace | Prueba automatizada de URL y texto; E2E en iPhone pendiente |
| XSS y contenido | Render de datos con `textContent`; URLs validadas; no se cargan scripts externos | Prueba de contrato y revisión de código |
| Responsive | CSS con cortes móvil y escritorio; Playwright sin navegador en el entorno, la descarga fue bloqueada | Verificación visual pendiente en vista pública |
| Producción | No se modificaron proyecto, tablas, claves ni Auth de producción; la ruta tiene CSP que conecta solo al staging | Revisado en código; falta captura tras publicación |
| Asesores Supabase | Seguridad: no aparecieron hallazgos nuevos para las tablas demo. Un aviso preexistente informa que la protección contra contraseñas filtradas está deshabilitada. Rendimiento: múltiples políticas permisivas de lectura y nuevos índices reportados aún sin uso porque la demo no tiene registros | Revisado; optimización no bloqueante |
| Pruebas del repositorio | `node --test tests/hours-available-demo.test.mjs`: 7/7; sintaxis y `git diff --check`: aprobados. `npm test`: 101/116 aprobadas, 15 fallas en archivos ajenos a este cambio; cotejar contra `main` antes de merge | Bloqueo global por confirmar baseline |
| PR / despliegue | Aún no creado | Pendiente |

### Referencias técnicas

- Repositorio: `emmanuelkine/kinecheck-comunicacion-clinica`.
- Rama: `feat/hours-available-demo-20261023`.
- Staging: `mhnqtyvwxytppekktvxb` (proyecto llamado KineCheck Staging).
- Migraciones: `20261023200836_hours_available_demo_isolated` y `20261023210000_hours_available_demo_fk_index`.
- PR y despliegue: completar aquí con URLs/SHA comprobados antes de declarar la demo publicada.

## Guion ejecutivo — cinco minutos

**0:00–0:35 | Qué es** — Abrir `/horas-disponibles/demo/`. Explicar que se muestra un flujo de disponibilidad y contacto en un entorno aislado. Señalar “MODO DEMOSTRACIÓN”, el identificador DEMO y que no hay reserva real ni verificación profesional oficial.

**0:35–1:45 | Soy profesional** — En otra ventana o escritorio, entrar a **Soy profesional** y solicitar el enlace de acceso al correo de prueba. Abrir el enlace recibido. Usar nombre, institución y teléfono ficticios; crear el perfil independiente, escoger modalidad, ubicación de prueba y aceptar el aviso de publicación. Mostrar el identificador DEMO y “NO VERIFICADO”. Publicar una hora a 1–2 horas del momento de la reunión.

**1:45–2:55 | Soy paciente** — En el iPhone, abrir la URL pública en Safari. Elegir profesión, comuna y ventana de disponibilidad. Pulsar **Actualizar resultados** si el perfil no aparece de inmediato. Mostrar que el identificador, la hora y modalidad coinciden con el panel profesional.

**2:55–3:35 | Contacto independiente** — Pulsar **Contactar por WhatsApp** y comprobar visualmente el destinatario ficticio y el texto con la fecha/hora correcta. No enviar el mensaje; volver a la demo. Aclarar que la acción abre un canal de solicitud y no confirma la hora.

**3:35–4:20 | Institución** — En el panel profesional, cambiar el perfil de prueba a **Institucional**, poner “Centro Demo” y configurar el canal institucional ficticio o una URL HTTPS de agendamiento autorizada para la demostración. Guardar. Volver a la vista paciente, actualizar y mostrar el canal institucional. No llamarlo “canal oficial verificado” salvo que la institución real haya autorizado y entregado el enlace.

**4:20–5:00 | Actualización y cierre** — Volver al panel, modificar o desactivar la hora y actualizar la búsqueda del iPhone. Cerrar indicando: KineCheck muestra disponibilidad comunicada por el prestador y facilita el contacto; la cita solo existe cuando el prestador la confirma en su propio canal. No atribuir ahorros, resultados clínicos ni porcentajes no medidos.

## Contingencia ante falla de internet

1. **Primera opción: demo en vivo.** Probar Wi-Fi y datos móviles antes de iniciar. Tener el escritorio como profesional y Safari del iPhone como paciente; mantener sesión ya validada, perfil DEMO y hora futura preparados. Si Auth o Supabase deja de responder, no presentar operaciones como guardadas.
2. **Alternativa: grabación validada.** Usar una grabación solo después de completar y revisar el flujo real de extremo a extremo en el despliegue público. Mostrarla identificada en pantalla como “grabación de una prueba previa”; explicar que no es una sesión en vivo y no abrir enlaces de contacto como si fueran a operar. No existe grabación validada hasta que se produzca esa prueba.
3. **Si no hay grabación validada.** Usar capturas verificables del despliegue (registro, perfil, buscador, contacto, cambio de hora) y narrar el flujo. Llamarlo recorrido de pantallas, no demo funcional offline. No usar el prototipo local ni datos generados como evidencia de persistencia.
4. **Después de la reunión.** Repetir el flujo en dos sesiones/dispositivos y documentar el incidente antes de volver a afirmar disponibilidad pública.

## Condiciones antes de activar un piloto operativo

- Aprobación del propietario para activar registros y horas reales; este cambio mantiene la versión operativa desactivada.
- Proyecto Supabase productivo independiente o separación equivalente revisada, claves propias y políticas RLS auditadas; sin reutilizar las tablas `kc_demo_*`.
- Validación de identidad y registro profesional con fuente autorizada, trazabilidad y procedimiento para credenciales vencidas o discrepancias; ninguna insignia de verificación hasta completar el control.
- Autorización escrita de cada profesional e institución para publicar perfil, canal y horas; confirmación de responsables de agenda y enlaces oficiales.
- Revisión legal y de privacidad aplicable en Chile: finalidad, datos publicados, consentimiento, retención, eliminación, derechos de titulares, avisos y responsabilidades de los prestadores.
- Protocolo contra datos clínicos, RUT y contactos no autorizados; soporte, reporte y retiro urgente de publicaciones; control antiabuso y límites de creación.
- Pruebas de seguridad, RLS y propiedad con identidades separadas; restauración y monitoreo; prueba de concurrencia y expiración de horarios.
- Pruebas de aceptación en iPhone/Safari, Android/Chrome si está disponible, y escritorio; lector de pantalla, contraste y enlaces institucionales validados.
- Aprobación comercial y operativa de textos, soporte y condiciones de uso; plan de incidentes y responsable de guardia durante el piloto.
