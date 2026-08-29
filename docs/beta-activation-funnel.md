# TF-008 — Embudo mínimo de activación y retorno beta

## Objetivo

Medir en qué etapa se encuentra la activación de testers beta sin inferir las causas de la inactividad y sin incorporar datos clínicos ni datos personales innecesarios.

Esta especificación es documental. **No autoriza todavía instrumentación en Supabase, analítica externa ni cambios de producción.** Cualquier implementación requiere una decisión explícita posterior sobre el método de recolección.

## Embudo mínimo

1. `tester_invited`
2. `account_created`
3. `license_activated`
4. `academy_opened`
5. `product_opened`
6. `first_activity`
7. `return_session`

Cada etapa representa únicamente un estado observable. La ausencia de una etapa posterior no debe interpretarse como desinterés, problema técnico, abandono u otra causa sin evidencia adicional.

## Definición operacional

| Evento | Se registra cuando | Propósito |
| --- | --- | --- |
| `tester_invited` | Se emite una invitación beta válida | Contar testers invitados |
| `account_created` | Existe una cuenta asociada al proceso beta | Medir creación de cuenta |
| `license_activated` | La licencia beta queda activa | Medir activación de acceso |
| `academy_opened` | Se registra la primera apertura de Academy | Medir acceso inicial |
| `product_opened` | Se abre por primera vez un producto habilitado | Medir llegada al producto |
| `first_activity` | Ocurre la primera interacción funcional definida para la beta | Medir primer uso observable |
| `return_session` | Existe una sesión posterior al primer uso, según la ventana que se defina antes de instrumentar | Medir retorno sin atribuir causa |

## Datos permitidos

La futura instrumentación debe aplicar minimización de datos. Como máximo, cada evento debería requerir:

- identificador técnico pseudónimo del tester;
- nombre normalizado del evento;
- fecha/hora del evento;
- producto o superficie KineCheck cuando sea necesario para interpretar el evento;
- versión o entorno técnico sólo cuando sea necesario para depuración o agregación.

El identificador técnico usado para analítica no debe ser un nombre, RUT, teléfono, correo electrónico ni texto introducido por el tester.

## Datos prohibidos en eventos de producto

No registrar:

- nombres o identificadores de pacientes;
- RUT;
- teléfonos;
- correos electrónicos;
- fotografías de pacientes;
- números de ficha clínica;
- texto libre clínico;
- contenido de casos que pueda identificar a una persona;
- diagnósticos, antecedentes de salud u otros datos sensibles como atributos analíticos;
- payloads completos de formularios o campos de texto libre.

## Métricas autorizables

Una vez definido y autorizado el método de recolección, el reporte beta podrá calcular únicamente métricas agregadas necesarias para el embudo, por ejemplo:

- número de testers invitados;
- número y proporción que alcanza cada etapa;
- conversión entre etapas consecutivas;
- número/proporción con primer uso;
- número/proporción con sesión de retorno.

Los resultados deben describirse como estados observados. Ejemplo correcto: “12 testers fueron invitados y 8 registraron activación de licencia”. Ejemplo incorrecto: “4 testers no activaron porque perdieron interés”.

## Decisiones pendientes antes de instrumentar

Antes de escribir eventos en producción se debe aprobar explícitamente:

1. fuente de datos y mecanismo de recolección;
2. identificador pseudónimo que se utilizará;
3. ventana temporal que define `return_session`;
4. retención de los eventos;
5. acceso al reporte y nivel de agregación;
6. validación de que la solución no incorpora datos personales o clínicos innecesarios.

## Criterio de avance de TF-008

Esta especificación cubre la definición del esquema y las reglas de privacidad. TF-008 **no debe cerrarse todavía**: faltan la autorización del método de recolección, su implementación posterior y la comprobación del reporte beta.