(() => {
  "use strict";
  if (document.getElementById("kc-feedback")) return;

  const page = location.pathname.startsWith("/gratis/pacientes/")
    ? "/gratis/pacientes/"
    : location.pathname.startsWith("/gratis/profesionales/")
      ? "/gratis/profesionales/"
      : "/gratis/";
  const root = document.createElement("section");
  root.id = "kc-feedback";
  root.className = "kc-fb-wrap";
  root.setAttribute("aria-labelledby", "kc-fb-title");
  root.innerHTML = `
    <style>
      #kc-feedback{max-width:1100px;margin:42px auto;padding:0 22px;color:#e6faf8;font-family:system-ui,sans-serif}
      #kc-feedback *{box-sizing:border-box}
      #kc-feedback .kc-fb-box{background:linear-gradient(145deg,#102d35,#0b252c);border:1px solid #3b8388;border-radius:18px;padding:clamp(19px,3vw,32px)}
      #kc-feedback h2{font-size:clamp(1.3rem,2.4vw,1.8rem);margin:0 0 9px}
      #kc-feedback h3{font-size:1.05rem;margin:22px 0 9px}
      #kc-feedback p{margin:6px 0 16px;color:#c9e5e5;overflow-wrap:anywhere}
      #kc-feedback .kc-fb-summary{display:grid;grid-template-columns:minmax(170px,.8fr) 1.2fr;gap:20px;align-items:center;margin:19px 0 23px;padding:18px;background:#0a222a;border:1px solid #28565f;border-radius:14px}
      #kc-feedback .kc-fb-average{font-size:2rem;font-weight:850;color:#fff0ad}#kc-feedback .kc-fb-average span{color:#ffce58;letter-spacing:.08em}
      #kc-feedback .kc-fb-average p{font-size:.92rem;font-weight:400;line-height:1.5;margin:8px 0 0}
      #kc-feedback .kc-fb-average .kc-fb-summary-stars{display:inline-block;color:transparent;background:linear-gradient(90deg,#ffce58 var(--kc-fb-fill),#819b9b var(--kc-fb-fill));background-clip:text;-webkit-background-clip:text}
      #kc-feedback .kc-fb-row{display:grid;grid-template-columns:42px 1fr 34px;gap:9px;align-items:center;font-size:.9rem;color:#d3e9e8}
      #kc-feedback .kc-fb-track{height:9px;border-radius:99px;background:#24444a;overflow:hidden}#kc-feedback .kc-fb-fill{height:100%;background:linear-gradient(90deg,#50bdb7,#a4f3e8);border-radius:99px}
      #kc-feedback .kc-fb-ratings{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0 19px}
      #kc-feedback .kc-fb-ratings label{display:flex;align-items:center;justify-content:center;gap:5px;flex:1;min-width:52px;padding:10px 7px;border:1px solid #5faaa9;border-radius:10px;cursor:pointer;transition:background .15s,border-color .15s}
      #kc-feedback .kc-fb-ratings input{position:absolute;opacity:0;width:1px;height:1px}
      #kc-feedback .kc-fb-star{color:#819b9b;font-size:1.55rem;line-height:1}#kc-feedback .kc-fb-number{font-size:.88rem}
      #kc-feedback .kc-fb-ratings label:has(input:checked),#kc-feedback .kc-fb-ratings label:has(input:focus-visible){background:#225d62;border-color:#a1fff1;outline:2px solid #a1fff1;outline-offset:2px}
      #kc-feedback .kc-fb-ratings label:has(input:checked) .kc-fb-star,#kc-feedback .kc-fb-ratings label:has(input:focus-visible) .kc-fb-star{color:#ffce58}
      #kc-feedback select,#kc-feedback textarea{display:block;width:100%;background:#0a222a;color:white;border:1px solid #5faaa9;border-radius:9px;padding:11px;font:inherit;margin:7px 0 14px}
      #kc-feedback button{background:#8ef0e6;border:0;color:#082d31;border-radius:9px;padding:12px 22px;font-weight:800;cursor:pointer}#kc-feedback button:disabled{opacity:.65;cursor:wait}
      #kc-feedback .kc-fb-note{font-size:.84rem;color:#c5dddd}#kc-feedback [role=status]{font-weight:700;min-height:1.5em}
      #kc-feedback .kc-fb-comments{display:grid;gap:10px}#kc-feedback .kc-fb-comment{border-left:3px solid #4eaaa6;padding:8px 13px;background:#0d292f;border-radius:0 9px 9px 0}
      #kc-feedback .kc-fb-comment p{margin:4px 0;color:#e4f3f2}#kc-feedback .kc-fb-comment small{color:#9fcecd}
      @media(max-width:600px){#kc-feedback{padding:0 14px;margin:30px auto}#kc-feedback .kc-fb-summary{grid-template-columns:1fr;gap:12px}#kc-feedback .kc-fb-row{grid-template-columns:35px 1fr 28px}#kc-feedback .kc-fb-ratings{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}#kc-feedback .kc-fb-ratings label{min-width:0;min-height:54px;flex-direction:column;gap:4px;padding:8px 2px}}
      @media(prefers-reduced-motion:reduce){#kc-feedback *{scroll-behavior:auto;transition:none}}
    </style>
    <div class="kc-fb-box">
      <h2 id="kc-fb-title">Opiniones de nuestra comunidad</h2>
      <p>Promedio, estrellas y comentarios auténticos aprobados durante los últimos 30 días. No pedimos tu nombre ni correo.</p>
      <div class="kc-fb-summary" aria-live="polite"><div id="kc-fb-average">Cargando valoraciones…</div><div id="kc-fb-distribution"></div></div>
      <div id="kc-fb-comments-block" hidden><h3>Comentarios anónimos moderados</h3><div class="kc-fb-comments" id="kc-fb-comments"></div></div>
      <form>
        <h3>Comparte tu experiencia</h3>
        <fieldset style="border:0;padding:0;margin:0"><legend>Califica tu experiencia de 1 a 5 estrellas</legend><div class="kc-fb-ratings"></div></fieldset>
        <label for="kc-fb-area">¿Qué mejorarías?</label>
        <select id="kc-fb-area" name="area" required><option value="nada">Nada, me gustó</option><option value="contenido">Más contenido</option><option value="navegacion">Encontrar recursos</option><option value="diseno">Diseño e imágenes</option><option value="descargas">Descargas y PDF</option><option value="otro">Otra sugerencia</option></select>
        <label for="kc-fb-comment">Cuéntanos más (opcional)</label>
        <textarea id="kc-fb-comment" name="comment" rows="3" maxlength="500" placeholder="No incluyas nombres, datos de contacto ni información de salud."></textarea>
        <label class="kc-fb-honey" aria-hidden="true">Deja este campo vacío<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
        <button type="submit">Enviar opinión anónima</button>
        <p class="kc-fb-note">Las valoraciones y comentarios aparecen después de moderación. No pedimos nombre ni correo; las respuestas se eliminan después de 90 días.</p>
        <p role="status" aria-live="polite"></p>
      </form>
    </div>`;
  const target = document.querySelector("main") || document.body;
  target.after(root);
  const style = root.querySelector("style");
  style.textContent += "#kc-feedback .kc-fb-honey{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}";

  const ratings = root.querySelector(".kc-fb-ratings");
  ratings.innerHTML = [1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="rating" value="${n}" required aria-label="${n} de 5 estrellas"><span class="kc-fb-star" aria-hidden="true">★</span><span class="kc-fb-number">${n}</span></label>`).join("");
  const form = root.querySelector("form");
  const status = root.querySelector('[role="status"]');

  async function loadSummary() {
    const averageNode = root.querySelector("#kc-fb-average");
    const distributionNode = root.querySelector("#kc-fb-distribution");
    try {
      const response = await fetch("/api/library-feedback", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("No fue posible cargar las valoraciones.");
      const data = await response.json();
      averageNode.replaceChildren();
      const avg = document.createElement("div");
      avg.className = "kc-fb-average";
      avg.textContent = data.count ? `${data.average} / 5` : "Aún sin valoraciones";
      if (data.count) {
        const stars = document.createElement("span");
        stars.textContent = "★★★★★";
        stars.className = "kc-fb-summary-stars";
        stars.style.setProperty("--kc-fb-fill", `${Math.max(0, Math.min(100, Number(data.average) * 20))}%`);
        stars.setAttribute("aria-label", `${data.average} de 5 estrellas`);
        avg.append(stars);
      }
      const count = document.createElement("p");
      count.textContent = `${data.count} ${data.count === 1 ? "evaluación" : "evaluaciones"} aprobadas`;
      avg.append(count);
      averageNode.append(avg);
      distributionNode.replaceChildren();
      [5, 4, 3, 2, 1].forEach((rating) => {
        const countForRating = Number(data.distribution?.[rating - 1] || 0);
        const row = document.createElement("div");
        row.className = "kc-fb-row";
        const label = document.createElement("span"); label.textContent = `${rating} ★`;
        const track = document.createElement("div"); track.className = "kc-fb-track"; track.setAttribute("aria-hidden", "true");
        const fill = document.createElement("div"); fill.className = "kc-fb-fill"; fill.style.width = `${data.count ? Math.round(countForRating * 100 / data.count) : 0}%`; track.append(fill);
        const countNode = document.createElement("span"); countNode.textContent = String(countForRating);
        row.append(label, track, countNode); distributionNode.append(row);
      });
      const comments = root.querySelector("#kc-fb-comments");
      comments.replaceChildren();
      (data.comments || []).forEach((item) => {
        const article = document.createElement("article"); article.className = "kc-fb-comment";
        const stars = document.createElement("small"); stars.textContent = `${"★".repeat(item.rating)} · Anónimo`;
        const date = document.createElement("time"); date.dateTime = item.createdAt;
        date.textContent = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.createdAt));
        stars.append(document.createTextNode(" · "), date);
        const quote = document.createElement("p"); quote.textContent = item.comment;
        article.append(stars, quote); comments.append(article);
      });
      root.querySelector("#kc-fb-comments-block").hidden = !comments.childElementCount;
    } catch {
      averageNode.textContent = "Las valoraciones no están disponibles por ahora.";
      distributionNode.replaceChildren();
    }
  }

  loadSummary();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Enviando…";
    try {
      const response = await fetch("/api/library-feedback", {
        method: "POST",
        headers: { "content-type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ rating: data.get("rating"), area: data.get("area"), comment: data.get("comment"), page, website: data.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No fue posible enviar la opinión.");
      form.reset();
      status.textContent = "Gracias. Tu valoración quedó registrada y aparecerá tras la moderación.";
      loadSummary();
    } catch (error) {
      status.textContent = error.message || "No se pudo enviar la opinión.";
    } finally {
      button.disabled = false;
    }
  });
})();
