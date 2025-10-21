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
  try {
    console.log('Using custom recommendation engine (Client Credentials compatible)')
    
    const limit = Math.min(params.limit || 20, 50) // Reasonable limit for search
    const targetEnergy = params.energy ?? 0.5
    const targetValence = params.valence ?? 0.5
    const targetDanceability = params.danceability ?? 0.5
    
    // Step 1: Search for tracks by genre
    const searchQueries = params.genres || ['pop', 'electronic', 'indie']
    const allTracks: any[] = []
    
    for (const genre of searchQueries.slice(0, 3)) { // Limit to 3 genres
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=genre:${genre}&type=track&limit=20`
        console.log(`Searching for ${genre} tracks:`, searchUrl)
        
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
          console.log(`Preview URLs available:`, tracks.filter((t: any) => t.preview_url).length)
          allTracks.push(...tracks) // Don't filter yet - we'll filter later
        } else {
          console.warn(`Search failed for ${genre}:`, searchResponse.status)
        }
      } catch (error) {
        console.warn(`Search error for ${genre}:`, error)
      }
    }
    
    console.log('Total combined tracks:', allTracks.length)
    console.log('Sample track:', allTracks[0]?.name, 'by', allTracks[0]?.artists?.[0]?.name)
    
    if (allTracks.length === 0) {
      throw new Error('No tracks found in search results')
    }
    
    // Step 2: Try to get audio features, but don't fail if not available
    let audioFeatures: any[] = []
    
    try {
      const trackIds = allTracks.map(track => track.id).slice(0, 100) // Spotify limit
      const featuresUrl = `https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`
      console.log('Fetching audio features for', trackIds.length, 'tracks')
      
      const featuresResponse = await fetch(featuresUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json()
        audioFeatures = featuresData.audio_features || []
        console.log('Successfully fetched audio features for', audioFeatures.length, 'tracks')
      } else {
        console.warn(`Audio features failed (${featuresResponse.status}) - using default values`)
        // Continue without audio features - we'll use defaults
      }
    } catch (error) {
      console.warn('Audio features error:', error, '- using default values')
      // Continue without audio features - we'll use defaults
    }
    
    // Step 3: Create track + features pairs
    const tracksWithFeatures = allTracks.map(track => {
      const features = audioFeatures.find((f: any) => f && f.id === track.id)
      return {
        ...track,
        ...features,
        // Ensure all required fields exist with safe defaults
        danceability: features?.danceability ?? 0.5,
        energy: features?.energy ?? 0.5,
        valence: features?.valence ?? 0.5,
        tempo: features?.tempo ?? 120,
        acousticness: features?.acousticness ?? 0.5,
        instrumentalness: features?.instrumentalness ?? 0.5,
        liveness: features?.liveness ?? 0.5,
        speechiness: features?.speechiness ?? 0.5,
        loudness: features?.loudness ?? -10,
        popularity: track.popularity ?? 50
      }
    })
    
    console.log('Tracks with features:', tracksWithFeatures.length)
    
    // Filter for playable tracks, but be lenient
    let playableTracks = tracksWithFeatures.filter(track => track.preview_url)
    if (playableTracks.length === 0) {
      console.warn('No preview URLs found - using unfiltered tracks')
      playableTracks = tracksWithFeatures
    }
    
    console.log('Playable tracks:', playableTracks.length)
    
    // Step 4: Custom recommendation algorithm
    const recommendations = playableTracks
      .map(track => {
        // If we have audio features, use them for similarity scoring
        if (audioFeatures.length > 0) {
          const energyDiff = Math.abs(track.energy - targetEnergy)
          const valenceDiff = Math.abs(track.valence - targetValence)
          const danceabilityDiff = Math.abs(track.danceability - targetDanceability)
          
          // Weighted similarity score (lower is better)
          const similarityScore = (energyDiff * 0.4) + (valenceDiff * 0.4) + (danceabilityDiff * 0.2)
          
          return {
            ...track,
            _similarityScore: similarityScore
          }
        } else {
          // If no audio features, use popularity and randomness for variety
          const popularityScore = (100 - (track.popularity || 50)) / 100 // Lower popularity = higher score
          const randomFactor = Math.random() * 0.5
          
          return {
            ...track,
            _similarityScore: popularityScore + randomFactor
          }
        }
      })
      .sort((a, b) => a._similarityScore - b._similarityScore) // Sort by score
      .slice(0, limit) // Take top recommendations
      .map(({ _similarityScore, ...track }) => track) // Remove internal score
    
    console.log('Generated', recommendations.length, 'custom recommendations')
    
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
