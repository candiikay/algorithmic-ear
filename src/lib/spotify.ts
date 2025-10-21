// Spotify API integration utilities
import type { TokenResponse, SpotifyRecommendationsResponse, SpotifyAudioFeaturesResponse } from '../types'

export async function getToken(): Promise<TokenResponse> {
  const response = await fetch('/api/token')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Token fetch failed: ${error.message || 'Unknown error'}`)
  }
  return response.json()
}

export async function getRecommendations(
  token: string, 
  params: {
    genres?: string[]
    limit?: number
    danceability?: number
    energy?: number
    valence?: number
  } = {}
): Promise<SpotifyRecommendationsResponse> {
  const queryParams = new URLSearchParams({
    seed_genres: (params.genres || ['pop', 'electronic', 'indie']).join(','),
    limit: String(params.limit || 20),
    ...(params.danceability !== undefined && { target_danceability: String(params.danceability) }),
    ...(params.energy !== undefined && { target_energy: String(params.energy) }),
    ...(params.valence !== undefined && { target_valence: String(params.valence) })
  })

  const response = await fetch(`https://api.spotify.com/v1/recommendations?${queryParams}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Spotify recommendations failed: ${error.error?.message || 'Unknown error'}`)
  }

  return response.json()
}

export async function getAudioFeatures(
  token: string, 
  trackIds: string[]
): Promise<SpotifyAudioFeaturesResponse> {
  const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Audio features fetch failed: ${error.error?.message || 'Unknown error'}`)
  }

  return response.json()
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
