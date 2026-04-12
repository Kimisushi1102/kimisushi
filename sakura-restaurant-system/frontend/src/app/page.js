'use client';

import { useState, useEffect } from 'react';
import { menuApi } from '../lib/api';

export default function HomePage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Alle');

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      const response = await menuApi.getAll();
      setMenuItems(response.data);
      const cats = ['Alle', ...new Set(response.data.map(item => item.category))];
      setCategories(cats);
    } catch (error) {
      console.error('Fehler beim Laden der Speisekarte:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = activeCategory === 'Alle'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-dark to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-serif font-bold mb-4">Willkommen bei Sakura</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Frisches Sushi und authentische japanische Kueche - direkt zu Ihnen nach Hause oder zum Abholen
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/bestellen" className="bg-brand-red text-white px-8 py-4 rounded-lg font-semibold hover:bg-red-700 transition">
              Online Bestellen
            </a>
            <a href="/reservieren" className="bg-white text-brand-dark px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition">
              Tisch Reservieren
            </a>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-brand-dark mb-4">Unsere Speisekarte</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Entdecken Sie unsere Auswahl an frischen Sushi-Variationen, traditionellen japanischen Gerichten und mehr
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition ${
                activeCategory === category
                  ? 'bg-brand-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Laden...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="card hover:shadow-lg transition">
                <div className="h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">🍣</span>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif font-bold text-xl text-brand-dark">{item.name}</h3>
                  <span className="text-brand-red font-bold">{item.price} EUR</span>
                </div>
                <p className="text-gray-500 text-sm mb-4">{item.description}</p>
                <button
                  onClick={() => window.location.href = `/bestellen?item=${item.id}`}
                  className="w-full btn-primary text-center"
                >
                  Bestellen
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
