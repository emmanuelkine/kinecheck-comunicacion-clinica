# Auditoría de consistencia Hotmart y acceso — 2026-08-14

## Alcance y seguridad

La auditoría revisó migraciones, Edge Functions, webhooks, funciones desplegadas,
automatizaciones, métricas e invariantes de acceso. Las consultas al proyecto
Supabase fueron exclusivamente `SELECT`. No se insertaron, actualizaron ni
eliminaron compras o licencias de producción y no se tocaron secretos ni la
configuración de Hotmart.

## Discrepancia `1 active` → `0 active`

- El rollup de `2026-08-14 10:20 UTC` todavía registró `1` compra activa y `7`
  revocadas.
- Un segundo run, ejecutado fuera del horario cron a `2026-08-14 14:01 UTC`,
  registró `0` activas y `7` revocadas.
- Ambos runs reportaron `created=0`, `repaired=0`, `revoked=0` e
  `issues_seen=0` en la reconciliación.
- El estado actual contiene siete filas, no ocho. Por lo tanto, la compra activa
  no cambió a `revoked`: la fila activa dejó de existir entre ambos runs.
- Ninguna función desplegada ni archivo del repositorio elimina filas de
  `hotmart_purchases`. `daily_operations` sólo invoca expiración,
  reconciliación de `course_access`, notificaciones, beta, retención y rollup.
- La tabla desplegada no tiene trigger ni historial de `DELETE`, por lo que no
  es posible atribuir la eliminación a una sentencia o actor concreto con la
  evidencia disponible. Los logs disponibles tampoco identifican la sentencia.
- En el estado desplegado, `postgres` y `service_role` tienen privilegio
  efectivo de `DELETE`; `anon` y `authenticated` no. Por tanto, una consulta
  administrativa directa o cualquier proceso con la clave `service_role`
  podía eliminar la fila sin rastro en la propia base.

Conclusión: `daily_operations` no causó el cambio, ni directa ni indirectamente.
La hipótesis compatible con la evidencia es una limpieza administrativa/QA
externa al job. No se encontró un script concreto al que atribuirla y no debe
presentarse esa hipótesis como un hecho: la ausencia de auditoría de borrados
impide demostrar tanto el actor como la herramienta utilizada.

## Naturaleza de las siete revocadas

Las siete compras revocadas son exclusivamente pruebas de certificación del
29 de julio:

- todos los compradores usan `@example.com`;
- todos los accesos relacionados tienen `access_source=hotmart_test`;
- existen exactamente siete `PURCHASE_APPROVED` y siete
  `PURCHASE_REFUNDED`, uno de cada tipo por transacción;
- no existe ninguna compra comercial activa o revocada en el estado actual.

El estado actual de licencias activas es completamente no comercial:

| Fuente | Activas |
| --- | ---: |
| `owner` | 30 |
| `beta` | 10 |
| `manual_test` | 10 |
| `manual` | 2 |
| `hotmart` | 0 |

Los nueve accesos `hotmart_test` actuales están inactivos. `owner`, `beta`,
`manual_test`, `hotmart_test` y `manual/HOTMART_AREA_TEST` deben quedar fuera
de métricas comerciales, aunque pueden conservarse en totales operativos.

## Escritores y orden de eventos

- `hotmart-webhook` clasifica aprobaciones como `active` y reembolsos,
  cancelaciones, chargebacks, expiraciones y delays como `revoked`.
- `process_hotmart_event()` es el único escritor identificado de
  `hotmart_purchases.status`. Hace `INSERT ... ON CONFLICT DO UPDATE` y nunca
  elimina compras.
- La búsqueda completa no encontró `DELETE FROM hotmart_purchases`, `TRUNCATE`
  ni un upsert que reemplace la fila completa. La única clave de conflicto es
  `(transaction_id, product_id)` y actualiza la fila conservando su PK.
- La misma búsqueda en el historial Git no encontró borrados ni truncados. El
  único commit histórico que introduce escritura es el backup de
  `process_hotmart_event()` mediante `INSERT ... ON CONFLICT DO UPDATE`.
- La inspección de `pg_proc` desplegado confirma que `has_course_access()`,
  `kinecheck_reconcile_hotmart_access()` y
  `kinecheck_rollup_daily_metrics()` sólo leen compras. El único
  `INSERT`/upsert es `process_hotmart_event()` y ninguna rutina contiene
  `DELETE` o `UPDATE hotmart_purchases` directo.
