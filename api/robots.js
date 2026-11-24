const BODY = `User-agent: *
Allow: /
Disallow: /login
Disallow: /signup

Sitemap: https://www.changeview.app/sitemap.xml
`;

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(BODY);
}
