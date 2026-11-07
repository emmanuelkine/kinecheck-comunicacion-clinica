# KineCheck Evalúa · Migración controlada desde AppDeploy
Fecha: 2026-11-07

## Entrega implementada
- Se añade `/evalua/kin2002/` a la sección Evalúa existente de KineCheck.
- Consolidación **exclusivamente local en el navegador**, sin llamadas a AppDeploy ni Supabase.
- Importa dos maestros de simulación, hoja **Evaluación individual** (sección B, nombre J, niveles L–S; ponderaciones 8/16/16/12/20/12/8/8).
- Importa Excel de informes S1 y S2, hoja **MATRIZ_DOCENTE** (nombre A, comprobante B, niveles F–M; ponderaciones 20/20/15/10/15/10/5/5).
- Calcula notas sobre 100 puntos con exigencia 60 %. Informe ×0,30 + simulación ×0,70; muestra aporte del certamen ×0,50 **solo si el informe está marcado validado/confirmado y no hay conflictos**.
- Rechaza niveles incompletos, señala nombres duplicados, ausencias y pruebas; exporta CSV escapando fórmulas.
- No almacena ni transmite datos académicos. Al cerrar/recargar la página desaparecen los resultados.
- Es un **piloto de conciliación**, no un reemplazo funcional del backend de KineCheck Evalúa.

## Evidencia de prueba
- `node --check evalua/kin2002/evalua.js` correcto.
- Prueba local en Chromium con dos maestros simulados y los XLSX reales de auditoría de S1 y S2: se leyeron **70 registros de informes**, agrupados en **69 claves normalizadas por una colisión de identidad**, que queda señalada para revisión.
- Los archivos de informe aportados carecen de ocho niveles docentes completos; el sistema devolvió **cero calificaciones de informe**, sin inventarlas.
- La prueba no equivale a evaluación de seguridad externa ni verifica los maestros docentes definitivos.

## Bloqueos para migrar TODA la aplicación y activar producción
1. **Inventariar los datos de AppDeploy**: actividades, usuarios, permisos, 71 PDF originales, comprobantes, fechas, propuestas, calificaciones confirmadas, simulaciones, preguntas de pacientes y respuestas. Los ZIP adjuntos respaldan los PDF de informes, pero no necesariamente el resto de las colecciones.
2. **Obtener una exportación completa y verificable** de todas las colecciones de AppDeploy: recuentos, identificadores, SHA-256, referencia de propietarios, eventos de recepción y revisión. No sustituir la exportación con registros de ejemplo.
3. **Definir aislamiento institucional** en KineCheck: tenant/campus/curso/sección, rol titular, colaborador y ayudante, accesos mínimos, auditoría de cambios y retención.
4. **Diseñar y auditar tablas, políticas RLS y bucket privado** con controles de identificación, permisos, acceso por sección, descargas autenticadas y denegación a visitantes. Sin credenciales privilegiadas en frontend.
5. **Migrar copia a staging**, nunca directo a producción. Validar equivalencia registro por registro: dueño, UUID, estado, fecha UTC/Chile, nombre, hash PDF, y nota. Preservar notas confirmadas.
6. **Pruebas E2E** con usuarios ficticios para carga, descarga, calificación, edición concurrente, recuperación ante errores y conciliación con los archivos maestros reales. Comprobar rol docente y helper.
7. **Activación con retorno reversible**: mantener AppDeploy sin nuevas escrituras durante ventana de corte; bloquear doble recepción; contar y comparar estado antes/después; habilitar redirección únicamente si pasan los controles.
8. Revisar privacidad institucional aplicable antes de mover información real de estudiantes; no mostrar listas ni documentos en rutas públicas.

## Criterio de publicación
- **Se autoriza publicar solo el piloto de conciliación local** `/evalua/kin2002/`, una vez que CI y controles de privacidad pasen. Los archivos se procesan en memoria del navegador, sin persistir ni enviar información; no incorpora calificaciones reales por sí solo.
- **No se autoriza activar la migración académica completa** hasta contar con exportación verificable de AppDeploy, autenticación, RLS, almacenamiento privado, conciliación de registros y pruebas de recuperación. El sitio debe señalar claramente esta distinción.
- La operación anterior de AppDeploy permanece en paralelo, sin redirección automática ni modificación de registros; un despliegue del piloto no acredita que el sistema antiguo pueda retirarse.
