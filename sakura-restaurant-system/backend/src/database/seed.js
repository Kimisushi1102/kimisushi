import db, { getClient } from './sqlite.js';
import { v4 as uuidv4 } from 'uuid';

const seedMenuItems = [
  {
    name: 'Sake Nigiri',
    name_en: 'Salmon Nigiri',
    description: 'Premium Lachs auf perfekt gewuerztem Sushireis',
    description_en: 'Premium salmon on perfectly seasoned sushi rice',
    category: 'Nigiri',
    price: 5.90,
    image_url: '/images/sake_nigiri.jpg',
    sort_order: 1
  },
  {
    name: 'Maguro Nigiri',
    name_en: 'Tuna Nigiri',
    description: 'Feinster Thunfisch auf Sushireis',
    description_en: 'Finest tuna on sushi rice',
    category: 'Nigiri',
    price: 6.50,
    image_url: '/images/maguro_nigiri.jpg',
    sort_order: 2
  },
  {
    name: 'Dragon Roll',
    description: 'Gebackene Garnele, Gurke, Avocado, Unagi-Sauce und Sesam',
    description_en: 'Fried shrimp, cucumber, avocado, unagi sauce and sesame',
    category: 'Maki',
    price: 14.90,
    image_url: '/images/dragon_roll.jpg',
    sort_order: 3
  },
  {
    name: 'California Roll',
    description: 'Surimi, Avocado, Gurke mit Sesam',
    description_en: 'Surimi, avocado, cucumber with sesame',
    category: 'Maki',
    price: 9.50,
    image_url: '/images/california_roll.jpg',
    sort_order: 4
  },
  {
    name: 'Premium Sashimi',
    description: 'Ausgewaehlte Edelfische, kunstvoll geschnitten',
    description_en: 'Selected noble fish, artfully sliced',
    category: 'Sashimi',
    price: 24.50,
    image_url: '/images/sashimi.jpg',
    sort_order: 5
  },
  {
    name: 'Tokyo Set',
    description: '2x Sake Nigiri, 2x Maguro Nigiri, 6x Maki Lachs, 4x California Roll, Miso Suppe',
    description_en: '2x Salmon Nigiri, 2x Tuna Nigiri, 6x Salmon Maki, 4x California Roll, Miso Soup',
    category: 'Sets',
    price: 28.90,
    image_url: '/images/tokyo_set.jpg',
    sort_order: 6
  },
  {
    name: 'Sakura Premium',
    description: '8x Signature Rolls, 6x Premium Nigiri Mix, Dragon Roll, Edamame, 2x Miso Suppe',
    description_en: '8x Signature Rolls, 6x Premium Nigiri Mix, Dragon Roll, Edamame, 2x Miso Soup',
    category: 'Sets',
    price: 45.00,
    image_url: '/images/sakura_premium.jpg',
    sort_order: 7
  },
  {
    name: 'Miso Suppe',
    description: 'Traditionelle japanische Suppe mit Tofu und Wakame',
    description_en: 'Traditional Japanese soup with tofu and wakame',
    category: 'Suppen',
    price: 3.50,
    image_url: '/images/miso_soup.jpg',
    sort_order: 8
  },
  {
    name: 'Edamame',
    description: 'Gedaempfte Sojabohnen mit Meersalz',
    description_en: 'Steamed soybeans with sea salt',
    category: 'Beilagen',
    price: 4.50,
    image_url: '/images/edamame.jpg',
    sort_order: 9
  },
  {
    name: 'Gyoza',
    description: 'Japanische Hackfleischtaschen, 6 Stueck',
    description_en: 'Japanese meat dumplings, 6 pieces',
    category: 'Beilagen',
    price: 7.90,
    image_url: '/images/gyoza.jpg',
    sort_order: 10
  }
];

export async function seedDatabase() {
  try {
    console.log('Seeding Menu Items...');

    for (const item of seedMenuItems) {
      const id = uuidv4();
      const now = new Date().toISOString();

      // Check if item already exists
      const existing = db.prepare('SELECT id FROM menu_items WHERE name = ?').get(item.name);
      if (existing) {
        console.log(`Skipping: ${item.name} (already exists)`);
        continue;
      }

      db.prepare(
        `INSERT INTO menu_items (id, name, name_en, description, description_en, category, price, image_url, is_available, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      ).run(id, item.name, item.name_en, item.description, item.description_en, item.category, item.price, item.image_url, item.sort_order, now, now);

      console.log(`Added: ${item.name}`);
    }

    console.log('Seeding abgeschlossen');
  } catch (error) {
    console.error('Fehler beim Seeding:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('seed.js')) {
  const { initializeDatabase } = await import('./init-sqlite.js');
  await initializeDatabase();
  await seedDatabase();
  process.exit(0);
}
