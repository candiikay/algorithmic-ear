// Spotify API integration utilities
import type { TokenResponse, SpotifyRecommendationsResponse, SpotifyAudioFeaturesResponse } from '../types'

export async function getToken(): Promise<TokenResponse> {
  try {
    const response = await fetch('/api/token')
    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const error = await response.json()
        errorMessage = error.message || error.error || 'Unknown error'
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(`Token fetch failed: ${errorMessage}`)
    }
    return response.json()
  } catch (error) {
    console.error('Token fetch error:', error)
    throw error
  }
}

export async function getRecommendations(
  token: string, 
  params: {
    genres?: string[]
    seedTracks?: string[]
    seedArtists?: string[]
    limit?: number
    danceability?: number
    energy?: number
    valence?: number
  } = {}
): Promise<SpotifyRecommendationsResponse> {
  try {
    // Validate required parameters - use valid Spotify genres
    const genres = params.genres || ['pop', 'electronic', 'indie-pop']
    const limit = Math.min(params.limit || 20, 100) // Spotify max is 100
    
    // Build query parameters - remove market for Client Credentials compatibility
    const queryParams = new URLSearchParams({
      limit: String(limit)
      // Note: market parameter only works with Authorization Code flow (user login)
      // Client Credentials flow doesn't support market parameter
    })

    // Add seed parameters (Spotify requires at least one)
    if (params.seedTracks && params.seedTracks.length > 0) {
      queryParams.append('seed_tracks', params.seedTracks.slice(0, 5).join(','))
    } else if (params.seedArtists && params.seedArtists.length > 0) {
      queryParams.append('seed_artists', params.seedArtists.slice(0, 5).join(','))
    } else {
      // Use multiple genres for better reliability with Client Credentials
      // Single genre + market=US often fails with 404 for anonymous tokens
      const safeGenres = ['pop', 'edm', 'indie']
      queryParams.append('seed_genres', safeGenres.join(','))
      
      // Add target features for better recommendations
      queryParams.append('target_energy', '0.5')
      queryParams.append('target_valence', '0.5')
    }

    // Add target audio features if provided (0-1 range)
    if (params.danceability !== undefined) {
      queryParams.append('target_danceability', String(Math.max(0, Math.min(1, params.danceability))))
    }
    if (params.energy !== undefined) {
      queryParams.append('target_energy', String(Math.max(0, Math.min(1, params.energy))))
    }
    if (params.valence !== undefined) {
      queryParams.append('target_valence', String(Math.max(0, Math.min(1, params.valence))))
    }

    const url = `https://api.spotify.com/v1/recommendations?${queryParams}`
    console.log('Requesting Spotify recommendations from:', url)
    console.log('Token length:', token.length)
    console.log('Token starts with:', token.substring(0, 20) + '...')
    
    // Retry logic with rate limiting (inspired by the repository)
    let response: Response | undefined
    let retries = 3
    
    while (retries > 0) {
      try {
        response = await fetch(url, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('Spotify recommendations response status:', response.status)

        if (response.ok) {
          break // Success, exit retry loop
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 3000
          console.log(`Rate limited, waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          retries--
          continue
        }

        // Handle 404 - likely invalid parameters or Client Credentials issue
        if (response.status === 404) {
          console.error('Spotify API 404 - Invalid parameters or Client Credentials issue')
          console.log('Request URL:', url)
          console.log('Query params:', Object.fromEntries(queryParams.entries()))
          
          // Try fallback with just 'pop' genre (no market, no target features)
          if (queryParams.has('seed_genres')) {
            console.log('Trying fallback: using only pop genre...')
            const fallbackUrl = 'https://api.spotify.com/v1/recommendations?limit=20&seed_genres=pop'
            const fallbackResponse = await fetch(fallbackUrl, {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (fallbackResponse.ok) {
              console.log('Fallback successful!')
              response = fallbackResponse
              break
            }
          }
          
          throw new Error('Spotify recommendations failed: Invalid parameters (404) - try using seed_artists or seed_tracks instead')
        }

        // Handle other errors
        let errorMessage = 'Unknown error'
        try {
          const error = await response.json()
          errorMessage = error.error?.message || error.message || `HTTP ${response.status}`
          console.error('Spotify API error details:', error)
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(`Spotify recommendations failed: ${errorMessage}`)
      } catch (error) {
        retries--
        if (retries === 0) throw error
        console.log(`Request failed, retrying... (${retries} attempts left)`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
      }
    }

    if (!response) {
      throw new Error('Failed to get response from Spotify API after retries')
    }

    const data = await response.json()
    console.log('Successfully got recommendations:', data.tracks?.length || 0, 'tracks')
    
    // Filter out tracks without preview URLs (not playable)
    if (data.tracks) {
      data.tracks = data.tracks.filter((track: any) => track.preview_url)
      console.log('Filtered to playable tracks:', data.tracks.length)
    }
    
    return data
  } catch (error) {
    console.error('Recommendations fetch error:', error)
    throw error
  }
}

export async function getAudioFeatures(
  token: string, 
  trackIds: string[]
): Promise<SpotifyAudioFeaturesResponse> {
  try {
    // Spotify allows max 100 track IDs per request
    const maxIds = trackIds.slice(0, 100)
    const url = `https://api.spotify.com/v1/audio-features?ids=${maxIds.join(',')}`
    
    console.log('Requesting audio features for', maxIds.length, 'tracks')
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Audio features response status:', response.status)

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || `HTTP ${response.status}`
        console.error('Spotify audio features error details:', error)
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(`Audio features fetch failed: ${errorMessage}`)
    }

    const data = await response.json()
    console.log('Successfully got audio features for', data.audio_features?.length || 0, 'tracks')
    return data
  } catch (error) {
    console.error('Audio features fetch error:', error)
    throw error
  }
}

// Fallback data for when Spotify API is unavailable
export const FALLBACK_TRACKS = [
  {
    id: 'fallback-1',
    name: 'Sample Track 1',
    artist: 'Sample Artist',
    preview: null,
    popularity: 80,
    danceability: 0.7,
    energy: 0.8,
    valence: 0.6,
    tempo: 120,
    acousticness: 0.3,
    instrumentalness: 0.1,
    liveness: 0.2,
    speechiness: 0.1,
    loudness: -5.0,
    mode: 1,
    key: 0,
    time_signature: 4
  },
  {
    id: 'fallback-2',
    name: 'Sample Track 2',
    artist: 'Sample Artist',
    preview: null,
    popularity: 75,
    danceability: 0.5,
    energy: 0.6,
    valence: 0.4,
    tempo: 100,
    acousticness: 0.8,
    instrumentalness: 0.2,
    liveness: 0.3,
    speechiness: 0.05,
    loudness: -8.0,
    mode: 0,
    key: 3,
    time_signature: 4
  }
] as const
