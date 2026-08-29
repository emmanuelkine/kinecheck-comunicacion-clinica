# Tester Event Schema — Sprint 1

Especificación mínima para medir activación de testers sin capturar contenido clínico ni datos personales innecesarios.

## Eventos permitidos

1. `tester_invited`
2. `account_created`
3. `license_activated`
4. `academy_opened`
5. `product_opened`
6. `first_activity`
7. `return_session`

## Campos permitidos

```json
{
  "tester_id": "pseudonymous-id",
  "event": "product_opened",
  "product": "kinecheck-estudiante",
  "device_class": "mobile|tablet|desktop",
  "timestamp": "ISO-8601",
  "result": "success|normalized_error_code"
}
```

## Campos prohibidos

No registrar:

- nombre o apellidos;
- RUT;
- teléfono o correo en el evento;
- nombre o identificadores de pacientes;
- número de ficha;
- diagnósticos, síntomas o texto clínico libre;
- fotografías o archivos clínicos;
- tokens, contraseñas o credenciales;
- texto libre enviado por el tester.

## Reglas de implementación

- `tester_id` debe ser seudónimo y no derivarse directamente del correo.
- `product` debe usar un slug controlado.
- `result` debe usar códigos normalizados; no mensajes de error con datos de sesión.
- No incorporar un proveedor externo de analítica en Sprint 1 sin autorización separada.
- No usar este esquema para medir Recupera mientras permanezca `Próximamente`.
- La instrumentación debe poder deshabilitarse sin afectar acceso, SSO o licencias.

## Métricas derivadas

- activación: `license_activated / tester_invited`;
- primer uso: `product_opened / license_activated`;
- actividad inicial: `first_activity / product_opened`;
- retorno: `return_session / product_opened`.

Estas métricas describen comportamiento observado. No permiten inferir por sí solas satisfacción, intención de compra ni causa de abandono.