- El identificador de evento hace idempotente un webhook repetido.
- `last_event_at` protege una transacción contra eventos fuera de orden; en
  igualdad de timestamp, `revoked` tiene prioridad.
- `SUBSCRIPTION_CANCELLATION` se acepta sin revocar inmediatamente.
- El PK `(transaction_id, product_id)` impide duplicar el mismo par, pero permite
  que un `transaction_id` aparezca con dos productos. Hoy no existe ese caso.

## Defecto reproducido

`course_access` representa una licencia agregada por `(email, course_slug)`,
pero `process_hotmart_event()` aplica el último evento recibido sin comprobar
si otra transacción del mismo comprador todavía está activa. La secuencia:

1. aprobar transacción A;
2. aprobar transacción B para el mismo curso;
3. reembolsar A con un evento posterior;

podía desactivar el acceso concedido por B. La reconciliación diaria tampoco era
una defensa suficiente porque su guardia temporal podía rechazar la reparación
de B frente al reembolso más reciente de A.

## Corrección local

La migración `20260814152228_harden_hotmart_access_consistency.sql`:

1. añade un trigger defensivo que conserva el acceso si otra compra del mismo
   comprador y curso sigue activa;
2. impide que una revocación comercial sobrescriba accesos independientes
   `owner`, `beta`, `manual_test` o `manual/HOTMART_AREA_TEST`;
3. permite que `has_course_access()` use un `course_access` Hotmart activo y no
   vencido como fallback si una fila de compra desaparece administrativamente;
4. crea `kinecheck_hotmart_purchase_audit`, con estado anterior/nuevo,
   `buyer_email` como SHA-256 y snapshots JSON antes/después que excluyen el
   correo en claro;
5. bloquea cualquier `DELETE` sin un motivo de al menos ocho caracteres fijado
   dentro de la misma transacción con
   `kinecheck.hotmart_purchase_delete_reason`, y revoca `DELETE` a los roles de
   aplicación, incluido `service_role`;
6. conserva `active_purchases` y `revoked_purchases` como totales históricos y
   agrega las claves inequívocas `commercial_active_purchases`,
   `qa_active_purchases`, `commercial_revoked_purchases`,
   `qa_revoked_purchases` y `unclassified_purchases`;
7. actualiza el panel administrativo para consumir las claves comerciales y
   etiquetar cualquier total histórico como `incluye QA`;
8. mantiene el historial QA: no borra, reetiqueta ni corrige retrospectivamente
   compras existentes.

La excepción administrativa documentada para un borrado futuro debe ejecutarse
en una sola transacción:

```sql
begin;
select set_config(
  'kinecheck.hotmart_purchase_delete_reason',
  'ticket/contexto y motivo del borrado',
  true
);
delete from public.hotmart_purchases where ...;
commit;
```

El trigger posterior registra la fila eliminada sin correo en claro, el motivo,
rol activo, usuario de sesión, aplicación y transacción. Esto no vuelve
inmutable una acción del propietario de la base, pero evita el borrado
accidental o silencioso por las rutas ordinarias.

## Evidencia de regresión

El test ejecuta exactamente la secuencia A/B solicitada para
`PURCHASE_REFUNDED` y `PURCHASE_CHARGEBACK`:

1. con las migraciones anteriores, el resultado reproducido es
   `course_access.active=false`, ligado a `tx-old`;
2. con la migración nueva, A queda `revoked`, B queda `active` y el acceso
   permanece `active`, ligado a `tx-new` y a `PURCHASE_APPROVED`;
3. un `DELETE` sin motivo falla y conserva la compra; el mismo borrado con un
   motivo transaccional queda registrado en la auditoría;
4. la migración se aplica dos veces y conserva exactamente un trigger de cada
   tipo.

Resultado local de la suite Hotmart ampliada: 12 tests aprobados, 0 fallos. La
primera ejecución del
borrador detectó además que el rollup excedía el límite de argumentos de
PostgreSQL; se corrigió dividiendo el JSON en dos bloques concatenados antes del
pase final.

## Impacto sobre datos existentes

- La migración no hace `INSERT`, `UPDATE` ni `DELETE` sobre compras o licencias
  existentes y no reconstruye los siete registros QA.
- La tabla de auditoría comienza a registrar cambios desde el despliegue; no
  puede reconstruir el borrado histórico de la octava fila.
