/**
 * Deterministic mock dataset generator for an Owner Portal.
 * - Stable across refresh for the same slug.
 */

function hashStringToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function between(date, min, max) {
  const t = date.getTime();
  return t >= min.getTime() && t <= max.getTime();
}

function slugToDisplayName(slug) {
  const s = String(slug || "").trim();
  if (!s) return "Owner";
  return s
    .split(/[-_]/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/**
 * @param {string} slug
 */
export function buildMockOwnerPortalData(slug) {
  const seed = hashStringToSeed(String(slug));
  const rng = mulberry32(seed);

  const ownerName = slugToDisplayName(slug);

  const propertyNames = [
    "Chalet Aurore",
    "Chalet Mont Blanc",
    "Villa Émeraude",
    "Refuge Prestige",
    "Chalet Horizon",
    "Villa Alpinia",
    "Chalet Quartz",
    "Chalet Céleste",
  ];

  const cities = ["Chamonix", "Megève", "Combloux", "Les Houches", "Saint-Gervais"];

  const firstNames = [
    "Emma",
    "Lucas",
    "Hugo",
    "Lina",
    "Sofia",
    "Noah",
    "Jules",
    "Chloé",
    "Léa",
    "Arthur",
    "Mila",
    "Louis",
    "Zoé",
    "Maël",
    "Inès",
    "Tom",
    "Camille",
    "Nina",
    "Paul",
    "Clara",
  ];

  const lastNames = [
    "Martin",
    "Bernard",
    "Dubois",
    "Thomas",
    "Robert",
    "Richard",
    "Petit",
    "Durand",
    "Leroy",
    "Moreau",
    "Simon",
    "Laurent",
    "Lefebvre",
    "Michel",
    "Garcia",
    "David",
    "Roux",
    "Fournier",
    "Girard",
    "Andre",
  ];

  const propertyCount = int(rng, 2, 4);

  const usedNames = new Set();
  const properties = Array.from({ length: propertyCount }).map((_, idx) => {
    let name = pick(rng, propertyNames);
    while (usedNames.has(name)) name = pick(rng, propertyNames);
    usedNames.add(name);

    const city = pick(rng, cities);
    const id = `prop_${seed}_${idx + 1}`;

    const websiteUrl = `https://example.com/?property=${encodeURIComponent(id)}`;

    return {
      id,
      name,
      city,
      websiteUrl,
    };
  });

  const reservationsCount = int(rng, 10, 25);
  const now = new Date();
  const today = startOfDay(now);

  const reservations = Array.from({ length: reservationsCount }).map((_, idx) => {
    const prop = pick(rng, properties);

    const startOffset = int(rng, 0, 55);
    const duration = int(rng, 2, 9);

    const start = addDays(today, startOffset);
    const end = addDays(start, duration);

    const createdAt = addDays(start, -int(rng, 3, 40));
    const guestsCount = int(rng, 2, 12);

    const tenantFirstName = pick(rng, firstNames);
    const tenantLastName = pick(rng, lastNames);

    const amount = int(rng, 850, 9800) + int(rng, 0, 99);

    const email = `${tenantFirstName}.${tenantLastName}${int(rng, 1, 99)}@example.com`
      .toLowerCase()
      .replace(/[^a-z0-9@.]/g, "");
    const phone = `+33 6 ${pad2(int(rng, 0, 99))} ${pad2(int(rng, 0, 99))} ${pad2(
      int(rng, 0, 99)
    )} ${pad2(int(rng, 0, 99))}`;

    return {
      id: `res_${seed}_${idx + 1}`,
      tenantFirstName,
      tenantLastName,
      phone,
      email,
      guestsCount,
      propertyId: prop.id,
      propertyName: prop.name,
      startDate: isoDate(start),
      endDate: isoDate(end),
      createdAt: isoDate(createdAt),
      amount,
    };
  });

  // Ensure createdAt <= startDate for all
  reservations.forEach((r) => {
    const c = new Date(r.createdAt);
    const s = new Date(r.startDate);
    if (c.getTime() > s.getTime()) r.createdAt = isoDate(addDays(s, -int(rng, 1, 25)));
  });

  // Messages (mock)
  const messages = [
    {
      id: `msg_${seed}_1`,
      from: "admin",
      body:
        "Bienvenue sur votre Owner Portal. Vous pouvez suivre vos réservations, vos propriétés et nous contacter ici.",
      createdAt: isoDate(addDays(today, -2)),
    },
    {
      id: `msg_${seed}_2`,
      from: "owner",
      body: "Merci. Pouvez-vous confirmer le planning de ménage pour la prochaine arrivée ?",
      createdAt: isoDate(addDays(today, -1)),
    },
    {
      id: `msg_${seed}_3`,
      from: "admin",
      body: "Confirmé. Le passage est prévu la veille de l’arrivée, en fin de matinée.",
      createdAt: isoDate(today),
    },
  ];

  const adminContact = {
    email: "support@careconcierge.example",
    phone: "+33 4 50 00 00 00",
    hours: "Lun–Ven 9:00–18:00",
  };

  const owner = {
    slug: String(slug),
    name: ownerName,
  };

  return {
    owner,
    properties,
    reservations,
    messages,
    adminContact,
  };
}

/**
 * Helpers used by views (client can re-implement, but kept here for server use)
 * @param {string} iso
 */
export function isTodayISO(iso) {
  const d = new Date(iso);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

/**
 * @param {{startDate:string,endDate:string}} r
 * @param {Date} min
 * @param {Date} max
 */
export function overlapsWindow(r, min, max) {
  const s = new Date(r.startDate);
  const e = new Date(r.endDate);
  return between(s, min, max) || between(e, min, max) || (s < min && e > max);
}
