module.exports = (req, res) => {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://kimisushi.de';
  return res.setHeader('Content-Type', 'text/plain').status(200).send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
};
