# Métricas institucionales — contrato funcional (piloto)
La versión actual es una demo aislada. No conectar eventos de prueba con métricas reales.

## Indicadores
- Publicadas: horas únicas publicadas en el período.
- Contactos: clics registrados hacia el canal de reserva; **no** equivalen a pacientes ni reservas.
- Recuperadas: horas marcadas como agendadas por un usuario institucional autorizado, con hora y actor auditables.
- Tasa: recuperadas / publicadas, evitando contar la misma hora más de una vez.
- Ingreso potencial estimado: recuperadas × tarifa informada por institución. Nunca mostrar como ingreso real ni cobrado.

## Acceso
Cada institución ve exclusivamente sus horas; administrador global solo con rol de servidor verificado. Nunca usar correo, identificadores suministrados por el navegador o una clave pública como prueba de autorización.

## Requisitos de activación
1. Vincular slots a institución mediante FK validada y membresía activa.
2. Crear RPC transaccional para confirmación, impedir dobles conteos y registrar cambios.
3. Registrar contactos sin datos de pacientes; límites antiabuso y deduplicación explícita.
4. Separar staging de producción, probar RLS con dos instituciones y un usuario ajeno.
5. Panel con período, fecha de actualización, estado sin datos y exportación agregada.
6. Confirmar que la reserva sigue ocurriendo en la agenda oficial.
7. Revisar pruebas automatizadas, accesibilidad y móvil antes de fusionar.
