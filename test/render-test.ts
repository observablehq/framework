import assert from "node:assert";
import {normalizeConfig} from "../src/config.js";
import {parseMarkdown} from "../src/markdown.js";
import {renderPage} from "../src/render.js";

describe("renderPage(page, options)", () => {
  it("renders html lang and dir from config", async () => {
    const config = normalizeConfig({root: "test/input/build/simple", pages: [], lang: "fr", dir: "ltr"});
    const page = parseMarkdown("# Hello", {path: "index.md", md: config.md});
    const html = await renderPage(page, {...config, path: "/index", root: config.root});
    assert.match(html, /<html lang="fr" dir="ltr">/);
  });

  it("front matter lang and dir override config", async () => {
    const config = normalizeConfig({root: "test/input/build/simple", pages: [], lang: "fr", dir: "ltr"});
    const page = parseMarkdown("---\nlang: ar\ndir: rtl\n---\n# Hello", {path: "index.md", md: config.md});
    const html = await renderPage(page, {...config, path: "/index", root: config.root});
    assert.match(html, /<html lang="ar" dir="rtl">/);
  });

  it("derives html lang and dir from locale", async () => {
    const config = normalizeConfig({root: "test/input/build/simple", pages: [], locale: "ar-EG"});
    const page = parseMarkdown("# Hello", {path: "index.md", md: config.md});
    const html = await renderPage(page, {...config, path: "/index", root: config.root});
    assert.match(html, /<html lang="ar" dir="rtl">/);
  });

  it("localizes sidebar, pager, and footer labels", async () => {
    const config = normalizeConfig({
      root: "test/input/build/config",
      locale: "fr-FR",
      search: {},
      pages: [{name: "Chapitre", path: "/chapitre", pager: "main"}]
    });
    const page = parseMarkdown("# Hello", {
      path: "index.md",
      md: config.md,
      footer: config.footer,
      header: config.header,
      head: config.head
    });
    const html = await renderPage(page, {...config, path: "/chapitre", root: config.root});
    assert.match(html, /title="Basculer la barre latérale"/);
    assert.match(html, /placeholder="Rechercher"/);
    assert.match(html, /data-label="Page précédente"/);
    assert.match(html, /<span>Accueil<\/span>/);
    assert.match(html, /Créé avec /);
    assert.match(html, /Observable<\/a> le /);
  });

  it("localizes render-time strings from front matter locale overrides", async () => {
    const config = normalizeConfig({
      root: "test/input/build/config",
      locale: "fr-FR",
      search: {},
      pages: [{name: "Section", path: "/section", pager: "main"}]
    });
    const page = parseMarkdown("---\nlocale: ar-EG\n---\n# Hello", {
      path: "index.md",
      md: config.md,
      footer: config.footer,
      header: config.header,
      head: config.head
    });
    const html = await renderPage(page, {...config, path: "/section", root: config.root});
    assert.match(html, /title="تبديل الشريط الجانبي"/);
    assert.match(html, /placeholder="بحث"/);
    assert.match(html, /data-label="الصفحة السابقة"/);
    assert.match(html, /أُنشئ باستخدام /);
    assert.match(html, /Observable<\/a> في /);
  });
});
