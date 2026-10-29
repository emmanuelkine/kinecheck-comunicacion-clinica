# KineCheck: seguimiento de auditoría de seguridad y privacidad

**Fecha de verificación:** 2026-10-29 (UTC)  
**Estado:** seguimiento parcial; no constituye certificación legal ni autorización de despliegue.  
**Base:** informe inicial de auditoría de 2026-10-28.  
**Cambio propuesto:** documentación interna únicamente. Sin cambios a código, datos, políticas, migraciones o configuración de producción.

## Resultado de esta etapa

Se repitieron verificaciones de metadatos y se ejecutaron consultas de autorización de solo lectura usando los roles SQL `anon` y `authenticated`, UUID sintéticos y transacciones revertidas. No se consultaron filas con datos personales reales. No se creó una cuenta real ni se utilizó credencial de un usuario.

No se identificó una corrección de base de datos que pueda aplicarse con seguridad antes de observar y probar los flujos completos. En particular, no se deben añadir políticas RLS generales ni retirar permisos sin enlazar cada permiso con su consumidor activo.

## Evidencias nuevas

| Componente | Prueba | Resultado | Alcance |
|---|---|---|---|
| Supabase producción | Relectura de Security Advisor | Se mantiene alerta informativa de RLS habilitado sin políticas (37) y el aviso de protección contra contraseñas filtradas desactivada | No implica por sí sola exposición de filas; la configuración de Auth debe cambiarse y probarse en Dashboard |
| Supabase staging | Relectura de Security Advisor y catálogo | 61 tablas con RLS habilitado y sin política, distribuidas en `academy_core`, `academy_ortho`, `private` y `public` | Alertas informativas. No se cambiaron políticas |
| Academy / accesos | `SET ROLE anon` y `SET ROLE authenticated` con UUID sintético; conteo de filas de `public.course_access` | Ambos roles vieron 0 filas | Prueba SQL de rol en staging, no prueba completa vía REST/JWT ni flujo de curso |
| Campus / Academy privados | Consulta de staging como `authenticated` a `academy_core.certificates` | Denegada por falta de permiso al esquema | Denegación confirmada para ese esquema; roles docentes/institucionales reales de prueba pendientes |
| Horas Disponibles demo | UUID sintético autenticado no asociado a membresía; conteos de perfiles, horas, instituciones y membresías | 0 filas visibles en las cuatro tablas | Comprueba denegación para identidad no autorizada. No prueba acceso del miembro autorizado ni separación entre dos instituciones existentes |
| Certificados públicos | Llamada a `academy_certificate_verify` como `anon` con UUID v4 sintético desconocido | `{"found":false}` | Función `SECURITY DEFINER`, `search_path` vacío, SQL con referencias cualificadas. No devuelve nombre ni correo. No se alteró porque bloquearla podría romper verificación pública |
| Integración Hotmart, licencias, Exercise, biblioteca, métricas, automatizaciones, autenticación web, correo y experiencia móvil/escritorio | Sin cuentas sintéticas, checkout de prueba, clon local o secretos/configuración de proveedor en este entorno | Pendiente | No afirmar pruebas de regresión ni aislamiento funcional |

> Los resultados de SQL con `SET ROLE` validan comportamiento de base de datos en el rol indicado; no sustituyen pruebas de API REST con JWT emitidos por Auth, ni cubren Edge Functions, frontend o proveedores externos.

## Acciones seguras realizadas

- Volver a consultar los avisos actuales de seguridad en producción y staging.
- Verificar de nuevo el cuerpo y privilegios de la función pública de certificado sin modificarla.
- Ejecutar consultas SQL de solo lectura con roles de base y una identidad sintética desconocida.
- Confirmar que las comprobaciones SQL se limitaron a conteos y metadatos y revirtieron sus transacciones.
- Mantener intactos compras, licencias, datos reales, documentos legales públicos y configuración productiva.

No se ejecutó ningún cambio en bases de datos ni se publicó ningún documento jurídico.

## Bloqueos y corrección necesaria

### 1. Protección contra contraseñas filtradas (prioridad media)

No hay herramienta disponible en esta sesión para cambiar la opción de Auth.