- Los snapshots diarios futuros mantienen las claves antiguas con su semántica
  total y agregan los cuatro contadores comercial/QA más
  `unclassified_purchases`. Los snapshots ya guardados no se reescriben.
- Un borrado administrativo que antes podía ejecutarse directamente ahora
  requiere rol autorizado, transacción y motivo; el webhook no usa `DELETE`.

## Invariantes de producción al auditar

| Invariante | Hallazgos |
| --- | ---: |
| Compra activa sin acceso activo esperado | 0 |
| Acceso Hotmart activo sin compra activa | 0 |
| Compra revocada con acceso activo y sin alternativa | 0 |
| `transaction_id` en múltiples productos | 0 |
| `event_id` duplicado | 0 |

## Riesgos pendientes

- La auditoría nueva es trazable pero no criptográficamente inmutable: el
  propietario de la base puede alterarla. `hotmart_webhook_events` sigue sin
  una protección equivalente.
- Las cinco funciones críticas desplegadas que carecían de source-of-truth se
  versionan en una migración separada. Sus cuerpos normalizados coinciden con
  producción y sus permisos siguen limitados a `postgres`/`service_role`.
- Si Hotmart omite o envía una fecha inválida, el webhook usa la hora de
  recepción. Eso conserva disponibilidad, pero reduce la certeza del orden.
- No se debe aplicar esta migración directamente a producción sin validarla en
  una rama/local y revisar advisors.

## Plan de migración idempotente

1. Capturar en lectura los conteos e invariantes de compras, accesos y eventos.
2. Aplicar la migración en branch/staging y volver a aplicarla para comprobar
   idempotencia: debe quedar una tabla de auditoría y exactamente un trigger de
   guarda de acceso, uno de guarda de borrado y uno de auditoría.
3. Ejecutar allí REFUND y CHARGEBACK tardíos A/B, webhook duplicado, evento
   fuera de orden y borrado sin/con motivo. No usar datos copiados de clientes.
4. Ejecutar advisors de seguridad y rendimiento tras el DDL; documentar o
   resolver cualquier hallazgo nuevo.
5. Aplicar la misma migración transaccional en producción. No contiene DML sobre
   compras/licencias existentes ni despliegue de Edge Functions.
6. Verificar inmediatamente privilegios, tres triggers, auditoría vacía o sólo
   con cambios posteriores, invariantes y un rollup. Las claves históricas deben
   conservar los totales y las cinco claves explícitas deben separar
   comercial/QA/no clasificado.
7. Observar al menos un ciclo de `daily_operations` antes de autorizar la compra
   real controlada. Ante un fallo, detener la prueba comercial y preferir una
   corrección hacia adelante; no eliminar la auditoría ya capturada.

## Estado de staging remoto

`STAGING_REMOTE = BLOCKED_BY_PLAN`

La organización actual no dispone de Supabase Branching ni de otro proyecto de
staging. El bloqueo corresponde exclusivamente a la limitación del plan actual;
no es un fallo técnico del parche, de las migraciones ni de los tests. No se
reintentará crear una branch ni se cambiará el plan durante esta fase.

## Rollback

Mientras el parche siga sólo en Git, el rollback consiste en revertir los
commits documentales en orden inverso y luego el funcional. No existe estado de
base que restaurar porque producción no fue modificada.

Después de un despliegue futuro, cualquier rollback debe hacerse mediante una
nueva migración forward: retirar el trigger de consistencia si fuera el origen,
restaurar las definiciones previas de `has_course_access()` y del rollup, y
conservar la tabla de auditoría y su historial. Las cinco funciones operativas
versionadas no requieren rollback porque coinciden con producción.

## Gate recomendado

`LOCAL_PATCH = GO`

`PRODUCTION_DEPLOY = NO_GO`

El staging remoto fue definido como gate obligatorio y no existe actualmente
otro mecanismo aislado equivalente que reproduzca Supabase con fidelidad
suficiente. La validación local con PGlite respalda `LOCAL_PATCH = GO`, pero no
autoriza por sí sola un despliegue a producción.

Para reconsiderar este `NO_GO` se debe disponer de staging remoto o de un
entorno aislado equivalente, aplicar y reaplicar las dos migraciones, ejecutar
advisors antes y después, el workflow completo y la matriz sintética. Sólo si
ese gate queda verde corresponde hacer la revisión humana final del diff y
definir un nuevo gate de producción. La compra real controlada continúa fuera
de alcance hasta entonces.
