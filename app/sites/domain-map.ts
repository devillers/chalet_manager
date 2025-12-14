// app/sites/domain-map.ts
export const domainToSlug: Record<string, string> = {
  // prod
  "villa-azura.com": "villa-azura",
  "www.villa-azura.com": "villa-azura",

  "chalet-alpin.fr": "chalet-alpin",
  "www.chalet-alpin.fr": "chalet-alpin",

  // pour tester en local
  "localhost:3000": "villa-azura", // ou ce que tu veux
};
