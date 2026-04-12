export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validierungsfehler',
      details: err.message
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Ressource bereits vorhanden'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Ungueltige Referenz'
    });
  }

  res.status(500).json({
    error: 'Interner Serverfehler'
  });
}
