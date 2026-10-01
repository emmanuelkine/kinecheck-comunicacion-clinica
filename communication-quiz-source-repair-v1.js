// Repair the legacy communication renderer's empty conditional CSS token.
// Content, answer keys and scoring remain in the authorized protected source.
export function repairCommunicationQuizSource(source, courseSlug) {
  if (courseSlug !== "comunicacion-clinica") return source;
  return source.replace(
    /\.classList\.add\(([^();\n]*\?[^();\n]*:\s*(?:""|''))\)/g,
    '.classList.add(...[$1].filter(token => token !== ""))',
  );
}
