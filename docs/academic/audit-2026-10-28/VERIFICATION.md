# Evidencia de verificación

Fecha: 28 de octubre de 2026. Las pruebas de la versión por competencias utilizaron exclusivamente datos sintéticos en una base local aislada. No se ejecutaron intentos, emisiones ni modificaciones con estudiantes reales.

## Resultados ejecutados

| Comprobación | Resultado y alcance |
|---|---|
| Suite Node completa, ejecución secuencial | 189 pruebas aprobadas, 0 fallidas. Evidencia completa en `test-evidence/all-tests.log`. Incluye regresiones de compras/Hotmart, roles, Campus, Exercise y demás pruebas existentes. |
| RPC académica y permisos en PGlite | Verificación de sesión, acceso, estados, casos de siete etapas, revisión humana, umbrales 69/70/100, seguridad crítica, intentos expirados, certificados, anulación y conciliación. |
| Proxy/API | Bloqueo por defecto, origen, bearer, tamaño, validación de usuario, permisos y errores sin detalles privados. |
| UI WebKit | 390 y 1280 px, consulta de estado, respuesta escrita, envío a `pending_review`, ausencia de certificado sin emisión. Sin desbordamiento horizontal ni errores JavaScript en esos recorridos. |
| Axe en WebKit | Cero infracciones detectadas en las pantallas de estado y respuesta a ambas anchuras. No equivale a auditoría WCAG integral ni a Safari físico. |
| Integridad Academy | `validate-academy-integrity.mjs`: OK. |
| Contratos de UI Academy | `validate-academy-ui-contracts.mjs`: OK. |
| Excel de auditoría y plantilla | Ocho cursos, trece hallazgos, totales y controles recalculados. Pruebas temporales de una emisión, duplicado, anulación y mes siguiente; datos sintéticos retirados antes de exportar. Cero errores de fórmulas detectados. Tres hojas renderizadas e inspeccionadas visualmente. |
| Generador mensual Excel | Ejecutado con dos documentos sintéticos: bruto 1500 CLP, anulado 500, neto 1000; mes determinado por fecha de emisión en Chile. No se entrega ese archivo de prueba como un reporte real. |
| Banco de revisión | Ocho casos, 56 ítems; cada caso suma 100 y mantiene estado `draft`. No se cargó ni se publicó como sumativo. |
| Verificación de certificados | Consulta mínima sin identificadores de estudiante, correo o URL del documento. Probada con identificador existente e inexistente. |

## Fallos observados y resolución

La ejecución inicial de `npm test` en paralelo terminó con 151 pruebas aprobadas y un archivo fallido (`hotmart-access-regression.test.mjs`) sin diagnóstico adicional. Ese archivo pasó sus 20 pruebas al ejecutarse por separado. La suite completa pasó en ejecución secuencial. No se alteraron los tests de Hotmart ni su implementación para forzar el resultado; no se atribuye con certeza el fallo inicial a una causa no demostrada.

El primer recorrido de navegador no pudo conectarse al servidor local entre procesos. La prueba final inicia su propio servidor HTTP en el mismo proceso y lo cierra al terminar. Después se corrigió la creación del contexto requerida por axe; el resultado final está en `browser-results.json`. Estos fallos de montaje no se cuentan como una prueba aprobada.

`supabase migration list --local` no pudo conectar con el stack Docker local en el puerto 54322. La migración fue creada por CLI y se ejecutó íntegramente mediante PGlite para comprobar sintaxis y comportamiento PostgreSQL. **No se afirma una aplicación en Supabase remoto ni una prueba del stack Supabase completo**. La revisión de grants/RLS desplegados y la carga concurrente con conexiones reales permanecen como pasos de ensayo remoto.

El asesor de seguridad de producción se consultó sin mutaciones. El resumen sin datos personales está en `advisor-summary.json`: 37 avisos informativos de RLS sin políticas y un aviso de protección de contraseñas filtradas. Los avisos de tablas privadas con API protegida necesitan interpretación contextual; no se les asigna automáticamente una vulnerabilidad. La [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) requiere revisión de configuración existente. No se modificó autenticación de producción.

## Pruebas que no se declaran realizadas

No hubo despliegue ni verificación de producción de la nueva versión, prueba de carga concurrente real, Safari/iOS/Android físicos, pentest integral, validación psicométrica, revisión académica humana de preguntas, pilotaje con estudiantes, firma de convenio, emisión OTEC real ni conciliación con una factura real. Las pruebas sintéticas de documentos no suplen esos requisitos.

El rollback fue ejecutado en la prueba local: desactivó exclusivamente la RPC y sus interruptores y conservó los registros de auditoría. Debe verificarse también en el ensayo remoto antes de instalar con alumnos reales. Ningún resultado local autoriza por sí solo la activación sumativa.
