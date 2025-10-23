import React, { useState, useEffect } from 'react'
import type { Track } from './types'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import { normalizeFeatures } from './lib/transform'

interface AppState {
  isLoading: boolean
  tracks: Track[]
  selectedSong: Track | null
  selectedFeature: 'danceability' | 'energy' | 'valence' | 'tempo' | 'acousticness'
  greedyPlaylist: Track[]
  error: string | null
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    tracks: [],
    selectedSong: null,
    selectedFeature: 'danceability',
    greedyPlaylist: [],
    error: null
  })

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokenData = await getToken()
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 50
      })
      
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
      
      const normalizedTracks = normalizeFeatures(tracksAsTrackType)
      
      setState(prev => ({
        ...prev,
        tracks: normalizedTracks,
        selectedSong: normalizedTracks[0] || null,
        isLoading: false
      }))
    } catch (err) {
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      
      setState(prev => ({
        ...prev,
        tracks: fallbackTracks,
        selectedSong: fallbackTracks[0] || null,
        error: 'Using sample data (Spotify API unavailable)',
        isLoading: false
      }))
    }
  }

  // The core greedy algorithm
  const greedyNextSong = (seed: Track, candidates: Track[], feature: keyof Track): Track | null => {
    let closest: Track | null = null
    let minDiff = Infinity
    
    for (const track of candidates) {
      if (track.id === seed.id) continue // Skip the seed song
      
      const diff = Math.abs((track[feature] as number) - (seed[feature] as number))
      if (diff < minDiff) {
        closest = track
        minDiff = diff
      }
    }
    
    return closest
  }

  const generateGreedyPlaylist = () => {
    if (!state.selectedSong) return

    const playlist: Track[] = [state.selectedSong]
    const usedIds = new Set([state.selectedSong.id])
    let currentSong = state.selectedSong

    // Generate 9 more songs (10 total)
    for (let i = 0; i < 9; i++) {
      const availableTracks = state.tracks.filter(track => !usedIds.has(track.id))
      const nextSong = greedyNextSong(currentSong, availableTracks, state.selectedFeature)
      
      if (nextSong) {
        playlist.push(nextSong)
        usedIds.add(nextSong.id)
        currentSong = nextSong
      } else {
        break // No more songs available
      }
    }

    setState(prev => ({ ...prev, greedyPlaylist: playlist }))
  }

  const handleSongSelect = (song: Track) => {
    setState(prev => ({ ...prev, selectedSong: song, greedyPlaylist: [] }))
  }

  const handleFeatureChange = (feature: keyof Track) => {
    setState(prev => ({ ...prev, selectedFeature: feature as any, greedyPlaylist: [] }))
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
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧 Greedy Listening</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Loading how algorithms decide what sounds similar...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a2e',
      color: 'white',
      minHeight: '100vh'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          🎧 Greedy Listening
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
          What happens when we let a greedy algorithm decide what we listen to next?
          <br />
          <em>Simulating Spotify's recommendation logic with one simple rule.</em>
        </p>
        {state.error && (
          <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>
            ⚠️ {state.error}
          </p>
        )}
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* Song Selection */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>1. Choose Your Starting Song</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {state.tracks.slice(0, 20).map((track, index) => (
              <div 
                key={track.id}
                onClick={() => handleSongSelect(track)}
                style={{ 
                  padding: '10px', 
                  margin: '5px 0', 
                  backgroundColor: track.id === state.selectedSong?.id ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  border: track.id === state.selectedSong?.id ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <strong>{index + 1}.</strong> {track.name} - {track.artist}
                <br />
                <small style={{ opacity: 0.7 }}>
                  Danceability: {(track.danceability * 100).toFixed(0)}% | 
                  Energy: {(track.energy * 100).toFixed(0)}% | 
                  Valence: {(track.valence * 100).toFixed(0)}%
                </small>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Selection */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>2. Choose What Makes Songs "Similar"</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'danceability', label: 'Danceability', desc: 'How suitable a track is for dancing' },
              { key: 'energy', label: 'Energy', desc: 'Perceptual measure of intensity and power' },
              { key: 'valence', label: 'Valence', desc: 'Musical positivity (happy vs sad)' },
              { key: 'tempo', label: 'Tempo', desc: 'Overall estimated tempo in BPM' },
              { key: 'acousticness', label: 'Acousticness', desc: 'Confidence measure of acoustic recording' }
            ].map(feature => (
              <label key={feature.key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '10px',
                backgroundColor: state.selectedFeature === feature.key ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255,255,255,0.05)',
                borderRadius: '5px',
                cursor: 'pointer',
                border: state.selectedFeature === feature.key ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)'
              }}>
                <input
                  type="radio"
                  name="feature"
                  value={feature.key}
                  checked={state.selectedFeature === feature.key}
                  onChange={() => handleFeatureChange(feature.key as any)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>{feature.label}</strong>
                  <br />
                  <small style={{ opacity: 0.7 }}>{feature.desc}</small>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          onClick={generateGreedyPlaylist}
          disabled={!state.selectedSong}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            backgroundColor: state.selectedSong ? '#667eea' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: state.selectedSong ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          🎯 Generate Greedy Playlist
        </button>
      </div>

      {/* Greedy Playlist Results */}
      {state.greedyPlaylist.length > 0 && (
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>
            🎵 Greedy Algorithm Playlist ({state.greedyPlaylist.length} songs)
          </h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            <strong>Algorithm:</strong> Always pick the song with the closest {state.selectedFeature} value to the previous song.
          </p>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            {state.greedyPlaylist.map((track, index) => (
              <div key={track.id} style={{ 
                padding: '15px', 
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(102, 126, 234, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{index + 1}.</strong> {track.name} - {track.artist}
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      {state.selectedFeature}: {((track[state.selectedFeature] as number) * 100).toFixed(0)}%
                    </small>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.9rem', opacity: 0.7 }}>
                    {index > 0 && (
                      <div>
                        Diff: {Math.abs((track[state.selectedFeature] as number) - (state.greedyPlaylist[index - 1][state.selectedFeature] as number)).toFixed(3)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection Section */}
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>🤔 What This Shows</h2>
        <div style={{ lineHeight: '1.6' }}>
          <p>
            <strong>Algorithmic Convergence:</strong> Notice how the {state.selectedFeature} values get closer and closer together as the playlist progresses. This is the greedy algorithm optimizing for similarity.
          </p>
          <p>
            <strong>Cultural Flattening:</strong> By always choosing the "most similar" song, the algorithm creates a narrow, predictable listening experience. Real discovery requires surprise and diversity.
          </p>
          <p>
            <strong>Optimization vs. Discovery:</strong> This demonstrates how algorithmic systems prioritize engagement and similarity over cultural exploration and serendipity.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App