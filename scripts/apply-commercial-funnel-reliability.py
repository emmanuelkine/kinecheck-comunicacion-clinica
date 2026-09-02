from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
METRICS = ROOT / "metrics-v1.js"
METRIC_EVENT = ROOT / "supabase/functions/metric-event/index.ts"
ACADEMY_COMMERCE = ROOT / "academy/academy-commerce-v4.js"
ROOT_INDEX = ROOT / "index.html"

SCRIPT_BY_DEPTH = {
    0: '<script src="./metrics-v1.js?v=20260902-commercial1" defer></script>',
    2: '<script src="../../metrics-v1.js?v=20260902-commercial1" defer></script>',
}


def product_pages() -> list[Path]:
    return sorted((ROOT / "productos").glob("*/index.html"))


def product_slugs() -> list[str]:
    return [path.parent.name for path in product_pages()]


def insert_before_head_close(path: Path, script: str) -> None:
    text = path.read_text(encoding="utf-8")
    if "metrics-v1.js?v=20260902-commercial1" in text:
        return
    if "</head>" not in text:
        raise RuntimeError(f"No </head> in {path.relative_to(ROOT)}")
    text = text.replace("</head>", f"  {script}\n</head>", 1)
    path.write_text(text, encoding="utf-8")


def replace_set(text: str, constant_name: str, values: list[str]) -> str:
    body = "\n".join(f'    "{value}",' for value in values)
    pattern = rf"const {re.escape(constant_name)} = new Set\(\[\n.*?\n\s*\]\);"
    replacement = f"const {constant_name} = new Set([\n{body}\n  ]);"
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not replace {constant_name}")
    return updated


def patch_metrics(slugs: list[str]) -> None:
    text = METRICS.read_text(encoding="utf-8")
    allowed = sorted(set(slugs) | {"pack-kinecheck-estudiante"})
    text = replace_set(text, "ALLOWED_PRODUCTS", allowed)

    old_query = '''    const fromQuery = cleanProduct(params.get("producto") || params.get("course"));\n    if (fromQuery) return fromQuery;\n\n    const fromDom = cleanProduct('''
    new_query = '''    const fromQuery = cleanProduct(params.get("producto") || params.get("course"));\n    if (fromQuery) return fromQuery;\n\n    const pathMatch = String(location.pathname || "").match(/^\\/productos\\/([^/]+)(?:\\/|$)/i);\n    const fromPath = cleanProduct(pathMatch ? decodeURIComponent(pathMatch[1]) : "");\n    if (fromPath) return fromPath;\n\n    const fromDom = cleanProduct('''
    if old_query in text:
        text = text.replace(old_query, new_query, 1)
    elif "const pathMatch = String(location.pathname" not in text:
        raise RuntimeError("Could not patch currentProduct path detection")

    old_hotmart = '''    if (href && /pay\\.hotmart\\.com/i.test(href)) {\n      send("checkout_start", { productSlug: slug });\n      return;\n    }'''
    new_hotmart = '''    if (href && /pay\\.hotmart\\.com/i.test(href)) {\n      if (markOnce("buy_click", slug || "unknown")) send("buy_click", { productSlug: slug });\n      if (markOnce("checkout_start", slug || "unknown")) send("checkout_start", { productSlug: slug });\n      if (markOnce("hotmart_outbound", slug || "unknown")) send("hotmart_outbound", { productSlug: slug });\n      return;\n    }'''
    if old_hotmart in text:
        text = text.replace(old_hotmart, new_hotmart, 1)
    elif 'markOnce("hotmart_outbound"' not in text:
        raise RuntimeError("Could not patch Hotmart anchor instrumentation")

    METRICS.write_text(text, encoding="utf-8")


def patch_metric_event(slugs: list[str]) -> None:
    text = METRIC_EVENT.read_text(encoding="utf-8")
    for event in ["buy_click", "hotmart_outbound", "access_error"]:
        marker = f'  "{event}",'
        if marker not in text:
            anchor = '  "checkout_start",\n'
            if anchor not in text:
                raise RuntimeError("Could not locate allowedEvents checkout_start")
            text = text.replace(anchor, anchor + marker + "\n", 1)
    allowed = sorted(set(slugs) | {"pack-kinecheck-estudiante"})
    text = replace_set(text, "allowedProducts", allowed)
    METRIC_EVENT.write_text(text, encoding="utf-8")


def patch_academy_commerce() -> None:
    text = ACADEMY_COMMERCE.read_text(encoding="utf-8")
    old = '''    if (button) {\n      button.setAttribute("aria-busy", "true");\n      button.style.pointerEvents = "none";\n    }\n    window.location.assign(checkout);'''
    new = '''    if (button) {\n      button.setAttribute("aria-busy", "true");\n      button.style.pointerEvents = "none";\n    }\n    if (typeof window.KINECHECK_METRIC === "function") {\n      window.KINECHECK_METRIC("buy_click", { productSlug: slug });\n      window.KINECHECK_METRIC("checkout_start", { productSlug: slug });\n      window.KINECHECK_METRIC("hotmart_outbound", { productSlug: slug });\n    }\n    window.location.assign(checkout);'''
    if old in text:
        text = text.replace(old, new, 1)
    elif 'window.KINECHECK_METRIC("hotmart_outbound"' not in text:
        raise RuntimeError("Could not patch Academy checkout instrumentation")
    ACADEMY_COMMERCE.write_text(text, encoding="utf-8")


def main() -> None:
    pages = product_pages()
    if not pages:
        raise RuntimeError("No product pages found")
    slugs = product_slugs()

    insert_before_head_close(ROOT_INDEX, SCRIPT_BY_DEPTH[0])
    for page in pages:
        insert_before_head_close(page, SCRIPT_BY_DEPTH[2])

    patch_metrics(slugs)
    patch_metric_event(slugs)
    patch_academy_commerce()

    print(f"Patched root + {len(pages)} product pages")
    print("Products:", ", ".join(slugs))


if __name__ == "__main__":
    main()
