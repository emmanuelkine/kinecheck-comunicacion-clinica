/**
 * KineCheck Evalúa — extracción local de texto PDF.
 * Este módulo NO envía documentos a servicios externos.
 * Requiere pdfjs-dist instalado por el backend, no se ejecuta en la web pública.
 */
export async function extraerTextoPDF(bytes, { pdfjs, maxPaginas = 100, maxCaracteres = 300000 } = {}) {
  if (!pdfjs?.getDocument) throw new Error("Motor PDF no configurado");
  if (!(bytes instanceof Uint8Array) || bytes.length < 8) throw new Error("PDF inválido");
  if (new TextDecoder().decode(bytes.slice(0,5)) !== "%PDF-") throw new Error("Firma PDF inválida");
  const tarea = pdfjs.getDocument({data:bytes, useSystemFonts:true, disableFontFace:true});
  let doc;
  try {
    doc = await tarea.promise;
    if (doc.numPages > maxPaginas) throw new Error("PDF excede límite de páginas");
    const paginas = [];
    let acumulado = 0;
    for (let i=1;i<=doc.numPages;i++) {
      const pagina = await doc.getPage(i);
      const texto = await pagina.getTextContent();
      const contenido = texto.items.map(item=>typeof item.str==="string"?item.str:"").join(" ").trim();
      acumulado += contenido.length;
      if (acumulado > maxCaracteres) throw new Error("PDF excede límite de texto");
      paginas.push({pagina:i,texto:contenido,requiereOCR:contenido.length<15});
      pagina.cleanup();
    }
    return {formato:"pdf",numeroPaginas:doc.numPages,paginas,
      requiereRevision:paginas.some(p=>p.requiereOCR)};
  } finally {
    if (doc) await doc.destroy();
    else await tarea.destroy();
  }
}

/** Conserva referencias por página para verificar evidencias. */
export function buscarEvidencias(documento, frase) {
  if (!Array.isArray(documento?.paginas) || typeof frase!=="string" || !frase.trim())
    return [];
  const normalizar=s=>s.normalize("NFKC").replace(/\s+/g," ").trim().toLocaleLowerCase("es");
  const needle=normalizar(frase);
  return documento.paginas.filter(p=>normalizar(p.texto).includes(needle))
    .map(p=>({pagina:p.pagina,fragmento:frase}));
}
