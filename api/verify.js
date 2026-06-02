export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Method Not Allowed'
    });
  }

  const { key } = req.body || {};

  if (!key) {
    return res.status(400).json({
      ok: false,
      message: 'No Key'
    });
  }

  if (key === process.env.LICENSE_KEY) {
    return res.status(200).json({
      ok: true
    });
  }

  return res.status(401).json({
    ok: false
  });
}
