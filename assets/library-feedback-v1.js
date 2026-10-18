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
  root.setAttribute("aria-labelledby", "kc-fb-title");
  root.innerHTML = `
    <style>
      #kc-feedback{max-width:1100px;margin:42px auto;padding:0 22px;color:#e6faf8;font-family:system-ui,sans-serif}
      #kc-feedback *{box-sizing:border-box}
      #kc-feedback .kc-fb-box{background:linear-gradient(145deg,#102d35,#0b252c);border:1px solid #3b8388;border-radius:18px;padding:clamp(19px,3vw,32px)}
      #kc-feedback h2{font-size:clamp(1.3rem,2.4vw,1.8rem);margin:0 0 9px}
      #kc-feedback p{margin:6px 0 16px;color:#c9e5e5;overflow-wrap:anywhere}
      #kc-feedback .kc-fb-summary{display:grid;grid-template-columns:minmax(170px,.8fr) 1.2fr;gap:20px;align-items:center;margin:19px 0 23px;padding:18px;background:#0a222a;border:1px solid #28565f;border-radius:14px}
      #kc-feedback .kc-fb-average{font-size:2rem;font-weight:850;color:#fff0ad}
      #kc-feedback .kc-fb-average .stars{display:inline-block;color:transparent;background:linear-gradient(90deg,#ffce58 var(--fill),#819b9b var(--fill));background-clip:text;-webkit-background-clip:text;letter-spacing:.08em}
      #kc-feedback .kc-fb-average p{font-size:.92rem;font-weight:400;line-height:1.5;margin:8px 0 0}
      #kc-feedback .kc-fb-row{display:grid;grid-template-columns:42px 1fr 34px;gap:9px;align-items:center;font-size:.9rem;color:#d3e9e8}
      #kc-feedback .track{height:9px;border-radius:99px;background:#24444a;overflow:hidden}
      #kc-feedback .fill{height:100%;background:linear-gradient(90deg,#50bdb7,#a4f3e8);border-radius:99px}
      #kc-feedback .ratings{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:13px 0 19px}
      #kc-feedback .ratings label{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 7px;border:1px solid #5faaa9;border-radius:10px;cursor:pointer}
      #kc-feedback .ratings input{position:absolute;opacity:0;width:1px;height:1px}
      #kc-feedback .star{color:#819b9b;font-size:1.7rem;line-height:1}
      #kc-feedback .ratings label:has(input:checked),#kc-feedback .ratings label:has(input:focus-visible){background:#225d62;border-color:#a1fff1;outline:2px solid #a1fff1;outline-offset:2px}
      #kc-feedback .ratings label:has(input:checked) .star,#kc-feedback .ratings label:has(input:focus-visible) .star{color:#ffce58}
      #kc-feedback button{background:#8ef0e6;border:0;color:#082d31;border-radius:9px;padding:12px 22px;font:inherit;font-weight:800;cursor:pointer}
      #kc-feedback button:disabled{opacity:.65;cursor:wait}
      #kc-feedback [role=status]{font-weight:700;min-height:1.5em}
      #kc-feedback .honey{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
      @media(max-width:600px){#kc-feedback{padding:0 14px;margin:30px auto}#kc-feedback .kc-fb-summary{grid-template-columns:1fr;gap:12px}#kc-feedback .kc-fb-row{grid-template-columns:35px 1fr 28px}#kc-feedback .ratings{gap:5px}#kc-feedback .ratings label{min-width:0;min-height:54px;flex-direction:column;gap:4px;padding:8px 2px}}
      @media(prefers-reduced-motion:reduce){#kc-feedback *{scroll-behavior:auto;transition:none}}
    </style>
    <div class="kc-fb-box">
      <h2 id="kc-fb-title">Puntúa la biblioteca gratuita</h2>
      <p>Elige de 1 a 5 estrellas. El promedio público muestra las valoraciones reales de los últimos 30 días.</p>
      <div class="kc-fb-summary" aria-live="polite"><div id="kc-fb-average">Cargando promedio…</div><div id="kc-fb-distribution"></div></div>
      <form>
        <fieldset style="border:0;padding:0;margin:0"><legend>Tu puntuación</legend><div class="ratings"></div></fieldset>
        <label class="honey" aria-hidden="true">Deja este campo vacío<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
        <button type="submit">Enviar puntuación</button>
        <p role="status" aria-live="polite"></p>
      </form>
    </div>`;
  (document.querySelector("main") || document.body).after(root);

  const ratings = root.querySelector(".ratings");
  ratings.innerHTML = [1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="rating" value="${n}" required aria-label="${n} de 5 estrellas"><span class="star" aria-hidden="true">★</span><span>${n}</span></label>`).join("");
  const form = root.querySelector("form");
  const status = root.querySelector('[role="status"]');

  async function loadSummary() {
    const averageNode = root.querySelector("#kc-fb-average");
    const distributionNode = root.querySelector("#kc-fb-distribution");
    try {
      const response = await fetch("/api/library-feedback", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error();
      const data = await response.json();
      averageNode.replaceChildren();
      const avg = document.createElement("div");
      avg.className = "kc-fb-average";
      avg.textContent = data.count ? `${data.average} / 5` : "Aún sin puntuaciones";
      if (data.count) {
        const stars = document.createElement("span");
        stars.className = "stars";
        stars.textContent = "★★★★★";
        stars.style.setProperty("--fill", `${Math.max(0, Math.min(100, Number(data.average) * 20))}%`);
        stars.setAttribute("aria-label", `${data.average} de 5 estrellas`);
        avg.append(stars);
      }
      const count = document.createElement("p");
      count.textContent = `${data.count} ${data.count === 1 ? "puntuación" : "puntuaciones"}`;
      avg.append(count);
      averageNode.append(avg);
      distributionNode.replaceChildren();
      [5, 4, 3, 2, 1].forEach((rating) => {
        const n = Number(data.distribution?.[rating - 1] || 0);
        const row = document.createElement("div");
        row.className = "kc-fb-row";
        const label = document.createElement("span"); label.textContent = `${rating} ★`;
        const track = document.createElement("div"); track.className = "track"; track.setAttribute("aria-hidden", "true");
        const fill = document.createElement("div"); fill.className = "fill"; fill.style.width = `${data.count ? Math.round(n * 100 / data.count) : 0}%`; track.append(fill);
        const amount = document.createElement("span"); amount.textContent = String(n);
        row.append(label, track, amount); distributionNode.append(row);
      });
    } catch {
      averageNode.textContent = "El promedio no está disponible por ahora.";
      distributionNode.replaceChildren();
    }
  }

  loadSummary();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Enviando puntuación…";
    try {
      const response = await fetch("/api/library-feedback", {
        method: "POST",
        headers: { "content-type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ rating: data.get("rating"), page, website: data.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No fue posible enviar la puntuación.");
      form.reset();
      status.textContent = "Gracias. Tu puntuación se registró y ya forma parte del promedio público.";
      await loadSummary();
    } catch (error) {
      status.textContent = error.message || "No se pudo enviar la puntuación.";
    } finally {
      button.disabled = false;
    }
  });
})();
