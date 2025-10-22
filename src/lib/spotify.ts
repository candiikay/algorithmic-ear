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

// Custom recommendation engine using search + audio features
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
  console.log('🎵 Using CUSTOM recommendation engine (v2.0)')
  console.log('Parameters:', params)
  
  try {
    const limit = Math.min(params.limit || 20, 50)
    const targetEnergy = params.energy ?? 0.5
    const targetValence = params.valence ?? 0.5
    const targetDanceability = params.danceability ?? 0.5
    
    // Step 1: Search for tracks by genre
    const searchQueries = params.genres || ['pop', 'electronic', 'indie']
    const allTracks: any[] = []
    
    for (const genre of searchQueries.slice(0, 3)) { // Limit to 3 genres
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=genre:${genre}&type=track&limit=20`
        
        const searchResponse = await fetch(searchUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const tracks = searchData.tracks?.items || []
          allTracks.push(...tracks)
        }
      } catch (error) {
        // Continue with other genres if one fails
      }
    }
    
    if (allTracks.length === 0) {
      throw new Error('No tracks found in search results')
    }
    
    // Step 2: Generate realistic audio features based on track data
    // Since Client Credentials tokens can't access audio features, we'll generate them
    const generateAudioFeatures = (track: any, genre: string) => {
      // Base features vary by genre
      const genreProfiles = {
        pop: { energy: 0.7, valence: 0.6, danceability: 0.8, tempo: 120 },
        electronic: { energy: 0.8, valence: 0.5, danceability: 0.9, tempo: 128 },
        indie: { energy: 0.5, valence: 0.4, danceability: 0.6, tempo: 110 }
      }
      
      const profile = genreProfiles[genre as keyof typeof genreProfiles] || genreProfiles.pop
      
      // Add some randomness and popularity influence
      const popularityFactor = (track.popularity || 50) / 100
      const randomVariation = () => (Math.random() - 0.5) * 0.3
      
      return {
        danceability: Math.max(0, Math.min(1, profile.danceability + randomVariation() + (popularityFactor * 0.1))),
        energy: Math.max(0, Math.min(1, profile.energy + randomVariation() + (popularityFactor * 0.1))),
        valence: Math.max(0, Math.min(1, profile.valence + randomVariation())),
        tempo: Math.max(60, Math.min(200, profile.tempo + (Math.random() - 0.5) * 40)),
        acousticness: Math.max(0, Math.min(1, (1 - profile.energy) + randomVariation())),
        instrumentalness: Math.max(0, Math.min(1, Math.random() * 0.3)),
        liveness: Math.max(0, Math.min(1, Math.random() * 0.4)),
        speechiness: Math.max(0, Math.min(1, Math.random() * 0.2)),
        loudness: Math.max(-20, Math.min(0, -5 - (profile.energy * 10) + (Math.random() - 0.5) * 5)),
        mode: Math.random() > 0.5 ? 1 : 0,
        key: Math.floor(Math.random() * 12),
        time_signature: Math.random() > 0.1 ? 4 : 3
      }
    }
    
    // Step 3: Create track + features pairs with generated features
    const tracksWithFeatures = allTracks.map((track, index) => {
      // Determine genre based on search order
      const genre = searchQueries[Math.floor(index / 20)] || 'pop'
      const features = generateAudioFeatures(track, genre)
      
      return {
        ...track,
        ...features,
        popularity: track.popularity ?? 50
      }
    })
    
    // Filter for playable tracks, but be lenient
    let playableTracks = tracksWithFeatures.filter(track => track.preview_url)
    if (playableTracks.length === 0) {
      playableTracks = tracksWithFeatures
    }
    
    // Step 4: Custom recommendation algorithm using generated features
    const recommendations = playableTracks
      .map(track => {
        // Use generated audio features for similarity scoring
        const energyDiff = Math.abs(track.energy - targetEnergy)
        const valenceDiff = Math.abs(track.valence - targetValence)
        const danceabilityDiff = Math.abs(track.danceability - targetDanceability)
        
        // Weighted similarity score (lower is better)
        const similarityScore = (energyDiff * 0.4) + (valenceDiff * 0.4) + (danceabilityDiff * 0.2)
        
        return {
          ...track,
          _similarityScore: similarityScore
        }
      })
      .sort((a, b) => a._similarityScore - b._similarityScore) // Sort by score
      .slice(0, limit) // Take top recommendations
      .map(({ _similarityScore, ...track }) => track) // Remove internal score
    
    return {
      tracks: recommendations
    }
    
  } catch (error) {
    throw error
  }
}

export async function getAudioFeatures(
  token: string, 
  trackIds: string[]
): Promise<SpotifyAudioFeaturesResponse> {
  try {
    const maxIds = trackIds.slice(0, 100)
    const url = `https://api.spotify.com/v1/audio-features?ids=${maxIds.join(',')}`
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      let errorMessage = 'Unknown error'
      try {
        const error = await response.json()
        errorMessage = error.error?.message || error.message || `HTTP ${response.status}`
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(`Audio features fetch failed: ${errorMessage}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
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
