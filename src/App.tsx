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

  const [loadingProgress, setLoadingProgress] = useState(0)
  const [metricFilter, setMetricFilter] = useState<{
    feature: 'danceability' | 'energy' | 'valence' | 'tempo' | 'acousticness' | null
    minValue: number
    maxValue: number
  }>({
    feature: null,
    minValue: 50,
    maxValue: 60
  })

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    setLoadingProgress(10)

    try {
      setLoadingProgress(20)
      const tokenData = await getToken()
      
      setLoadingProgress(40)
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie', 'rock', 'hip-hop', 'jazz', 'classical', 'country', 'reggae', 'blues'],
        limit: 100
      })
      
      setLoadingProgress(70)
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
      
      setLoadingProgress(90)
      const normalizedTracks = normalizeFeatures(tracksAsTrackType)
      
      setLoadingProgress(100)
      setState(prev => ({
        ...prev,
        tracks: normalizedTracks,
        selectedSong: normalizedTracks[0] || null,
        isLoading: false
      }))
    } catch (err) {
      setLoadingProgress(100)
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

    // Filter by search query - much more flexible search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(track => {
        const trackName = track.name.toLowerCase()
        const artistName = track.artist.toLowerCase()
        
        // Search by individual words
        const queryWords = query.split(' ').filter(word => word.length > 0)
        
        return queryWords.every(word => 
          trackName.includes(word) || 
          artistName.includes(word)
        )
      })
    }

    // Filter by metric value (NEW FEATURE!)
    if (metricFilter.feature) {
      filtered = filtered.filter(track => {
        const featureValue = track[metricFilter.feature] as number
        const percentageValue = featureValue * 100 // Convert 0-1 to 0-100
        const targetValue = metricFilter.minValue
        const range = 10 // ±10% range around the target value
        
        return percentageValue >= (targetValue - range) && percentageValue <= (targetValue + range)
      })
    }

    // Filter by genre using artist-based detection - OPTIMIZED FOR TOP 50 ARTISTS
    if (state.genreFilter !== 'all') {
      const artistToGenre: { [key: string]: string } = {
        // Top 50 artists that are actually loaded (first 50 from the full list)
        // Pop (10 artists)
        'Taylor Swift': 'pop', 'Ariana Grande': 'pop', 'Billie Eilish': 'pop', 'Olivia Rodrigo': 'pop', 'Dua Lipa': 'pop',
        'Ed Sheeran': 'pop', 'Harry Styles': 'pop', 'Justin Bieber': 'pop', 'Selena Gomez': 'pop', 'Miley Cyrus': 'pop',
        
        // Electronic/Dance (10 artists)
        'Calvin Harris': 'electronic', 'The Chainsmokers': 'electronic', 'Marshmello': 'electronic', 'Skrillex': 'electronic', 'Deadmau5': 'electronic',
        'David Guetta': 'electronic', 'Martin Garrix': 'electronic', 'Avicii': 'electronic', 'Swedish House Mafia': 'electronic', 'Tiësto': 'electronic',
        
        // Rock (10 artists)
        'The Beatles': 'rock', 'Queen': 'rock', 'Led Zeppelin': 'rock', 'Pink Floyd': 'rock', 'AC/DC': 'rock',
        'Rolling Stones': 'rock', 'The Who': 'rock', 'Nirvana': 'rock', 'Guns N Roses': 'rock', 'Metallica': 'rock',
        
        // Hip-Hop/Rap (10 artists)
        'Drake': 'hip-hop', 'Kendrick Lamar': 'hip-hop', 'Travis Scott': 'hip-hop', 'Post Malone': 'hip-hop', 'Kanye West': 'hip-hop',
        'J. Cole': 'hip-hop', 'Eminem': 'hip-hop', 'Jay-Z': 'hip-hop', 'Nas': 'hip-hop', 'Tupac': 'hip-hop',
        
        // Indie/Alternative (10 artists)
        'Arctic Monkeys': 'indie', 'The 1975': 'indie', 'Tame Impala': 'indie', 'Lorde': 'indie', 'Phoebe Bridgers': 'indie',
        'Vampire Weekend': 'indie', 'Arcade Fire': 'indie', 'The Strokes': 'indie', 'Interpol': 'indie', 'Modest Mouse': 'indie'
      }
      
      filtered = filtered.filter(track => {
        const artistGenre = artistToGenre[track.artist] || 'pop'
        return artistGenre === state.genreFilter
      })
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
        <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🎧 Greedy Listening</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>Loading how algorithms decide what sounds similar...</p>
        
        {/* Enhanced Progress Bar */}
        <div style={{ 
          width: '400px', 
          height: '12px', 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          borderRadius: '6px',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: `${loadingProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '6px',
            transition: 'width 0.5s ease',
            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
            position: 'relative'
          }}>
            {/* Animated shine effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shine 2s infinite'
            }} />
          </div>
        </div>
        
        {/* Progress Percentage */}
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#667eea'
        }}>
          {loadingProgress}%
        </div>
        
        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
          {loadingProgress < 20 && '🔑 Getting access token...'}
          {loadingProgress >= 20 && loadingProgress < 40 && '🎵 Searching for music...'}
          {loadingProgress >= 40 && loadingProgress < 70 && '🎼 Processing tracks...'}
          {loadingProgress >= 70 && loadingProgress < 90 && '⚡ Generating features...'}
          {loadingProgress >= 90 && '✨ Almost ready...'}
        </p>
        
        {state.error && <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>Error: {state.error}</p>}
      </div>
    )
  }

  return (
    <>
      {/* Add CSS animation for shine effect */}
      <style>
        {`
          @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}
      </style>
      
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
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Try: 'Taylor', 'Drake', 'Beatles', 'jazz', 'classical'..."
                value={state.searchQuery || ''}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
              />
              
              {/* Search suggestions */}
              {state.searchQuery && state.searchQuery.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                    💡 Try searching for:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['Taylor', 'Drake', 'Beatles', 'BTS', 'Miles', 'Bach', 'Marley', 'Hendrix', 'jazz', 'k-pop', 'classical', 'rock', 'pop', 'electronic'].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setState(prev => ({ ...prev, searchQuery: suggestion }))}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'rgba(102, 126, 234, 0.2)',
                          border: '1px solid #667eea',
                          borderRadius: '4px',
                          color: '#667eea',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* SONG PICKER SLIDER - THE RIGHT WAY! */}
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '20px', 
              backgroundColor: 'rgba(102, 126, 234, 0.1)', 
              borderRadius: '10px',
              border: '1px solid rgba(102, 126, 234, 0.3)'
            }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#667eea' }}>
                🎵 Pick Your Song with a Slider
              </h3>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                Choose a feature, then slide to pick a song based on that feature!
              </p>
              
              {/* Feature Selection */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {[
                  { key: 'danceability', label: '💃 Danceability', color: '#ff6b6b' },
                  { key: 'energy', label: '⚡ Energy', color: '#4ecdc4' },
                  { key: 'valence', label: '😊 Valence', color: '#45b7d1' },
                  { key: 'tempo', label: '🎵 Tempo', color: '#96ceb4' },
                  { key: 'acousticness', label: '🎸 Acousticness', color: '#feca57' }
                ].map(metric => (
                  <button
                    key={metric.key}
                    onClick={() => setMetricFilter(prev => ({ ...prev, feature: metric.key as any }))}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '25px',
                      border: `2px solid ${metricFilter.feature === metric.key ? metric.color : 'rgba(255,255,255,0.2)'}`,
                      backgroundColor: metricFilter.feature === metric.key ? metric.color : 'rgba(255,255,255,0.1)',
                      color: metricFilter.feature === metric.key ? 'white' : 'rgba(255,255,255,0.8)',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: metricFilter.feature === metric.key ? 'bold' : 'normal'
                    }}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>

              {/* Song Picker Slider */}
              {metricFilter.feature ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1rem', color: '#667eea', fontWeight: 'bold' }}>
                      Slide to pick a song by {metricFilter.feature}
                    </span>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                      {getFilteredTracks().length} songs available
                    </span>
                  </div>
                  
                  {/* The Actual Song Picker Slider */}
                  <div style={{ 
                    width: '100%', 
                    height: '30px', 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    borderRadius: '15px',
                    position: 'relative',
                    margin: '15px 0'
                  }}>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, getFilteredTracks().length - 1)}
                      value={Math.min(metricFilter.minValue, getFilteredTracks().length - 1)}
                      onChange={(e) => {
                        const index = parseInt(e.target.value)
                        const song = getFilteredTracks()[index]
                        if (song) {
                          setState(prev => ({ ...prev, selectedSong: song }))
                          setMetricFilter(prev => ({ ...prev, minValue: index }))
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '30px',
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        margin: 0,
                        padding: 0,
                        appearance: 'none',
                        WebkitAppearance: 'none'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${(metricFilter.minValue / Math.max(1, getFilteredTracks().length - 1)) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '30px',
                      height: '30px',
                      backgroundColor: '#667eea',
                      borderRadius: '50%',
                      border: '3px solid white',
                      pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                    }} />
                  </div>
                  
                  {/* Current Song Display */}
                  {state.selectedSong && (
                    <div style={{
                      backgroundColor: 'rgba(102, 126, 234, 0.2)',
                      padding: '15px',
                      borderRadius: '10px',
                      marginTop: '15px',
                      border: '2px solid #667eea'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#667eea', fontSize: '1.1rem' }}>
                        🎵 Selected Song
                      </h4>
                      <div style={{ fontSize: '1rem', marginBottom: '10px' }}>
                        <strong>{state.selectedSong.name}</strong><br />
                        <em>{state.selectedSong.artist}</em>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.9rem' }}>
                        <div>💃 {(state.selectedSong.danceability * 100).toFixed(0)}%</div>
                        <div>⚡ {(state.selectedSong.energy * 100).toFixed(0)}%</div>
                        <div>😊 {(state.selectedSong.valence * 100).toFixed(0)}%</div>
                        <div>🎵 {(state.selectedSong.tempo * 100).toFixed(0)}%</div>
                        <div>🎸 {(state.selectedSong.acousticness * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px', 
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '1rem'
                }}>
                  👆 Select a feature above to start picking songs!
                </div>
              )}
            </div>
              
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
    </>
  )
}

export default App