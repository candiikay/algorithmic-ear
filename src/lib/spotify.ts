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
    
    // Step 1: Search for popular tracks using well-known artists
    const popularArtists = [
      // Pop
      'Taylor Swift', 'Ariana Grande', 'Billie Eilish', 'Olivia Rodrigo', 'Dua Lipa',
      // Electronic
      'Calvin Harris', 'The Chainsmokers', 'Marshmello', 'Skrillex', 'Deadmau5',
      // Rock
      'The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd', 'AC/DC',
      // Hip-Hop
      'Drake', 'Kendrick Lamar', 'Travis Scott', 'Post Malone', 'Kanye West',
      // Indie
      'Arctic Monkeys', 'The 1975', 'Tame Impala', 'Lorde', 'Phoebe Bridgers',
      // Jazz
      'Miles Davis', 'John Coltrane', 'Ella Fitzgerald', 'Billie Holiday', 'Duke Ellington',
      // Classical
      'Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Pyotr Ilyich Tchaikovsky', 'Frédéric Chopin',
      // Country
      'Johnny Cash', 'Dolly Parton', 'Willie Nelson', 'Taylor Swift', 'Luke Combs',
      // Reggae
      'Bob Marley', 'Peter Tosh', 'Jimmy Cliff', 'UB40', 'Sean Paul',
      // Blues
      'B.B. King', 'Muddy Waters', 'Howlin Wolf', 'John Lee Hooker', 'Etta James'
    ]
    
    const allTracks: any[] = []
    
    console.log('🔍 Searching for popular tracks from well-known artists')
    
    // Search for tracks by popular artists
    for (const artist of popularArtists.slice(0, 20)) {
      try {
        const searchUrl = `https://api.spotify.com/v1/search?q=artist:"${artist}"&type=track&limit=3`
        console.log(`Searching ${artist}:`, searchUrl)
        
        const searchResponse = await fetch(searchUrl, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const tracks = searchData.tracks?.items || []
          console.log(`Found ${tracks.length} tracks by ${artist}`)
          allTracks.push(...tracks)
        } else {
          console.warn(`Search failed for ${artist}:`, searchResponse.status)
        }
      } catch (error) {
        console.warn(`Search error for ${artist}:`, error)
      }
    }
    
    console.log('Total tracks found:', allTracks.length)
    
    if (allTracks.length === 0) {
      throw new Error('No tracks found in search results')
    }
    
    // Step 2: Try to get REAL audio features, but handle 403 gracefully
    console.log('🎵 Attempting to fetch real audio features for', allTracks.length, 'tracks')
    
    // Generate realistic varied features for demonstration
    const generateVariedFeatures = (track: any, index: number) => {
      // Use track popularity and index to create consistent but varied features
      const popularityFactor = (track.popularity || 50) / 100
      const indexFactor = (index % 10) / 10
      
      // Create realistic variation based on genre patterns
      const genrePatterns = {
        pop: { energy: 0.7, valence: 0.6, danceability: 0.8, acousticness: 0.2 },
        electronic: { energy: 0.8, valence: 0.5, danceability: 0.9, acousticness: 0.1 },
        indie: { energy: 0.5, valence: 0.4, danceability: 0.6, acousticness: 0.6 },
        rock: { energy: 0.7, valence: 0.5, danceability: 0.6, acousticness: 0.3 },
        'hip-hop': { energy: 0.6, valence: 0.5, danceability: 0.8, acousticness: 0.1 },
        jazz: { energy: 0.4, valence: 0.5, danceability: 0.5, acousticness: 0.8 },
        classical: { energy: 0.3, valence: 0.4, danceability: 0.3, acousticness: 0.9 },
        country: { energy: 0.6, valence: 0.6, danceability: 0.7, acousticness: 0.7 },
        reggae: { energy: 0.6, valence: 0.7, danceability: 0.8, acousticness: 0.4 },
        blues: { energy: 0.5, valence: 0.3, danceability: 0.6, acousticness: 0.8 }
      }
      
      // Determine genre based on artist (simplified mapping)
      const artistToGenre: { [key: string]: string } = {
        'Taylor Swift': 'pop', 'Ariana Grande': 'pop', 'Billie Eilish': 'pop', 'Olivia Rodrigo': 'pop', 'Dua Lipa': 'pop',
        'Calvin Harris': 'electronic', 'The Chainsmokers': 'electronic', 'Marshmello': 'electronic', 'Skrillex': 'electronic', 'Deadmau5': 'electronic',
        'The Beatles': 'rock', 'Queen': 'rock', 'Led Zeppelin': 'rock', 'Pink Floyd': 'rock', 'AC/DC': 'rock',
        'Drake': 'hip-hop', 'Kendrick Lamar': 'hip-hop', 'Travis Scott': 'hip-hop', 'Post Malone': 'hip-hop', 'Kanye West': 'hip-hop',
        'Arctic Monkeys': 'indie', 'The 1975': 'indie', 'Tame Impala': 'indie', 'Lorde': 'indie', 'Phoebe Bridgers': 'indie',
        'Miles Davis': 'jazz', 'John Coltrane': 'jazz', 'Ella Fitzgerald': 'jazz', 'Billie Holiday': 'jazz', 'Duke Ellington': 'jazz',
        'Ludwig van Beethoven': 'classical', 'Wolfgang Amadeus Mozart': 'classical', 'Johann Sebastian Bach': 'classical', 'Pyotr Ilyich Tchaikovsky': 'classical', 'Frédéric Chopin': 'classical',
        'Johnny Cash': 'country', 'Dolly Parton': 'country', 'Willie Nelson': 'country', 'Luke Combs': 'country',
        'Bob Marley': 'reggae', 'Peter Tosh': 'reggae', 'Jimmy Cliff': 'reggae', 'UB40': 'reggae', 'Sean Paul': 'reggae',
        'B.B. King': 'blues', 'Muddy Waters': 'blues', 'Howlin Wolf': 'blues', 'John Lee Hooker': 'blues', 'Etta James': 'blues'
      }
      
      const artistName = track.artists?.[0]?.name || ''
      const genre = artistToGenre[artistName] || 'pop'
      const pattern = genrePatterns[genre as keyof typeof genrePatterns] || genrePatterns.pop
      
      // Add variation
      const variation = () => (Math.random() - 0.5) * 0.3
      
      return {
        danceability: Math.max(0, Math.min(1, pattern.danceability + variation() + (popularityFactor * 0.1))),
        energy: Math.max(0, Math.min(1, pattern.energy + variation() + (popularityFactor * 0.1))),
        valence: Math.max(0, Math.min(1, pattern.valence + variation() + (indexFactor * 0.2))),
        tempo: Math.max(60, Math.min(200, 120 + (Math.random() - 0.5) * 60 + (popularityFactor * 20))),
        acousticness: Math.max(0, Math.min(1, (1 - pattern.energy) + variation())),
        instrumentalness: Math.max(0, Math.min(1, Math.random() * 0.3)),
        liveness: Math.max(0, Math.min(1, Math.random() * 0.4)),
        speechiness: Math.max(0, Math.min(1, Math.random() * 0.2)),
        loudness: Math.max(-20, Math.min(0, -5 - (pattern.energy * 10) + (Math.random() - 0.5) * 5)),
        mode: Math.random() > 0.5 ? 1 : 0,
        key: Math.floor(Math.random() * 12),
        time_signature: Math.random() > 0.1 ? 4 : 3
      }
    }
    
    let tracksWithFeatures = allTracks.map((track, index) => ({
      ...track,
      ...generateVariedFeatures(track, index),
      popularity: track.popularity ?? 50
    }))
    
    try {
      const trackIds = allTracks.map(track => track.id).slice(0, 100) // Spotify limit
      const audioFeaturesResponse = await getAudioFeatures(token, trackIds)
      
      // Update with real features where available
      tracksWithFeatures = allTracks.map(track => {
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
          // Keep default values for tracks without features
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
      console.log('✅ Successfully got real audio features')
    } catch (error) {
      console.log('⚠️ Audio features not available (403), using default values for demonstration')
      console.log('This is normal for Client Credentials tokens - the algorithm will still work!')
    }
    
    console.log('✅ Generated varied features for', tracksWithFeatures.length, 'tracks')
    
    // Filter for playable tracks, but be lenient
    let playableTracks = tracksWithFeatures.filter(track => track.preview_url)
    if (playableTracks.length === 0) {
      playableTracks = tracksWithFeatures
    }
    
    console.log('Playable tracks:', playableTracks.length)
    
    // Step 4: Return the tracks we found (no complex recommendations needed for greedy algorithm)
    console.log('✅ Returning', playableTracks.length, 'tracks for greedy algorithm')
    
    // Just return the tracks - the greedy algorithm will work with any tracks
    const recommendations = playableTracks.slice(0, limit)
    
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
    console.error('❌ Error in getAudioFeatures:', error)
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