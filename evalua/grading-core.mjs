/**
 * KineCheck Evalúa — cálculo verificable y validación de resultados.
 * No procesa datos personales ni llama a servicios externos.
 * El modelo nunca determina la nota final.
 */
export function calcularNota(puntaje, maximo, exigencia = 60) {
  if (![puntaje,maximo,exigencia].every(Number.isFinite) ||
      maximo <= 0 || puntaje < 0 || puntaje > maximo ||
      exigencia <= 0 || exigencia >= 100) {
    throw new RangeError("Puntaje, máximo o exigencia inválidos");
  }
  const proporcion = puntaje / maximo;
  const umbral = exigencia / 100;
  const nota = proporcion <= umbral
    ? 1 + (3 * proporcion / umbral)
    : 4 + (3 * (proporcion - umbral) / (1 - umbral));
  return Math.round((nota + Number.EPSILON) * 10) / 10;
}

export function validarPropuesta(rubrica, propuesta) {
  if (!Array.isArray(rubrica?.criterios) || !rubrica.criterios.length) {
    throw new Error("Rúbrica estructurada obligatoria");
  }
  if (!Array.isArray(propuesta?.criterios)) {
    throw new Error("Faltan resultados por criterio");
  }
  const ids = new Set();
  const resultados = [];
  let revisionRequerida = false;
  let total = 0;
  for (const criterio of rubrica.criterios) {
    if (!criterio.id || ids.has(criterio.id) ||
        !Array.isArray(criterio.niveles) || !criterio.niveles.length) {
      throw new Error("Rúbrica inválida o con criterios duplicados");
    }
    ids.add(criterio.id);
    const matches = propuesta.criterios.filter(x => x.criterio_id === criterio.id);
    if (matches.length !== 1) throw new Error("Falta un criterio o está duplicado");
    const evaluado = matches[0];
    const nivel = criterio.niveles.find(x => x.id === evaluado.nivel_id);
    const evidencia = typeof evaluado.evidencia === "string" ? evaluado.evidencia.trim() : "";
    const justificacion = typeof evaluado.justificacion === "string" ? evaluado.justificacion.trim() : "";
    const revisar = evaluado.revision_requerida === true ||
      !nivel || !evidencia || !justificacion;
    if (revisar) revisionRequerida = true;
    if (nivel && (!Number.isFinite(nivel.puntos) || nivel.puntos < 0)) {
      throw new Error("Nivel con puntaje inválido");
    }
    const puntos = revisar ? null : nivel.puntos;
    if (puntos !== null) total += puntos;
    resultados.push({
      criterio_id: criterio.id,
      nivel_id: nivel?.id ?? null,
      puntos,
      evidencia,
      justificacion,
      mejora: String(evaluado.mejora ?? ""),
      fuente: String(evaluado.fuente ?? ""),
      revision_requerida: revisar
    });
  }
  if (propuesta.criterios.some(x => !ids.has(x.criterio_id))) {
    throw new Error("La propuesta inventó criterios ajenos a la rúbrica");
  }
  const maximo = rubrica.criterios.reduce((sum,c) => {
    const puntos = c.niveles.map(n=>n.puntos);
    if (puntos.some(p=>!Number.isFinite(p) || p<0)) throw new Error("Puntaje de nivel inválido");
    return sum + Math.max(...puntos);
  },0);
  if (maximo <= 0) throw new Error("Puntaje máximo inválido");
  return {
    criterios: resultados,
    puntaje_provisional: Math.round(total*100)/100,
    puntaje_maximo: maximo,
    revision_requerida: revisionRequerida,
    nota_propuesta: revisionRequerida ? null : calcularNota(total,maximo,rubrica.exigencia ?? 60),
    aprobacion_docente_pendiente: true
  };
}
