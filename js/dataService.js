/**
 * Service de chargement des données métier.
 *
 * Le gabarit lit deux fichiers :
 * - pathways.json : structure des parcours
 * - lessons.json : capsules pédagogiques
 *
 * Vous pouvez remplacer ces fetch locaux par une API, un CMS headless ou un export
 * produit depuis un outil auteur. Le reste du moteur peut rester inchangé.
 */
export async function loadData() {
  const [pathwaysRes, lessonsRes] = await Promise.all([
    fetch('./data/pathways.json'),
    fetch('./data/lessons.json'),
  ]);

  const pathwaysJson = await pathwaysRes.json();
  const lessonsJson = await lessonsRes.json();

  return {
    pathways: pathwaysJson.pathways || [],
    lessons: lessonsJson.lessons || [],
  };
}
