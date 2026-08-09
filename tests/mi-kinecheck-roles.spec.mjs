import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });

function fixture(slugs) {
  const buttons = slugs.map((slug) => `<article><button data-course="${slug}">Abrir</button></article>`).join("");
  return `<!doctype html><html><head><meta name="description" content=""></head><body>
    <section id="login-view" hidden></section>
    <section id="dashboard-view">
      <aside id="academy-sidebar" class="academy-sidebar">
        <nav class="sidebar-nav">
          <a data-kc-view-link="inicio"><span>⌂</span><span>Inicio</span></a>
          <a data-kc-view-link="biblioteca"><span>▤</span><span>Biblioteca</span></a>
          <a data-kc-view-link="herramientas"><span>✚</span><span>Herramientas</span></a>
          <a data-kc-view-link="perfil"><span>○</span><span>Perfil</span></a>
        </nav>
        <button class="kc-explore-link"><span>Explorar KineCheck</span></button>
        <div class="sidebar-account"><span id="sidebar-access">Cuenta activa</span><small id="sidebar-email">test@example.invalid</small></div>
      </aside>
      <div id="sidebar-overlay" hidden></div>
      <header class="topbar"><button id="mobile-menu" aria-expanded="false">Menú</button><nav>
        <a data-kc-view-link="inicio">Inicio</a><a data-kc-view-link="biblioteca">Biblioteca</a><a data-kc-view-link="herramientas">Herramientas</a><a data-kc-view-link="perfil">Perfil</a>
      </nav></header>
      <main>
        <section id="inicio" class="hero-panel"><div class="hero-copy kc-home-hero"><span class="eyebrow"></span><h1></h1><p id="welcome"></p><div class="kc-home-actions"><button id="kc-home-continue">Continuar</button><button data-kc-view-link="explorar">Explorar</button></div></div><aside class="continue-panel"><h2 id="continue-heading"></h2><p id="continue-copy"></p><div class="access-summary"><strong id="active-count">1</strong><span>licencias activas</span></div></aside></section>
        <section id="onboarding"></section>
        <section class="kc-home-section"><h2 id="home-apps-title">Apps</h2></section>
        <section class="kc-home-section"><h2 id="home-courses-title">Cursos</h2></section>
        <section class="kc-home-section"><h2 id="home-library-title">Biblioteca</h2></section>
        <section class="kc-home-section"><h2 id="home-news-title">Noticias</h2></section>
        <section id="biblioteca"></section><section id="herramientas"></section><section id="perfil"></section><section id="cuenta"><div class="kc-page-heading"></div></section>
        <section id="kc-learning-path"></section><section id="kc-profile-stage"></section><button id="kc-sidebar-stage"></button><button id="kc-topbar-stage"></button><div id="kc-stage-modal"></div>
        <section id="course-grid">${buttons}</section>
      </main>
    </section>
    <div id="support-panel" hidden></div><button id="support-launcher" data-support-open>Soporte</button>
    <div id="kc-toast" hidden></div>
  </body></html>`;
}

async function pageFor(slugs) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-CL" });
  const page = await context.newPage();
  await page.setContent(fixture(slugs));
  await page.evaluate((courses) => {
    window.KINECHECK_ACADEMY_CONFIG = { ownerEmails: [], courses: courses.map((slug) => ({ slug, title: slug, subtitle: slug, kind: slug.includes("estudiante") || slug.includes("recupera") ? "application" : "course" })) };
    window.__opened = [];
    window.KINECHECK_OPEN_PRODUCT = async (slug) => { window.__opened.push(slug); };
  }, slugs);
  await page.addScriptTag({ path: "academy/academy-owned-native-bridge-v1.js" });
  await page.addScriptTag({ path: "academy/mi-kinecheck-v1.js" });
  await page.waitForTimeout(220);
  await page.addScriptTag({ path: "academy/mi-kinecheck-simplify-v2.js" });
  await page.waitForTimeout(320);
  return { page, context };
}

try {
  {
    const { page, context } = await pageFor(["kinecheck-recupera"]);
    assert.equal(await page.locator("body").getAttribute("data-kc-experience"), "patient");
    assert.ok((await page.locator("#kc-learning-path").getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    assert.ok((await page.locator('[data-kc-view-link="biblioteca"]').first().getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    assert.ok((await page.locator('[data-kc-view-link="herramientas"]').first().getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    assert.ok((await page.locator(".continue-panel").getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    assert.equal(await page.locator("#kc-guided-experience .kc-guided-heading h2").textContent(), "Tres acciones. Nada más.");
    assert.equal(await page.locator(".mi-kc-patient-help").count(), 1);
    await page.locator("#kc-home-continue").click();
    assert.deepEqual(await page.evaluate(() => window.__opened), ["kinecheck-recupera"]);
    await context.close();
  }

  {
    const { page, context } = await pageFor(["kinecheck-estudiante", "mas-alla-del-dolor", "comunicacion-clinica"]);
    assert.equal(await page.locator("body").getAttribute("data-kc-experience"), "student");
    assert.equal(await page.locator(".mi-kc-step-status").count(), 3);
    assert.equal(await page.locator(".mi-kc-step-status").first().textContent(), "PASO RECOMENDADO AHORA");
    assert.equal(await page.locator(".mi-kc-student-footer").count(), 1);
    assert.equal(await page.locator(".kc-home-section.mi-kc-simplified-hidden").count(), 4);
    assert.ok(!(await page.locator('[data-kc-view-link="biblioteca"]').first().getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    await page.locator("#kc-home-continue").click();
    assert.deepEqual(await page.evaluate(() => window.__opened), ["kinecheck-estudiante"]);
    await context.close();
  }

  {
    const { page, context } = await pageFor(["kinecheck-clinico", "kinecheck-clinico-curso", "evidencia-aplicada"]);
    assert.equal(await page.locator("body").getAttribute("data-kc-experience"), "professional");
    assert.equal(await page.locator(".kc-home-section.mi-kc-simplified-hidden").count(), 0);
    assert.ok((await page.locator("#kc-learning-path").getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    assert.ok(!(await page.locator('[data-kc-view-link="herramientas"]').first().getAttribute("class") || "").includes("mi-kc-simplified-hidden"));
    await context.close();
  }

  console.log("Mi KineCheck role UX: 3/3 perfiles aprobados con controlador directo.");
} finally {
  await browser.close();
}