1. En Supabase Dashboard, abrir el proyecto **staging**.
2. Ir a **Authentication → Settings** (la etiqueta exacta puede variar en la versión del Dashboard) → **Password Security**.
3. Activar **Leaked password protection** / protección contra contraseñas comprometidas.
4. Guardar. Revisar el Security Advisor.
5. Con una cuenta sintética nueva en staging, probar registro/cambio de contraseña con una contraseña de prueba no comprometida y una contraseña de prueba incluida en el mecanismo de prueba recomendado por Supabase; verificar que la segunda se rechace y que recuperación de acceso siga funcionando.
6. Registrar la evidencia y la versión/configuración. Repetir en producción solo con autorización explícita, plan de reversión y pruebas satisfactorias en staging.

No compartir contraseñas reales con el equipo de auditoría.

### 2. Cuentas y datos de prueba para autorización

Crear en **staging**, con correo de prueba controlado y datos ficticios, identidades separadas para estudiante, docente, institución A, institución B y administrador. Asignar roles/membresías sin usar cuentas personales de producción. Probar lecturas y mutaciones permitidas y denegadas en REST/API, Storage y Edge Functions. Añadir fixtures reversibles y no usar compras reales. Confirmar como mínimo:

- estudiante A no consulta ni cambia progreso, resultados o intentos de estudiante B;
- docente/institución A no puede consultar ni cambiar recursos de institución B;
- administrador autorizado conserva su flujo de soporte;
- cambios de licencia solo provienen del webhook/operación autorizados;
- lecturas públicas de certificados revelan solo campos aprobados;
- la demo de Horas permite el acceso autorizado requerido y mantiene cerrado el acceso de identidades ajenas;
- enlaces WhatsApp/agendas siguen dirigiendo directamente al canal oficial y KineCheck no persiste identificadores de pacientes ni conversaciones.

No se probaron escrituras ni se insertaron fixtures durante esta etapa.

### 3. Documentación legal y comercial

Los términos públicos, la política de privacidad, el registro de tratamiento y el protocolo de incidentes fueron revisados en el informe inicial. No se modificaron porque siguen sin estar confirmados datos que no deben inventarse: identidad legal/tributaria y domicilio del proveedor, rol exacto de vendedor frente a Hotmart, encargados y subencargados actuales, países y garantías de transferencias, plazos reales de retención, mecanismos de borrado y contacto/procedimiento operativo de derechos.

Completar la ficha interna de identificación del proveedor con datos confirmados por su titular; conciliarla con Hotmart, checkout, comprobantes y sitio. Después, preparar cambios en borrador para revisión jurídica chilena y autorización del responsable antes de publicarlos. Verificar antes del cierre la fecha de entrada en vigencia de la Ley 21.719 y su normativa oficial aplicable.

### 4. Pruebas de regresión y publicación

No existe clon Git local en el entorno y no se ejecutaron scripts del repositorio. El `package.json` define pruebas Node para Academy/Campus, Exercise, feedback, Hotmart y recuperación ante desastres, además de pruebas de navegador. En esta etapa no se declara éxito de compilación, CI, regresión integral ni producción.

Una vez disponible entorno local y credenciales sintéticas de staging:

1. ejecutar pruebas automatizadas declaradas en el repositorio;
2. agregar/ejecutar pruebas por rol y aislamiento institucional;
3. validar cada servicio y su versión móvil/escritorio;
4. revisar los checks del PR;
5. probar despliegue en staging, comprobar rollback y verificar integraciones;
6. solicitar aprobación antes de toda modificación de datos, accesos o disponibilidad productiva.

## Estado de publicación

Este documento está propuesto como PR de seguimiento técnico/documental. No cambia los términos, la política ni el comportamiento del sitio. No se publica a usuarios finales. La producción de Supabase y el sitio público no fueron modificados.

## Decisión de cierre

**Auditoría técnica integral: abierta.**  
**Vulnerabilidades críticas/altas demostradas corregidas:** ninguna identificada en el alcance ejecutado; siguen abiertos los controles de autenticación y las pruebas de roles completas.  
**Cumplimiento legal certificado:** no afirmado.  
**Producción:** sin cambios.
