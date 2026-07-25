# Configuración Hotmart — KineCheck Comunicación Clínica

Esta carpeta está preparada para integrarse al catálogo del ecosistema KineCheck.

## Campos que debes completar

Abre `data.json` y completa:

- `hotmart.productId`
- `hotmart.checkoutUrl`
- `hotmart.membersAreaUrl`
- `hotmart.supportEmail`
- En cada elemento de `ecosystem`, completa `checkoutUrl` o `membersUrl`.

Los botones de Hotmart permanecen desactivados mientras esos campos estén vacíos.

## Entrega recomendada

### Opción A — Hotmart Club

Crea el producto como curso online, agrégalo a tu Hotmart Club y usa las páginas de contenido para presentar el acceso a la aplicación.

### Opción B — Área de miembros externa

Publica esta aplicación en tu dominio y configura ese dominio como área de miembros externa. Para acceso automático y seguro, implementa un backend que reciba los eventos de compra de Hotmart y valide el estado del comprador.

## Importante

Esta versión es una aplicación web estática. No incluye validación real de compra, sesión de usuario ni bloqueo por transacción. No publiques tokens, Hottok ni secretos dentro de JavaScript, JSON o HTML.
