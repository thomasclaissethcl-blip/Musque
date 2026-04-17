/**
 * Chargement des données métier.
 *
 * Exemple d'adaptation :
 * - remplacez les fichiers JSON par un autre domaine sans toucher à l'interface
 * - le moteur reste le même tant que le schéma de données est respecté
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
