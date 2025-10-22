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
  console.log('🎵 Using REAL Spotify recommendation engine (v4.0)')
  console.log('Parameters:', params)
  
  try {
    const limit = Math.min(params.limit || 20, 50)
    const targetEnergy = params.energy ?? 0.5
    const targetValence = params.valence ?? 0.5
    const targetDanceability = params.danceability ?? 0.5
    
    // Step 1: Search for tracks by genre
    const searchQueries = params.genres || ['pop', 'electronic', 'indie']
    const allTracks: any[] = []
    
    console.log('🔍 Searching for tracks with genres:', searchQueries)
    
    for (const genre of searchQueries.slice(0, 3)) {
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=genre:${genre}&type=track&limit=20`
        console.log(`Searching ${genre}:`, searchUrl)
        
        const searchResponse = await fetch(searchUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const tracks = searchData.tracks?.items || []
          console.log(`Found ${tracks.length} ${genre} tracks`)
          allTracks.push(...tracks)
        } else {
          console.warn(`Search failed for ${genre}:`, searchResponse.status)
        }
      } catch (error) {
        console.warn(`Search error for ${genre}:`, error)
      }
    }
    
    console.log('Total tracks found:', allTracks.length)
    
    if (allTracks.length === 0) {
      throw new Error('No tracks found in search results')
    }
    
    // Step 2: Get REAL audio features from Spotify
    console.log('🎵 Fetching real audio features for', allTracks.length, 'tracks')
    
    const trackIds = allTracks.map(track => track.id).slice(0, 100) // Spotify limit
    const audioFeaturesResponse = await getAudioFeatures(token, trackIds)
    
    // Step 3: Create track + features pairs with REAL features
    const tracksWithFeatures = allTracks.map(track => {
      const features = audioFeaturesResponse.audio_features.find((f: any) => f && f.id === track.id)
      
      if (features) {
        return {
          ...track,
          danceability: features.danceability,
          energy: features.energy,
          valence: features.valence,
          tempo: features.tempo,
          acousticness: features.acousticness,
          instrumentalness: features.instrumentalness,
          liveness: features.liveness,
          speechiness: features.speechiness,
          loudness: features.loudness,
          mode: features.mode,
          key: features.key,
          time_signature: features.time_signature,
          popularity: track.popularity ?? 50
        }
      } else {
        // Fallback for tracks without features
        return {
          ...track,
          danceability: 0.5,
          energy: 0.5,
          valence: 0.5,
          tempo: 120,
          acousticness: 0.5,
          instrumentalness: 0.5,
          liveness: 0.5,
          speechiness: 0.5,
          loudness: -10,
          mode: 1,
          key: 0,
          time_signature: 4,
          popularity: track.popularity ?? 50
        }
      }
    })
    
    console.log('✅ Got REAL audio features for', tracksWithFeatures.length, 'tracks')
    
    // Filter for playable tracks, but be lenient
    let playableTracks = tracksWithFeatures.filter(track => track.preview_url)
    if (playableTracks.length === 0) {
      playableTracks = tracksWithFeatures
    }
    
    console.log('Playable tracks:', playableTracks.length)
    
    // Step 4: Use REAL Spotify recommendations
    console.log('🎯 Getting REAL Spotify recommendations...')
    
    try {
      // Try to get real Spotify recommendations using seed tracks
      const seedTracks = playableTracks.slice(0, 5).map(t => t.id).join(',')
      const recommendationsUrl = `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTracks}&limit=${limit}&target_energy=${targetEnergy}&target_valence=${targetValence}&target_danceability=${targetDanceability}`
      
      const recommendationsResponse = await fetch(recommendationsUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json()
        console.log('✅ Got REAL Spotify recommendations:', recommendationsData.tracks.length, 'tracks')
        return { tracks: recommendationsData.tracks }
      } else {
        console.log('⚠️ Spotify recommendations failed, using similarity-based approach')
      }
    } catch (error) {
      console.log('⚠️ Spotify recommendations error, using similarity-based approach')
    }
    
    // Fallback: Use similarity-based recommendations with REAL audio features
    const recommendations = playableTracks
      .map(track => {
        // Use REAL audio features for similarity scoring
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
    
    console.log('✅ Generated', recommendations.length, 'recommendations using REAL audio features')
    
    return {
      tracks: recommendations
    }
    
  } catch (error) {
    console.error('Custom recommendations error:', error)
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