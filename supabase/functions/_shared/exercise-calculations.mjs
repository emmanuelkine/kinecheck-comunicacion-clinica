const finite = (value) => typeof value === "number" && Number.isFinite(value);
const positive = (value, name) => {
  if (!finite(value) || value <= 0) throw new Error(`${name} debe ser mayor que cero.`);
};
const integerIn = (value, min, max, name) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
};
const round = (value, digits = 1) => Number(value.toFixed(digits));

export function calculate(action, input = {}) {
  switch (action) {
    case "estimate-1rm": {
      positive(input.load, "La carga");
      integerIn(input.reps, 1, 7, "Las repeticiones");
      const epley = input.load * (1 + input.reps / 30);
      const brzycki = input.load * (36 / (37 - input.reps));
      return { label: `Estimación Epley: ${round(epley)} kg · Brzycki: ${round(brzycki)} kg. Son estimaciones de 1RM, no cargas objetivo ni indicación clínica.` };
    }
    case "rpe-rir": {
      if (!finite(input.rpe) || input.rpe < 0 || input.rpe > 10 || !finite(input.rir) || !Number.isInteger(input.rir) || input.rir < 0 || input.rir > 10) throw new Error("RPE debe estar entre 0 y 10; RIR, entre 0 y 10 repeticiones.");
      return { label: `RPE registrado: ${round(input.rpe, 1)}/10 · RIR estimado: ${input.rir}. Se mantienen como valoraciones separadas, sin conversión automática.` };
    }
    case "volume-load": {
      integerIn(input.sets, 1, 100, "Las series");
      integerIn(input.reps, 1, 200, "Las repeticiones");
      positive(input.load, "La carga");
      return { label: `Volumen-carga calculado: ${round(input.sets * input.reps * input.load)} kg·repeticiones. Métrica de seguimiento; no equivale a dosis clínica.` };
    }
    case "load-variation": {
      positive(input.previous, "La carga del período anterior");
      if (!finite(input.current) || input.current < 0) throw new Error("La carga actual debe ser cero o mayor.");
      const percent = ((input.current - input.previous) / input.previous) * 100;
      return { label: `Variación: ${round(percent)}% (anterior ${round(input.previous)}; actual ${round(input.current)}). No es un umbral de seguridad ni una regla de progresión.` };
    }
    case "heart-rate-reserve": {
      positive(input.maxHr, "La frecuencia cardíaca máxima medida");
      positive(input.restHr, "La frecuencia cardíaca de reposo");
      if (!Number.isInteger(input.maxHr) || !Number.isInteger(input.restHr) || input.maxHr > 250 || input.maxHr < 50 || input.restHr > 150 || input.restHr < 25 || input.restHr >= input.maxHr) throw new Error("Revisa la frecuencia cardíaca máxima y de reposo ingresadas.");
      if (!finite(input.intensity) || input.intensity < 1 || input.intensity > 100) throw new Error("La intensidad fraccional debe estar entre 1 y 100%.");
      const target = input.restHr + (input.maxHr - input.restHr) * (input.intensity / 100);
      return { label: `Resultado matemático por HRR: ${Math.round(target)} lpm a ${round(input.intensity, 0)}% de la reserva indicada. No se recomienda esta intensidad; interpreta con evaluación y contexto clínico.` };
    }
    default:
      throw new Error("Cálculo no disponible.");
  }
}
