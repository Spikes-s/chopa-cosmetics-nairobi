export interface DeliveryLocation {
  id: string;
  name: string;
  region: string;
  price: number;
}

/**
 * Comprehensive delivery location list covering Nairobi estates,
 * Nairobi metro belt, and major Kenyan towns / counties.
 * Fees are baseline suggestions and paid to the driver on delivery.
 */
export const DELIVERY_LOCATIONS: DeliveryLocation[] = [
  // Nairobi CBD & central
  { id: 'cbd', name: 'CBD (Free)', region: 'Nairobi CBD', price: 0 },
  { id: 'ngara', name: 'Ngara', region: 'Nairobi', price: 150 },
  { id: 'pangani', name: 'Pangani', region: 'Nairobi', price: 200 },
  { id: 'westlands', name: 'Westlands', region: 'Nairobi', price: 250 },
  { id: 'parklands', name: 'Parklands', region: 'Nairobi', price: 250 },
  { id: 'kilimani', name: 'Kilimani', region: 'Nairobi', price: 300 },
  { id: 'kileleshwa', name: 'Kileleshwa', region: 'Nairobi', price: 300 },
  { id: 'lavington', name: 'Lavington', region: 'Nairobi', price: 300 },
  { id: 'hurlingham', name: 'Hurlingham', region: 'Nairobi', price: 300 },
  { id: 'upperhill', name: 'Upper Hill', region: 'Nairobi', price: 250 },
  { id: 'south_b', name: 'South B', region: 'Nairobi', price: 250 },
  { id: 'south_c', name: 'South C', region: 'Nairobi', price: 250 },
  { id: 'nairobi_west', name: 'Nairobi West', region: 'Nairobi', price: 250 },
  { id: 'karen', name: 'Karen', region: 'Nairobi', price: 400 },
  { id: 'langata', name: 'Langata', region: 'Nairobi', price: 350 },
  { id: 'runda', name: 'Runda', region: 'Nairobi', price: 400 },
  { id: 'muthaiga', name: 'Muthaiga', region: 'Nairobi', price: 350 },
  { id: 'gigiri', name: 'Gigiri', region: 'Nairobi', price: 400 },

  // Eastlands & Embakasi
  { id: 'eastleigh', name: 'Eastleigh', region: 'Nairobi East', price: 200 },
  { id: 'buruburu', name: 'Buruburu', region: 'Nairobi East', price: 250 },
  { id: 'donholm', name: 'Donholm', region: 'Nairobi East', price: 250 },
  { id: 'umoja', name: 'Umoja', region: 'Nairobi East', price: 250 },
  { id: 'kayole', name: 'Kayole', region: 'Nairobi East', price: 300 },
  { id: 'embakasi', name: 'Embakasi', region: 'Nairobi East', price: 300 },
  { id: 'pipeline', name: 'Pipeline', region: 'Nairobi East', price: 300 },
  { id: 'imara_daima', name: 'Imara Daima', region: 'Nairobi East', price: 300 },
  { id: 'utawala', name: 'Utawala', region: 'Nairobi East', price: 350 },
  { id: 'ruai', name: 'Ruai', region: 'Nairobi East', price: 400 },
  { id: 'komarock', name: 'Komarock', region: 'Nairobi East', price: 300 },

  // Nairobi North
  { id: 'kasarani', name: 'Kasarani', region: 'Nairobi North', price: 300 },
  { id: 'roysambu', name: 'Roysambu', region: 'Nairobi North', price: 300 },
  { id: 'zimmerman', name: 'Zimmerman', region: 'Nairobi North', price: 300 },
  { id: 'githurai', name: 'Githurai', region: 'Nairobi North', price: 350 },
  { id: 'kahawa', name: 'Kahawa', region: 'Nairobi North', price: 350 },
  { id: 'kahawa_sukari', name: 'Kahawa Sukari', region: 'Nairobi North', price: 400 },
  { id: 'kahawa_wendani', name: 'Kahawa Wendani', region: 'Nairobi North', price: 400 },
  { id: 'ruaka', name: 'Ruaka', region: 'Nairobi North', price: 400 },
  { id: 'banana', name: 'Banana Hill', region: 'Nairobi North', price: 400 },

  // Kiambu county
  { id: 'ruiru', name: 'Ruiru', region: 'Kiambu', price: 400 },
  { id: 'juja', name: 'Juja', region: 'Kiambu', price: 450 },
  { id: 'thika', name: 'Thika', region: 'Kiambu', price: 500 },
  { id: 'kiambu_town', name: 'Kiambu Town', region: 'Kiambu', price: 450 },
  { id: 'kikuyu', name: 'Kikuyu', region: 'Kiambu', price: 400 },
  { id: 'limuru', name: 'Limuru', region: 'Kiambu', price: 500 },
  { id: 'kamiti', name: 'Kamiti', region: 'Kiambu', price: 400 },
  { id: 'githunguri', name: 'Githunguri', region: 'Kiambu', price: 500 },

  // Kajiado / Machakos belt
  { id: 'ngong', name: 'Ngong', region: 'Kajiado', price: 400 },
  { id: 'rongai', name: 'Rongai', region: 'Kajiado', price: 350 },
  { id: 'kiserian', name: 'Kiserian', region: 'Kajiado', price: 400 },
  { id: 'syokimau', name: 'Syokimau', region: 'Machakos', price: 350 },
  { id: 'mlolongo', name: 'Mlolongo', region: 'Machakos', price: 350 },
  { id: 'athi_river', name: 'Athi River', region: 'Machakos', price: 400 },
  { id: 'kitengela', name: 'Kitengela', region: 'Kajiado', price: 450 },
  { id: 'machakos', name: 'Machakos Town', region: 'Machakos', price: 550 },

  // Upcountry — Central
  { id: 'naivasha', name: 'Naivasha', region: 'Nakuru', price: 700 },
  { id: 'nakuru', name: 'Nakuru', region: 'Nakuru', price: 800 },
  { id: 'nyahururu', name: 'Nyahururu', region: 'Laikipia', price: 900 },
  { id: 'nyeri', name: 'Nyeri', region: 'Nyeri', price: 800 },
  { id: 'muranga', name: "Murang'a", region: "Murang'a", price: 700 },
  { id: 'karatina', name: 'Karatina', region: 'Nyeri', price: 800 },
  { id: 'embu', name: 'Embu', region: 'Embu', price: 800 },
  { id: 'meru', name: 'Meru', region: 'Meru', price: 900 },
  { id: 'nanyuki', name: 'Nanyuki', region: 'Laikipia', price: 900 },
  { id: 'isiolo', name: 'Isiolo', region: 'Isiolo', price: 1000 },

  // Western / Nyanza
  { id: 'kisumu', name: 'Kisumu', region: 'Kisumu', price: 1000 },
  { id: 'kericho', name: 'Kericho', region: 'Kericho', price: 900 },
  { id: 'kisii', name: 'Kisii', region: 'Kisii', price: 1000 },
  { id: 'kakamega', name: 'Kakamega', region: 'Kakamega', price: 1000 },
  { id: 'bungoma', name: 'Bungoma', region: 'Bungoma', price: 1000 },
  { id: 'busia', name: 'Busia', region: 'Busia', price: 1000 },
  { id: 'eldoret', name: 'Eldoret', region: 'Uasin Gishu', price: 1000 },
  { id: 'kitale', name: 'Kitale', region: 'Trans Nzoia', price: 1100 },

  // South Rift / Narok
  { id: 'narok', name: 'Narok', region: 'Narok', price: 900 },
  { id: 'bomet', name: 'Bomet', region: 'Bomet', price: 900 },

  // Coast
  { id: 'mombasa', name: 'Mombasa', region: 'Mombasa', price: 1200 },
  { id: 'malindi', name: 'Malindi', region: 'Kilifi', price: 1300 },
  { id: 'kilifi', name: 'Kilifi', region: 'Kilifi', price: 1200 },
  { id: 'diani', name: 'Diani', region: 'Kwale', price: 1300 },
  { id: 'lamu', name: 'Lamu', region: 'Lamu', price: 1500 },
  { id: 'voi', name: 'Voi', region: 'Taita Taveta', price: 1100 },

  // Eastern
  { id: 'kitui', name: 'Kitui', region: 'Kitui', price: 800 },
  { id: 'makueni', name: 'Makueni', region: 'Makueni', price: 800 },
  { id: 'wote', name: 'Wote', region: 'Makueni', price: 800 },

  // Northern
  { id: 'garissa', name: 'Garissa', region: 'Garissa', price: 1200 },
];

/**
 * Fuzzy-ish match: case-insensitive substring across name + region.
 * Returns matches sorted by prefix priority (starts-with first).
 */
export function searchLocations(query: string, limit = 8): DeliveryLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const startsWith: DeliveryLocation[] = [];
  const includes: DeliveryLocation[] = [];
  for (const loc of DELIVERY_LOCATIONS) {
    const name = loc.name.toLowerCase();
    const region = loc.region.toLowerCase();
    if (name.startsWith(q) || region.startsWith(q)) startsWith.push(loc);
    else if (name.includes(q) || region.includes(q)) includes.push(loc);
    if (startsWith.length + includes.length >= limit * 2) break;
  }
  return [...startsWith, ...includes].slice(0, limit);
}

export const findLocation = (id: string) =>
  DELIVERY_LOCATIONS.find((l) => l.id === id);
