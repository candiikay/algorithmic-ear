import React, { useState, useEffect } from 'react'
import type { Track } from './types'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import { normalizeFeatures } from './lib/transform'
import { generatePlaylist, ALGORITHM_CONFIGS } from './lib/algorithms'

interface AppState {
  isLoading: boolean
  tracks: Track[]
  currentTrack: Track | null
  playlist: Track[]
  currentAlgorithm: keyof typeof ALGORITHM_CONFIGS
  error: string | null
}

function App() {
  console.log('🎧 App component rendering...')
  
  const [state, setState] = useState<AppState>({
    isLoading: true,
    tracks: [],
    currentTrack: null,
    playlist: [],
    currentAlgorithm: 'greedyDanceability',
    error: null
  })

  // Prevent infinite re-renders
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Debug: Log state changes
  console.log('🎯 Current state:', {
    isLoading: state.isLoading,
    tracksCount: state.tracks.length,
    playlistCount: state.playlist.length,
    currentTrack: state.currentTrack?.name || 'none',
    error: state.error
  })

  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      loadTracks()
    }
  }, [hasInitialized])

  const loadTracks = async () => {
    console.log('🚀 Starting data load (v3.0 - Custom Engine)')
    console.log('App is loading...')
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokenData = await getToken()
      console.log('🔑 Got token, calling CUSTOM getRecommendations...')
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 20
      })
      console.log('🎵 Got recommendations from CUSTOM engine:', recommendations.tracks.length, 'tracks')
      
      const tracksAsTrackType = recommendations.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        preview: track.preview_url || '',
        popularity: track.popularity || 50,
        danceability: (track as any).danceability || 0.5,
        energy: (track as any).energy || 0.5,
        valence: (track as any).valence || 0.5,
        tempo: (track as any).tempo || 120,
        acousticness: (track as any).acousticness || 0.5,
        instrumentalness: (track as any).instrumentalness || 0.5,
        liveness: (track as any).liveness || 0.5,
        speechiness: (track as any).speechiness || 0.5,
        loudness: (track as any).loudness || -10,
        mode: (track as any).mode || 1,
        key: (track as any).key || 0,
        time_signature: (track as any).time_signature || 4
      }))
      
      console.log('🎯 About to normalize features for', tracksAsTrackType.length, 'tracks')
      let normalizedTracks: Track[] = []
      try {
        normalizedTracks = normalizeFeatures(tracksAsTrackType)
        console.log('✅ Features normalized successfully, got', normalizedTracks.length, 'tracks')
        
        console.log('🎯 About to update state with tracks')
        console.log('🎯 Sample normalized track:', normalizedTracks[0])
        setState(prev => {
          console.log('🎯 Previous state:', prev)
          const newState = {
            ...prev,
            tracks: normalizedTracks,
            currentTrack: normalizedTracks[0] || null,
            isLoading: false
          }
          console.log('🎯 New state:', newState)
          return newState
        })
        console.log('✅ State updated successfully')
      } catch (error) {
        console.error('❌ Error normalizing features or updating state:', error)
        throw error
      }
      
      if (normalizedTracks.length > 0) {
        console.log('🎯 About to generate playlist with', normalizedTracks.length, 'tracks')
        try {
          generateNewPlaylist(normalizedTracks, 'greedyDanceability')
          console.log('✅ Playlist generated successfully')
        } catch (error) {
          console.error('❌ Error generating playlist:', error)
        }
      }
    } catch (err) {
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      
      setState(prev => ({
        ...prev,
        tracks: fallbackTracks,
        currentTrack: fallbackTracks[0] || null,
        error: 'Using sample data (Spotify API unavailable)',
        isLoading: false
      }))
      
      if (fallbackTracks.length > 0) {
        generateNewPlaylist(fallbackTracks, 'greedyDanceability')
      }
    }
  }

  const generateNewPlaylist = (trackPool: Track[], algorithm: keyof typeof ALGORITHM_CONFIGS) => {
    console.log('🎯 generateNewPlaylist called with:', { trackPoolLength: trackPool.length, algorithm })
    
    try {
      let newPlaylist: Track[] = []
      
      if (algorithm === 'clustering') {
        console.log('🎯 Using clustering algorithm')
        // newPlaylist = generateClusteringPlaylist(trackPool, 8, 5)
        newPlaylist = trackPool.slice(0, 8) // Simple fallback
      } else if (algorithm === 'hybrid') {
        console.log('🎯 Using hybrid algorithm')
        // newPlaylist = generateHybridPlaylist(trackPool, 8)
        newPlaylist = trackPool.slice(0, 8) // Simple fallback
      } else {
        console.log('🎯 Using greedy algorithm:', algorithm)
        const config = { ...ALGORITHM_CONFIGS[algorithm] }
        newPlaylist = generatePlaylist(trackPool, config, 8)
      }
      
      console.log('🎯 Generated playlist with', newPlaylist.length, 'tracks')
      setState(prev => ({ ...prev, playlist: newPlaylist }))
      console.log('✅ Playlist state updated')
    } catch (error) {
      console.error('❌ Error in generateNewPlaylist:', error)
      throw error
    }
  }

  const handleAlgorithmChange = (algorithm: keyof typeof ALGORITHM_CONFIGS) => {
    setState(prev => ({ ...prev, currentAlgorithm: algorithm }))
    generateNewPlaylist(state.tracks, algorithm)
  }

  const handleTrackSelect = (track: Track) => {
    setState(prev => ({ ...prev, currentTrack: track }))
  }

  if (state.isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧 The Algorithmic Ear</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Loading how machines listen...</p>
        <p style={{ fontSize: '1rem', opacity: 0.7, marginTop: '1rem' }}>
          Debug: {state.tracks.length} tracks loaded
        </p>
      </div>
    )
  }

  // SUPER SIMPLE VERSION - NO COMPLEX COMPONENTS
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a2e',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '2rem', textAlign: 'center' }}>
        🎧 The Algorithmic Ear
      </h1>
      
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '2rem'
      }}>
        <h2>📊 Data Status</h2>
        <p>✅ Tracks loaded: {state.tracks.length}</p>
        <p>✅ Playlist generated: {state.playlist.length}</p>
        <p>✅ Current track: {state.currentTrack?.name || 'None'}</p>
        <p>✅ Algorithm: {state.currentAlgorithm}</p>
        {state.error && <p style={{ color: '#ff6b6b' }}>⚠️ {state.error}</p>}
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '2rem'
      }}>
        <h2>🎛️ Algorithm Controls</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Object.entries(ALGORITHM_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleAlgorithmChange(key as keyof typeof ALGORITHM_CONFIGS)}
              style={{
                padding: '10px 20px',
                backgroundColor: state.currentAlgorithm === key ? '#667eea' : 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {key === 'greedyDanceability' && 'Greedy: Most Danceable'}
              {key === 'greedyEnergy' && 'Greedy: Most Energetic'}
              {key === 'searchHappy' && 'Search: Happy Mood'}
              {key === 'searchChill' && 'Search: Chill Mood'}
              {key === 'clustering' && 'Clustering: Similar Tracks'}
              {key === 'hybrid' && 'Hybrid: Mixed Approach'}
            </button>
          ))}
        </div>
      </div>

      {state.tracks.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <h2>🎵 Sample Tracks</h2>
          {state.tracks.slice(0, 5).map((track, index) => (
            <div key={track.id} style={{ 
              padding: '10px', 
              margin: '5px 0', 
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '5px',
              cursor: 'pointer'
            }} onClick={() => handleTrackSelect(track)}>
              <strong>{index + 1}.</strong> {track.name} - {track.artist}
              <br />
              <small>Energy: {(track.energy * 100).toFixed(0)}% | Valence: {(track.valence * 100).toFixed(0)}%</small>
            </div>
          ))}
        </div>
      )}

      {state.playlist.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2>🎯 Generated Playlist</h2>
          {state.playlist.map((track, index) => (
            <div key={track.id} style={{ 
              padding: '10px', 
              margin: '5px 0', 
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '5px',
              border: track.id === state.currentTrack?.id ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }} onClick={() => handleTrackSelect(track)}>
              <strong>{index + 1}.</strong> {track.name} - {track.artist}
              <br />
              <small>Energy: {(track.energy * 100).toFixed(0)}% | Valence: {(track.valence * 100).toFixed(0)}%</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App