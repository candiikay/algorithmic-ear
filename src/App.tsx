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
  searchQuery: string
  genreFilter: string
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    tracks: [],
    selectedSong: null,
    selectedFeature: 'danceability',
    greedyPlaylist: [],
    error: null,
    searchQuery: '',
    genreFilter: 'all'
  })

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokenData = await getToken()
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie', 'rock', 'hip-hop', 'jazz', 'classical', 'country', 'reggae', 'blues'],
        limit: 100
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

  const findNextSong = () => {
    if (!state.selectedSong) return

    const availableTracks = state.tracks.filter(track => track.id !== state.selectedSong!.id)
    const nextSong = greedyNextSong(state.selectedSong, availableTracks, state.selectedFeature)
    
    if (nextSong) {
      setState(prev => ({ ...prev, greedyPlaylist: [state.selectedSong!, nextSong] }))
    }
  }

  const handleSongSelect = (song: Track) => {
    setState(prev => ({ ...prev, selectedSong: song, greedyPlaylist: [] }))
  }

  const handleFeatureChange = (feature: keyof Track) => {
    setState(prev => ({ ...prev, selectedFeature: feature as any, greedyPlaylist: [] }))
  }

  const getFilteredTracks = () => {
    let filtered = state.tracks

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(track => 
        track.name.toLowerCase().includes(query) || 
        track.artist.toLowerCase().includes(query)
      )
    }

    // Filter by genre (this is a simplified genre detection based on track position)
    if (state.genreFilter !== 'all') {
      // Since we don't have explicit genre data, we'll use the track order
      // This is a simplified approach - in a real app you'd have genre metadata
      const genreRanges = {
        'pop': [0, 9],
        'electronic': [10, 19],
        'indie': [20, 29],
        'rock': [30, 39],
        'hip-hop': [40, 49],
        'jazz': [50, 59],
        'classical': [60, 69],
        'country': [70, 79],
        'reggae': [80, 89],
        'blues': [90, 99]
      }
      
      const range = genreRanges[state.genreFilter as keyof typeof genreRanges]
      if (range) {
        filtered = filtered.slice(range[0], range[1] + 1)
      }
    }

    return filtered
  }

  const selectRandomSong = () => {
    const filteredTracks = getFilteredTracks()
    if (filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length)
      handleSongSelect(filteredTracks[randomIndex])
    }
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
          
          {/* Search and Filter Controls */}
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              placeholder="🔍 Search songs or artists..."
              value={state.searchQuery || ''}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            />
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={state.genreFilter || 'all'}
                onChange={(e) => setState(prev => ({ ...prev, genreFilter: e.target.value }))}
                style={{
                  padding: '8px',
                  borderRadius: '5px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                <option value="all">All Genres</option>
                <option value="pop">Pop</option>
                <option value="electronic">Electronic</option>
                <option value="indie">Indie</option>
                <option value="rock">Rock</option>
                <option value="hip-hop">Hip-Hop</option>
                <option value="jazz">Jazz</option>
                <option value="classical">Classical</option>
                <option value="country">Country</option>
                <option value="reggae">Reggae</option>
                <option value="blues">Blues</option>
              </select>
              
              <button
                onClick={selectRandomSong}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ff6b6b',
                  backgroundColor: 'rgba(255, 107, 107, 0.2)',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🎲 Random Song
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {getFilteredTracks().slice(0, 30).map((track, index) => (
              <div 
                key={track.id}
                onClick={() => handleSongSelect(track)}
                style={{ 
                  padding: '12px', 
                  margin: '5px 0', 
                  backgroundColor: track.id === state.selectedSong?.id ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: track.id === state.selectedSong?.id ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease',
                  transform: track.id === state.selectedSong?.id ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (track.id !== state.selectedSong?.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.transform = 'scale(1.01)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (track.id !== state.selectedSong?.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{track.name}</strong>
                    <br />
                    <em style={{ fontSize: '12px', opacity: 0.8 }}>{track.artist}</em>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.7 }}>
                    <div>💃 {(track.danceability * 100).toFixed(0)}%</div>
                    <div>⚡ {(track.energy * 100).toFixed(0)}%</div>
                    <div>😊 {(track.valence * 100).toFixed(0)}%</div>
                  </div>
                </div>
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
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '1rem' }}>
            The algorithm will find the song with the closest value for this feature.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { key: 'danceability', label: '💃 Danceability', desc: 'How danceable', emoji: '💃' },
              { key: 'energy', label: '⚡ Energy', desc: 'How energetic', emoji: '⚡' },
              { key: 'valence', label: '😊 Valence', desc: 'How happy/sad', emoji: '😊' },
              { key: 'tempo', label: '🎵 Tempo', desc: 'How fast', emoji: '🎵' },
              { key: 'acousticness', label: '🎸 Acousticness', desc: 'How acoustic', emoji: '🎸' }
            ].map(feature => (
              <label key={feature.key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '15px',
                backgroundColor: state.selectedFeature === feature.key ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                cursor: 'pointer',
                border: state.selectedFeature === feature.key ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                transform: state.selectedFeature === feature.key ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (state.selectedFeature !== feature.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.transform = 'scale(1.01)'
                }
              }}
              onMouseLeave={(e) => {
                if (state.selectedFeature !== feature.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
              >
                <input
                  type="radio"
                  name="feature"
                  value={feature.key}
                  checked={state.selectedFeature === feature.key}
                  onChange={() => handleFeatureChange(feature.key as any)}
                  style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {feature.label}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {feature.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          onClick={findNextSong}
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
          🎯 Find Next Song
        </button>
      </div>

      {/* Next Song Result */}
      {state.greedyPlaylist.length === 2 && (
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>
            🎵 Greedy Algorithm Says: "Play This Next"
          </h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            <strong>Algorithm:</strong> Found the song with the closest {state.selectedFeature} value to your selection.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Original Song */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              border: '2px solid #667eea'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#667eea' }}>🎧 Your Song</h3>
              <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                <strong>{state.greedyPlaylist[0].name}</strong>
                <br />
                <em>{state.greedyPlaylist[0].artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature}: {((state.greedyPlaylist[0][state.selectedFeature] as number) * 100).toFixed(0)}%
              </div>
            </div>

            {/* Next Song */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(46, 204, 113, 0.2)',
              borderRadius: '8px',
              border: '2px solid #2ecc71'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2ecc71' }}>➡️ Next Song</h3>
              <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                <strong>{state.greedyPlaylist[1].name}</strong>
                <br />
                <em>{state.greedyPlaylist[1].artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature}: {((state.greedyPlaylist[1][state.selectedFeature] as number) * 100).toFixed(0)}%
                <br />
                <strong>Difference:</strong> {Math.abs((state.greedyPlaylist[1][state.selectedFeature] as number) - (state.greedyPlaylist[0][state.selectedFeature] as number)).toFixed(3)}
              </div>
            </div>
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