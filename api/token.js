// /api/token.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Missing Spotify credentials',
        message: 'Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables'
      })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ 
        grant_type: 'client_credentials' 
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Spotify API error',
        message: data.error_description || 'Failed to get access token'
      })
    }

    // Cache briefly to reduce rate hits
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ 
      access_token: data.access_token, 
      expires_in: data.expires_in 
    })
  } catch (error) {
    console.error('Token fetch error:', error)
    res.status(500).json({ 
      error: 'token_error', 
      message: error.message 
    })
  }
}
