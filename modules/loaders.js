/* 2c) External index loaders */
async function j(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed ${url}: ${r.status}`);
  return r.json();
}

export async function loadIndexes() {
  const [
    templates,
    databases,
    fermentationModels,
    glossary,
    troubleshooting,
    guides,
  ] = await Promise.all([
    j("./data/templates_index.json"),
    j("./data/databases_index.json"),
    j("./data/fermentation_models_index.json"),
    j("./data/glossary_index.json"),
    j("./data/troubleshooting_index.json"),
    j("./data/guides_index.json"),
  ]);

  return { templates, databases, fermentationModels, glossary, troubleshooting, guides };
}