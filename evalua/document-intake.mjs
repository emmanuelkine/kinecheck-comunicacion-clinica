/**
 * KineCheck Evalúa — validación local de archivos y manifiesto de ingreso.
 * No envía, almacena ni interpreta documentos. La extracción real será
 * exclusivamente en backend autenticado, después de definir privacidad.
 */
export const LIMITES = Object.freeze({
  trabajosGratis: 5,
  maxBytesPorArchivo: 15 * 1024 * 1024,
  maxFuentes: 20
});
const EXTENSIONES = Object.freeze({
  rubrica: [".pdf",".docx",".xlsx"],
  fuente: [".pdf",".docx",".xlsx",".pptx",".txt"],
  trabajo: [".pdf"]
});
const TIPOS = Object.freeze({
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"]
});
export function validarArchivo(archivo, rol) {
  if (!EXTENSIONES[rol]) throw new Error("Rol de documento desconocido");
  if (!archivo || typeof archivo.name !== "string" || !Number.isFinite(archivo.size))
    throw new Error("Archivo inválido");
  const nombre = archivo.name.normalize("NFC").trim();
  if (!nombre || nombre.length > 180 || /[\\/\u0000-\u001f]/.test(nombre))
    throw new Error("Nombre de archivo no permitido");
  const ext = nombre.slice(nombre.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONES[rol].includes(ext)) throw new Error("Formato no admitido para " + rol);
  if (archivo.size <= 0 || archivo.size > LIMITES.maxBytesPorArchivo)
    throw new Error("Archivo vacío o superior a 15 MB");
  // MIME del navegador no es una prueba de seguridad: el servidor debe
  // verificar también firma, contenido y descompresión de contenedores.
  if (archivo.type && !TIPOS[ext].includes(archivo.type))
    throw new Error("Tipo de archivo incompatible con su extensión");
  return { nombre, extension: ext, bytes: archivo.size, rol };
}
export function prepararManifiesto({ rubrica, fuentes = [], trabajos = [], plan = "gratis" }) {
  if (!rubrica) throw new Error("La rúbrica es obligatoria");
  if (!Array.isArray(fuentes) || !Array.isArray(trabajos))
    throw new Error("Listas de documentos inválidas");
  if (trabajos.length === 0) throw new Error("Agrega al menos un trabajo");
  if (plan === "gratis" && trabajos.length > LIMITES.trabajosGratis)
    throw new Error("Plan Gratis: máximo 5 trabajos por evaluación");
  if (fuentes.length > LIMITES.maxFuentes)
    throw new Error("Máximo 20 fuentes complementarias");
  return {
    version: 1,
    modo: "fuentes_cerradas",
    rubrica: validarArchivo(rubrica,"rubrica"),
    fuentes: fuentes.map(x=>validarArchivo(x,"fuente")),
    trabajos: trabajos.map(x=>validarArchivo(x,"trabajo")),
    requiereAutenticacion: true,
    requiereRevisionDocente: true,
    extraccionPendiente: true
  };
}
