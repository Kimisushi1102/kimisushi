'use client';

import { useState, useEffect } from 'react';
import { menuApi, ordersApi } from '../../lib/api';

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    pickupTime: '',
    notes: ''
  });

  useEffect(() => {
    loadMenu();
  }, []);

  function loadMenu() {
    menuApi.getAll()
      .then(res => setMenuItems(res.data))
      .catch(err => console.error('Fehler:', err))
      .finally(() => setLoading(false));
  }

  function addToCart(item) {
    const existing = cart.find(i => i.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(i =>
        i.menuItemId === item.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: 1
      }]);
    }
  }

  function updateQuantity(menuItemId, delta) {
    setCart(cart.map(item => {
      if (item.menuItemId === menuItemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }

  function removeFromCart(menuItemId) {
    setCart(cart.filter(item => item.menuItemId !== menuItemId));
  }

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Bitte waehlen Sie mindestens ein Gericht aus.');
      return;
    }

    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
      setError('Bitte fuellen Sie alle Pflichtfelder aus.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await ordersApi.create({
        ...formData,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price.toFixed(2),
          quantity: item.quantity
        }))
      });

      setOrderNumber(response.data.orderNumber);
      setSuccess(true);
    } catch (err) {
      console.error('Order error:', err);
      let errorMessage = 'Fehler beim Senden der Bestellung. Bitte versuchen Sie es erneut.';

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.errors) {
        errorMessage = err.response.data.errors.map(e => e.msg).join(', ');
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Bestellung erfolgreich!</h1>
          <p className="text-gray-600 mb-2">Ihre Bestellnummer lautet:</p>
          <p className="text-3xl font-bold text-brand-dark mb-6">{orderNumber}</p>
          <p className="text-gray-600 mb-6">
            Wir haben Ihre Bestellung erhalten und werden Sie in Kuerze per E-Mail informieren.
          </p>
          <a href="/" className="btn-primary inline-block">
            Zurueck zur Startseite
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-serif font-bold text-brand-dark mb-8 text-center">
          Online Bestellen
        </h1>

        {error && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold text-brand-dark mb-6">Speisekarte</h2>

              {loading ? (
                <p className="text-center py-8 text-gray-500">Laden...</p>
              ) : (
                <div className="space-y-4">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-brand-dark">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.description}</p>
                        <p className="font-bold text-brand-red mt-1">{item.price} EUR</p>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-brand-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        + Hinzufuegen
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart & Form Section */}
          <div className="lg:col-span-1">
            {/* Cart */}
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Warenkorb</h2>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Warenkorb ist leer</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.map(item => (
                      <div key={item.menuItemId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.price} EUR</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menuItemId, -1)}
                            className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                          >-</button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.menuItemId, 1)}
                            className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300"
                          >+</button>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Gesamt:</span>
                      <span className="text-brand-red">{totalAmount.toFixed(2)} EUR</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Form */}
            <div className="card">
              <h2 className="text-xl font-bold text-brand-dark mb-4">Kundendaten</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abholzeit</label>
                  <select
                    name="pickupTime"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">So bald wie moeglich</option>
                    <option value="15:00">15 Minuten</option>
                    <option value="20:00">20 Minuten</option>
                    <option value="30:00">30 Minuten</option>
                    <option value="45:00">45 Minuten</option>
                    <option value="60:00">1 Stunde</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkungen</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="input-field"
                    rows="3"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className="w-full btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Wird gesendet...' : 'Bestellung absenden'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
