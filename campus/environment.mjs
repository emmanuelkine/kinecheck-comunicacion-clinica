export function isCampusPreviewHost(hostname) {
 const host=String(hostname||'').toLowerCase();
 const project='kinecheck-comunicacion-clinica.pages.dev';
 return host===project||host.endsWith('.'+project);
}
