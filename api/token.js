// /api/token.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Use GET or POST'
    })
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Configuration Error',
        message: 'Missing Spotify API credentials'
      })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({
        error: 'Spotify API Error',
        message: 'Failed to get access token'
      })
    }

    const { access_token, expires_in } = await response.json()
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ 
      access_token, 
      expires_in 
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to process request'
    })
  }
}
