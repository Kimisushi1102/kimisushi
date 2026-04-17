// History endpoint - alias for transactions
module.exports = async (req, res) => {
  const transactionsRoute = require('./transactions');
  return transactionsRoute(req, res);
};
