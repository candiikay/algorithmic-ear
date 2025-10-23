import React, { useState, useEffect } from 'react'
import { getRecommendations } from './lib/spotify'
import type { Track } from './types'

function App() {
  const [state, setState] = useState({
    isLoading: true,
    tracks: [] as Track[],
    selectedSong: null as Track | null,
    nextSong: null as Track | null,
    error: null as string | null
  })

  const [metricFilter, setMetricFilter] = useState({
    feature: null as keyof Track | null,
    minValue: 0,
    maxValue: 10
  })

  // Load tracks on mount
  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      console.log('🚀 Starting data load (v5.0 - Slider Picker)')
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const recommendations = await getRecommendations(['pop', 'electronic', 'indie', 'rock', 'hip-hop'], 100)
      console.log('🎵 Got recommendations:', recommendations.tracks.length, 'tracks')
      
      setState(prev => ({ 
        ...prev, 
        tracks: recommendations.tracks,
        isLoading: false 
      }))
      
      console.log('✅ Successfully loaded real Spotify data!')
    } catch (error) {
      console.error('❌ Error loading tracks:', error)
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load music data. Please try again.' 
      }))
    }
  }

  const getFilteredTracks = () => {
    let filtered = state.tracks

    // Sort by selected feature if one is chosen
    if (metricFilter.feature) {
      filtered = [...state.tracks].sort((a, b) => {
        const aVal = a[metricFilter.feature!] as number
        const bVal = b[metricFilter.feature!] as number
        return aVal - bVal
      })
    }

    return filtered
  }

  const selectRandomSong = () => {
    const filteredTracks = getFilteredTracks()
    if (filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length)
      const randomSong = filteredTracks[randomIndex]
      setState(prev => ({ ...prev, selectedSong: randomSong }))
      setMetricFilter(prev => ({ ...prev, minValue: randomIndex }))
    }
  }

  const findNextSong = () => {
    if (!state.selectedSong) return

    const filteredTracks = getFilteredTracks()
    const currentIndex = filteredTracks.findIndex(track => track.id === state.selectedSong?.id)
    
    if (currentIndex >= 0 && currentIndex < filteredTracks.length - 1) {
      const nextSong = filteredTracks[currentIndex + 1]
      setState(prev => ({ ...prev, nextSong }))
    }
  }

  // Auto-find next song when selected song changes
  useEffect(() => {
    if (state.selectedSong) {
      findNextSong()
    }
  }, [state.selectedSong])

  if (state.isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎧</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Loading your music...</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>This may take a moment</div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      padding: '2rem'
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
        {/* Song Picker with Slider */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>1. Choose Your Starting Song</h2>
          
          {/* Feature Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
              Choose a feature, then slide to pick a song based on that feature!
            </p>
            
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

            {/* Random Song Button */}
            <button
              onClick={selectRandomSong}
              style={{
                padding: '10px 20px',
                borderRadius: '25px',
                border: '2px solid #ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                color: '#ff6b6b',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginTop: '15px',
                width: '100%'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 107, 107, 0.2)'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 107, 107, 0.1)'
              }}
            >
              🎲 Pick Random Song
            </button>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>2. Choose What Makes Songs "Similar"</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.5rem' }}>
            The algorithm will find the song with the closest value for this feature.
          </p>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            {[
              { key: 'danceability', label: 'Danceability', icon: '💃', description: 'How danceable.' },
              { key: 'energy', label: 'Energy', icon: '⚡', description: 'How energetic.' },
              { key: 'valence', label: 'Valence', icon: '😊', description: 'How happy/sad.' },
              { key: 'tempo', label: 'Tempo', icon: '🎵', description: 'How fast.' },
              { key: 'acousticness', label: 'Acousticness', icon: '🎸', description: 'How acoustic.' }
            ].map(metric => (
              <div
                key={metric.key}
                onClick={() => setState(prev => ({ ...prev, selectedFeature: metric.key as keyof Track }))}
                style={{
                  padding: '15px',
                  borderRadius: '10px',
                  backgroundColor: state.selectedFeature === metric.key ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                  border: state.selectedFeature === metric.key ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
                onMouseOver={(e) => {
                  if (state.selectedFeature !== metric.key) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                  }
                }}
                onMouseOut={(e) => {
                  if (state.selectedFeature !== metric.key) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  }
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>{metric.icon}</div>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{metric.label}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{metric.description}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    backgroundColor: state.selectedFeature === metric.key ? '#667eea' : 'transparent'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {state.selectedSong && state.nextSong && (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          padding: '30px',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>🎯 The Greedy Algorithm Says...</h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 1fr', 
            gap: '2rem',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            {/* Your Song */}
            <div style={{
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid #667eea'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#667eea' }}>Your Song</h3>
              <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                <strong>{state.selectedSong.name}</strong><br />
                <em>{state.selectedSong.artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature && (
                  <div>
                    {state.selectedFeature}: {(state.selectedSong[state.selectedFeature] as number * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ fontSize: '2rem' }}>→</div>

            {/* Next Song */}
            <div style={{
              backgroundColor: 'rgba(255, 107, 107, 0.2)',
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid #ff6b6b'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>Next Song</h3>
              <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                <strong>{state.nextSong.name}</strong><br />
                <em>{state.nextSong.artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature && (
                  <div>
                    {state.selectedFeature}: {(state.nextSong[state.selectedFeature] as number * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '1rem', opacity: 0.8 }}>
            The algorithm found the song with the closest {state.selectedFeature} value to your selection.
          </div>
        </div>
      )}
    </div>
  )
}

export default App