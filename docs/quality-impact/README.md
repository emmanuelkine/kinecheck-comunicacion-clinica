# KineCheck Quality & Impact

Extensión de KineCheck Academy para conservar expedientes, evaluar aprendizaje, revisar competencias con rúbricas humanas, recoger experiencia y documentar mejoras. No usa modelos de inteligencia artificial para puntuar respuestas. No cambia compras, licencias, aprobación ni certificados.

## Componentes

| Área | Implementación |
|---|---|
| Expedientes | Versiones inmutables asociadas a `course_academic_load`, con vigencia, responsables, resultados, contenidos, metodología, evaluación y referencias. Exportación PDF/CSV. |
| Aprendizaje | Instrumento fijo por cohorte, pre/pos, claves privadas, respuestas y rúbricas versionadas; comparación solo del mismo instrumento. |
| Competencias | Casos escritos, descriptores explícitos, revisión humana y revisiones conservadas. No alteran la aprobación de Academy. |
| Experiencia | Encuesta voluntaria versionada con nueve dimensiones de 1 a 5 y recomendación de 0 a 10. Se informa separada del aprendizaje. |
| Seguimiento | Encuestas a 30/90/120 días desde la finalización verificada, consentimiento revocable y avisos internos existentes. |
| Indicadores | Cohorte, programa, versión y periodo; definición, fuente, denominador, faltantes y actualización. CSV agregado para difusión con supresión. |
| Trayectoria | Actividades con procedencia y evidencia; cobertura mensual de 24 meses, sin acreditar meses sin respaldo revisado. |
| Informes | Periodos de cuatro meses, PDF/CSV/JSON, copia de indicadores, SHA-256, revisiones y aprobación interna. |
| Mejora | Problema, indicador de origen, responsable, acción, implementación y reevaluación con evidencia. |
| Preparación CEL | Matriz privada de ocho requisitos preliminares; evidencia, versiones y validación externa documentada. |

## Rutas implementadas

- `/academy/admin/calidad/`: administración y responsables autorizados.
- `/academy/admin/calidad/cel/`: matriz de preparación CEL.
- `/academy/calidad/`: participante, evaluaciones, retroalimentación, experiencia y consentimiento.
- `/api/quality/action` y `/api/quality/export`: Pages Functions, con verificación de identidad y autorización PostgreSQL.

**Una ruta implementada no demuestra su publicación.** El estado de instalación y las comprobaciones están en `validacion-y-despliegue.md`.

## Fuente de los datos y límites

La auditoría partió de `main` en `0c2fd083c6759ff8ba638298419a13c56bf9928a`. Se comprobaron las columnas reales de `course_academic_load`, `course_access`, `course_completions`, `course_assessment_attempts`, notificaciones y registros institucionales de Campus. Se reutilizan `auth.users`, `auth.sessions`, los operadores y las instituciones existentes.

`course_access` es un registro mutable de licencias: no constituye por sí solo una matrícula histórica por cohorte. Por eso la vinculación conserva la procedencia y la fecha de observación; no inventa fechas históricas. El inicio del nuevo módulo es prospectivo. Las finalizaciones y aprobaciones se consultan en sus fuentes originales y se exige coincidencia de versión. No se infiere reprobación por falta de un intento.

Cada cohorte utiliza un solo instrumento inicial/final inmutable. Las medias inicial y final pueden incluir personas distintas; el cambio usa únicamente pares completos. El cambio relativo excluye bases iguales a cero y declara cuántas excluye. La repetición del instrumento puede producir efecto de práctica; la comparabilidad estadística y validez del instrumento requieren revisión académica y pilotaje.

La transferencia autoinformada no equivale a impacto clínico. Clasificar un archivo como externo o clínico no valida automáticamente sus afirmaciones. Los documentos requieren revisión humana y procedencia verificable. Los archivos admitidos inicialmente son texto UTF-8 `.txt`, hasta 100 KB; no se aceptan fichas clínicas ni datos de pacientes. PDF, imágenes y otros adjuntos quedan fuera de esta versión.

No se precargan cohortes, estudiantes, resultados ni actividad histórica en producción. Los ejemplos y pruebas usan exclusivamente datos sintéticos identificados como tales. Una cohorte de prueba no acredita continuidad institucional.

## Instalación y pruebas

La migración canónica es `supabase/migrations/20261028124334_quality_impact.sql`; `supabase/schema/quality_impact.sql` contiene la misma definición para revisión y pruebas. Antes de instalar, confirmar los prerrequisitos de Academy y Campus y aplicar en staging. El archivo `quality_impact_staging_prerequisites.sql` contiene las columnas y restricciones auditadas de tres tablas académicas que faltaban en staging, sin copiar registros.

El mantenimiento utiliza el `pg_cron` ya existente en producción. Si la extensión no está instalada, no crea un planificador alternativo: la activación y comprobación del trabajo quedan como requisito de despliegue. El trabajo diario prepara avisos internos, crea borradores al cerrar cada periodo de cuatro meses y aplica la conservación del módulo. No aprueba informes ni envía correos externos.

```sh
npm ci
npm test
npm run test:quality
npm run test:quality:browser
node scripts/quality-impact-example.mjs
```

Las pruebas del navegador utilizan HTTP real hacia Pages Functions y PostgreSQL aislado; solo la identidad de Auth es un fixture sintético. La comprobación con GoTrue y cuentas desechables en staging debe registrarse separadamente. La suite no crea compras reales ni envía webhooks financieros a producción.

## Documentación

- `manual-administrador.md`
- `manual-academico.md`
- `seguridad-y-datos.md`
- `validacion-y-despliegue.md`
- `example/informe-cuatrimestral-prueba.pdf`: ejemplo sintético sin validez institucional.
