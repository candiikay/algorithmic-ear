// /api/token.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  console.log(`API called with method: ${req.method}`)

  // Only allow POST requests for token fetching
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'method_not_allowed',
      message: `Method ${req.method} Not Allowed`
    });
  }
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials in environment variables.')
      return res.status(500).json({ 
        error: 'configuration_error',
        message: 'Missing Spotify API credentials on the server.'
      })
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    console.log('Requesting access token from Spotify...')
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    console.log('Spotify response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Spotify API error (${response.status}):`, errorText)
      return res.status(response.status).json({
        error: 'spotify_api_error',
        message: `Failed to get access token. Details: ${errorText}`
      })
    }

    const { access_token, expires_in } = await response.json()
    console.log('Successfully retrieved access token.')
    
    // Set cache headers to allow CDN caching and reduce hits to the Spotify API.
    // s-maxage=300: Cache on CDN for 5 minutes.
    // stale-while-revalidate=600: Serve stale data for up to 10 minutes while revalidating.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ 
      access_token, 
      expires_in 
    })
  } catch (error) {
    console.error('Token fetch error:', error)
    res.status(500).json({ 
      error: 'token_error', 
      message: error.message 
    })
  }
}
