# KineCheck — checklist de data room privado

**Propósito:** reunir la evidencia administrativa y comercial que no debe almacenarse en el repositorio público.

---

## 1. Regla de seguridad

Este archivo solo enumera documentos. **No subir a GitHub público**:
- RUT/cédulas;
- certificados tributarios;
- claves;
- cartolas bancarias;
- liquidaciones con datos de compradores;
- correos/telefonía de contactos;
- contratos con datos personales;
- documentos con secretos Hotmart/Supabase;
- bases de usuarios.

Usar un repositorio privado con acceso restringido y respaldo.

---

## 2. Estructura sugerida

```text
KINECHECK_DATA_ROOM_PRIVADO/
├── 01_LEGAL_Y_SOCIEDAD/
├── 02_TRIBUTARIO_SII/
├── 03_VENTAS_HOTMART/
├── 04_COSTOS_Y_PROVEEDORES/
├── 05_PROPIEDAD_INTELECTUAL/
├── 06_EQUIPO/
├── 07_ALIANZAS/
├── 08_PILOTOS_Y_TRACCION/
├── 09_FINANCIAMIENTO/
└── 10_EVIDENCIA_TECNICA/
```

---

## 3. Legal y sociedad

- [ ] Identificación de la persona jurídica o persona natural que postulará.
- [ ] RUT postulante.
- [ ] Constitución/estatutos si corresponde.
- [ ] Certificado de vigencia.
- [ ] Poder/representación legal.
- [ ] Estructura de propiedad/participaciones.
- [ ] Declaraciones de empresas relacionadas cuando las bases lo pidan.
- [ ] Domicilio/región acreditable.

---

## 4. Tributario SII

- [ ] Inicio de actividades primera categoría.
- [ ] Fecha exacta de inicio.
- [ ] Giro(s) vigente(s).
- [ ] Carpeta tributaria para solicitar créditos o equivalente requerido.
- [ ] Ventas netas 12 meses.
- [ ] Ventas por año calendario cuando el fondo lo exija.
- [ ] Deudas tributarias/previsionales cuando corresponda.
- [ ] Formularios/declaraciones exigidas por bases.

### Salida maestra

Crear una ficha de una página con:
`postulante | RUT | inicio actividades | antigüedad | región | giro | ventas 12m | ventas año anterior | representante legal`

---

## 5. Ventas y Hotmart

- [ ] Export de ventas por periodo.
- [ ] Compras aprobadas.
- [ ] Reembolsos/chargebacks/cancelaciones.
- [ ] Ventas netas.
- [ ] Liquidaciones/payouts.
- [ ] Producto comprado.
- [ ] Moneda/precio.
- [ ] Comisiones reales.
- [ ] Conciliación con documentos tributarios.

### Regla

Preparar una tabla agregada sin PII para postulaciones:
`mes | compras aprobadas | compras netas | reembolsos | bruto | fees | neto`

---

## 6. Costos y proveedores

- [ ] Dominio.
- [ ] Hosting/CDN.
- [ ] Supabase/infraestructura.
- [ ] Servicios de diseño/desarrollo.
- [ ] Producción audiovisual.
- [ ] Publicidad.
- [ ] Contabilidad.
- [ ] Legal/IP.
- [ ] Servicios profesionales.
- [ ] Software de terceros.

Para cada costo:
`proveedor | fecha | concepto | monto neto | IVA | total | recurrente/no recurrente | WP asociado`

---

## 7. Propiedad intelectual

- [ ] Titularidad de marca KineCheck / estado de solicitud o registro si existe.
- [ ] Titularidad del dominio.
- [ ] Titularidad/autorización del código.
- [ ] Titularidad de contenidos propios.
- [ ] Contratos de cesión/licencia con colaboradores si corresponde.
- [ ] Licencias de imágenes, fuentes, audiovisuales y terceros.
- [ ] Inventario de activos premium.
- [ ] Estrategia de secreto empresarial cuando corresponda.

No declarar patente o registro inexistente.

---

## 8. Equipo

- [ ] CV fundador.
- [ ] Títulos/certificados relevantes cuando los soliciten.
- [ ] Experiencia clínica/docente/negocio verificable.
- [ ] Carta de dedicación al proyecto.
- [ ] CV de equipo/consultores.
- [ ] Rol y horas mensuales.
- [ ] Brechas de capacidad y contratación prevista.

---

## 9. Alianzas

Por cada institución:
- [ ] contacto institucional;
- [ ] minuta de reunión;
- [ ] rol propuesto;
- [ ] carta de interés/apoyo;
- [ ] convenio si aplica;
- [ ] aporte valorizado si bases lo permiten;
- [ ] cohorte/beneficiarios autorizados;
- [ ] duración del compromiso.

---

## 10. Pilotos y tracción

- [ ] protocolo del piloto;
- [ ] consentimientos;
- [ ] número agregado de participantes;
- [ ] logs/métricas anonimizadas;
- [ ] resultados pre/post;
- [ ] satisfacción;
- [ ] testimonios con autorización;
- [ ] incidencias y mejoras;
- [ ] evidencia fotográfica solo con permisos correspondientes.

---

## 11. Financiamiento

Crear una carpeta por convocatoria:

```text
CORFO_EXPANDE_YYYY/
├── bases/
├── elegibilidad/
├── formulario/
├── presupuesto/
├── cotizaciones/
├── anexos/
├── cartas/
├── pitch/
└── version_final/
```

Guardar la versión exacta enviada y todos los anexos usados.

---

## 12. Evidencia técnica

- [ ] PRD.
- [ ] arquitectura.
- [ ] diagramas.
- [ ] QA.
- [ ] seguridad/privacidad.
- [ ] release/tag usado en postulación.
- [ ] demo estable.
- [ ] respaldo de disponibilidad/DR cuando corresponda.

No entregar secretos ni código premium si el fondo no lo requiere.

---

## 13. Hard gate actual

Antes de definir elegibilidad de CORFO/Sercotec/Start-Up Chile, aún se requiere completar al menos:

- postulante legal;
- RUT;
- fecha inicio SII;
- giro;
- región tributaria;
- ventas netas verificadas últimos 12 meses;
- ventas atribuibles a KineCheck;
- número de clientes pagadores netos.

Sin esos antecedentes puede prepararse el proyecto, pero no debe afirmarse elegibilidad definitiva para instrumentos dependientes de antigüedad o ventas.
