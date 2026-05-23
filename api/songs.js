// api/songs.js
// Vercel Serverless Function using Vercel KV via Upstash REST API

export default async function handler(req, res) {
  // Set CORS headers so it can be requested from localhost or any deployment domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({
      error: "Vercel KV is not configured on your Vercel project yet. Please go to the Storage tab in your Vercel Dashboard, create a KV database, and link it to this project.",
      configured: false
    });
  }

  try {
    if (req.method === 'GET') {
      const { sync_code } = req.query;
      if (!sync_code || sync_code.trim() === '') {
        return res.status(400).json({ error: "Missing sync_code parameter." });
      }

      const key = `songs_${sync_code.trim().toLowerCase()}`;
      
      // Query Upstash Redis REST API directly (requires zero dependencies)
      const response = await fetch(`${KV_URL}/get/${key}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });

      if (!response.ok) {
        throw new Error(`KV API responded with status ${response.status}`);
      }

      const data = await response.json();
      const songs = data.result ? JSON.parse(data.result) : [];
      
      return res.status(200).json({ songs, configured: true });
    }

    if (req.method === 'POST') {
      const { sync_code, songs } = req.body;
      if (!sync_code || sync_code.trim() === '') {
        return res.status(400).json({ error: "Missing sync_code parameter." });
      }
      if (!Array.isArray(songs)) {
        return res.status(400).json({ error: "songs must be an array." });
      }

      const key = `songs_${sync_code.trim().toLowerCase()}`;
      
      // Store the stringified array in Upstash Redis
      const response = await fetch(`${KV_URL}/set/${key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.stringify(songs))
      });

      if (!response.ok) {
        throw new Error(`KV API responded with status ${response.status}`);
      }

      return res.status(200).json({ success: true, count: songs.length, configured: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("Cloud storage error:", error);
    return res.status(500).json({ error: error.message });
  }
}
