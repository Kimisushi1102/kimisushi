'use client';

import { useState } from 'react';
import { reservationsApi } from '../../lib/api';

export default function ReservationPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reservationNumber, setReservationNumber] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    reservationDate: '',
    reservationTime: '',
    partySize: 2,
    notes: ''
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone ||
        !formData.reservationDate || !formData.reservationTime) {
      setError('Bitte fuellen Sie alle Pflichtfelder aus.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await reservationsApi.create(formData);
      setReservationNumber(response.data.reservationNumber);
      setSuccess(true);
    } catch (err) {
      console.error('Reservation error:', err);
      let errorMessage = 'Fehler beim Senden der Reservierungsanfrage. Bitte versuchen Sie es erneut.';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Anfrage erfolgreich!</h1>
          <p className="text-gray-600 mb-2">Ihre Reservierungsnummer lautet:</p>
          <p className="text-3xl font-bold text-brand-dark mb-6">{reservationNumber}</p>
          <p className="text-gray-600 mb-6">
            Wir haben Ihre Reservierungsanfrage erhalten und werden diese schnellstmoeglich pruefen. Sie erhalten eine E-Mail-Bestaetigung.
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
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-brand-dark mb-4">
            Tisch Reservieren
          </h1>
          <p className="text-gray-600">
            Reservieren Sie einen Tisch fuer Ihren Besuch bei uns
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail *
              </label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon *
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  name="reservationDate"
                  value={formData.reservationDate}
                  onChange={handleChange}
                  min={today}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uhrzeit *
                </label>
                <select
                  name="reservationTime"
                  value={formData.reservationTime}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Bitte waehlen</option>
                  <option value="11:00">11:00 Uhr</option>
                  <option value="11:30">11:30 Uhr</option>
                  <option value="12:00">12:00 Uhr</option>
                  <option value="12:30">12:30 Uhr</option>
                  <option value="13:00">13:00 Uhr</option>
                  <option value="13:30">13:30 Uhr</option>
                  <option value="14:00">14:00 Uhr</option>
                  <option value="17:00">17:00 Uhr</option>
                  <option value="17:30">17:30 Uhr</option>
                  <option value="18:00">18:00 Uhr</option>
                  <option value="18:30">18:30 Uhr</option>
                  <option value="19:00">19:00 Uhr</option>
                  <option value="19:30">19:30 Uhr</option>
                  <option value="20:00">20:00 Uhr</option>
                  <option value="20:30">20:30 Uhr</option>
                  <option value="21:00">21:00 Uhr</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anzahl der Personen *
              </label>
              <select
                name="partySize"
                value={formData.partySize}
                onChange={handleChange}
                className="input-field"
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Person' : 'Personen'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bemerkungen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input-field"
                rows="4"
                placeholder="Allergien, besondere Wuensche, etc."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Wird gesendet...' : 'Reservierungsanfrage absenden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
