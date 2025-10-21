// /api/token.js
export default async function handler(req, res) {
  console.log('API called with method:', req.method)
  console.log('Headers:', req.headers)
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')

  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    res.status(200).json({ message: 'CORS preflight successful' })
    return
  }

  try {
    console.log('Starting token fetch process...')
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    
    console.log('Client ID exists:', !!clientId)
    console.log('Client Secret exists:', !!clientSecret)
    console.log('Client ID length:', clientId ? clientId.length : 0)
    console.log('Client Secret length:', clientSecret ? clientSecret.length : 0)
    
    if (!clientId || !clientSecret) {
      console.error('Missing credentials:', { clientId: !!clientId, clientSecret: !!clientSecret })
      return res.status(500).json({ 
        error: 'Missing Spotify credentials',
        message: 'Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables'
      })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    console.log('Making request to Spotify...')
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

    console.log('Spotify response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Spotify API error:', errorText)
      return res.status(response.status).json({
        error: 'Spotify API error',
        message: errorText || 'Failed to get access token'
      })
    }

    const data = await response.json()
    console.log('Successfully got token')
    
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
