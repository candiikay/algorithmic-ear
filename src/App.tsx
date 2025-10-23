import React, { useState, useEffect, useMemo } from 'react'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import type { Track } from './types'

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectedSong, setSelectedSong] = useState<Track | null>(null)
  const [nextSong, setNextSong] = useState<Track | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<keyof Track | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Starting...')
  const [sliderValue, setSliderValue] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const normalizeTrack = (track: any): Track => ({
    id: track.id,
    name: track.name,
    artist: track.artist || track.artists?.[0]?.name || 'Unknown Artist',
    preview: track.preview ?? track.preview_url ?? null,
    popularity: track.popularity ?? 50,
    danceability: track.danceability ?? 0.5,
    energy: track.energy ?? 0.5,
    valence: track.valence ?? 0.5,
    tempo: track.tempo ?? 120,
    acousticness: track.acousticness ?? 0.5,
    instrumentalness: track.instrumentalness ?? 0.0,
    liveness: track.liveness ?? 0.0,
    speechiness: track.speechiness ?? 0.0,
    loudness: track.loudness ?? -10,
    mode: track.mode ?? 1,
    key: track.key ?? 0,
    time_signature: track.time_signature ?? 4
  })

  // Load tracks
  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setIsLoading(true)
    setLoadingProgress(0)
    setLoadingMessage('Starting...')
    
    // Check if we're running locally (no Spotify credentials)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (isLocal) {
      // For local development, use sample data immediately
      setLoadingProgress(50)
      setLoadingMessage('Loading sample data for local testing...')
      
      setTimeout(() => {
        setLoadingProgress(100)
        setLoadingMessage('Complete!')
        const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
        setTracks(fallbackTracks)
        setError('Using sample data for local development. Deploy to Vercel for real Spotify data!')
        setIsLoading(false)
      }, 1000)
      return
    }
    
    // Set a timeout to fall back to sample data if Spotify takes too long
    const timeoutId = setTimeout(() => {
      setLoadingMessage('Spotify is slow, using sample data...')
      const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
      setTracks(fallbackTracks)
      setError('Using sample data because Spotify is taking too long to respond.')
      setIsLoading(false)
    }, 10000) // 10 second timeout
    
    try {
      setLoadingProgress(10)
      setLoadingMessage('Getting Spotify access token...')
      const tokenData = await getToken()
      
      setLoadingProgress(20)
      setLoadingMessage('Searching for popular tracks...')
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie', 'rock', 'hip-hop'],
        limit: 100
      })

      setLoadingProgress(80)
      setLoadingMessage('Processing track data...')
      const normalizedTracks: Track[] = recommendations.tracks.map(normalizeTrack)

      if (normalizedTracks.length === 0) {
        throw new Error('No tracks returned from Spotify')
      }

      clearTimeout(timeoutId) // Cancel timeout since we got data
      setLoadingProgress(100)
      setLoadingMessage('Complete!')
      setTracks(normalizedTracks)
      setError(null)
    } catch (err) {
      console.error('Error loading tracks:', err)
      clearTimeout(timeoutId) // Cancel timeout
      setLoadingMessage('Using fallback data...')
      const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
      setTracks(fallbackTracks)
      setError('Using sample data because Spotify is unavailable right now.')
    } finally {
      setTimeout(() => setIsLoading(false), 500) // Small delay to show completion
    }
  }

  // Sort tracks when the feature selection changes
  const sortedTracks = useMemo(() => {
    if (!selectedFeature) return tracks
    return [...tracks].sort((a, b) => {
      const aVal = a[selectedFeature] as number
      const bVal = b[selectedFeature] as number
      return aVal - bVal
    })
  }, [tracks, selectedFeature])

  // Handle slider change
  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    if (sortedTracks[value]) {
      setSelectedSong(sortedTracks[value])
    }
  }

  // Find next song when selected song changes
  useEffect(() => {
    if (selectedSong && selectedFeature && sortedTracks.length > 0) {
      const currentIndex = sortedTracks.findIndex(track => track.id === selectedSong.id)
      if (currentIndex >= 0 && currentIndex < sortedTracks.length - 1) {
        setNextSong(sortedTracks[currentIndex + 1])
      } else {
        setNextSong(null)
      }
    } else {
      setNextSong(null)
    }
  }, [selectedSong, selectedFeature, sortedTracks])

  // Clamp slider value when the number of tracks changes
  useEffect(() => {
    if (sortedTracks.length === 0) {
      setSliderValue(0)
      setSelectedSong(null)
      return
    }

    setSliderValue(prev => {
      const maxIndex = sortedTracks.length - 1
      return prev > maxIndex ? maxIndex : prev
    })
  }, [sortedTracks])

  // Keep the selected song aligned with the slider position
  useEffect(() => {
    if (!selectedFeature || sortedTracks.length === 0) {
      setSelectedSong(null)
      return
    }

    const clampedIndex = Math.min(sliderValue, sortedTracks.length - 1)
    setSelectedSong(sortedTracks[clampedIndex])
  }, [selectedFeature, sliderValue, sortedTracks])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem',
        padding: '2rem'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          🎧 {loadingMessage}
        </div>
        
        <div style={{
          width: '300px',
          height: '8px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1rem'
        }}>
          <div style={{
            width: `${loadingProgress}%`,
            height: '100%',
            backgroundColor: '#4ecdc4',
            transition: 'width 0.3s ease',
            borderRadius: '4px'
          }} />
        </div>
        
        <div style={{ fontSize: '1rem', opacity: 0.8 }}>
          {loadingProgress}% complete
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧 Greedy Listening (v6.0)</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
          Pick a song with a slider, then see what the algorithm suggests next
        </p>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Step 1: Choose Feature */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>1. Choose a Feature</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { key: 'danceability', label: '💃 Danceability', color: '#ff6b6b' },
              { key: 'energy', label: '⚡ Energy', color: '#4ecdc4' },
              { key: 'valence', label: '😊 Valence', color: '#45b7d1' },
              { key: 'tempo', label: '🎵 Tempo', color: '#96ceb4' },
              { key: 'acousticness', label: '🎸 Acousticness', color: '#feca57' }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedFeature(metric.key as keyof Track)
                  setSliderValue(0)
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '25px',
                  border: `2px solid ${selectedFeature === metric.key ? metric.color : 'rgba(255,255,255,0.2)'}`,
                  backgroundColor: selectedFeature === metric.key ? metric.color : 'rgba(255,255,255,0.1)',
                  color: selectedFeature === metric.key ? 'white' : 'rgba(255,255,255,0.8)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: selectedFeature === metric.key ? 'bold' : 'normal'
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              2. Slide to Pick a Song by {selectedFeature}
            </h2>
            
            <div style={{
              width: '100%',
              margin: '20px 0'
            }}>
              <input
                type="range"
                min="0"
                max={sortedTracks.length - 1}
                value={Math.min(sliderValue, sortedTracks.length - 1)}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  accentColor: '#667eea'
                }}
              />
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.7 }}>
              {sortedTracks.length} songs available • Position {Math.min(sliderValue, sortedTracks.length - 1) + 1}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {selectedSong && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>🎯 Your Selection</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: nextSong ? '1fr auto 1fr' : '1fr', 
              gap: '2rem',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              {/* Selected Song */}
              <div style={{
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                padding: '25px',
                borderRadius: '15px',
                border: '3px solid #667eea'
              }}>
                <h3 style={{ marginBottom: '1rem', color: '#667eea', fontSize: '1.3rem' }}>Your Song</h3>
                <div style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                  <strong>{selectedSong.name}</strong><br />
                  <em style={{ opacity: 0.8 }}>{selectedSong.artist}</em>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.9rem' }}>
                  <div>💃 {(selectedSong.danceability * 100).toFixed(0)}%</div>
                  <div>⚡ {(selectedSong.energy * 100).toFixed(0)}%</div>
                  <div>😊 {(selectedSong.valence * 100).toFixed(0)}%</div>
                  <div>🎵 {Math.round(selectedSong.tempo)} BPM</div>
                  <div>🎸 {(selectedSong.acousticness * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Arrow */}
              {nextSong && (
                <>
                  <div style={{ fontSize: '2.5rem' }}>→</div>
                  
                  {/* Next Song */}
                  <div style={{
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    padding: '25px',
                    borderRadius: '15px',
                    border: '3px solid #ff6b6b'
                  }}>
                    <h3 style={{ marginBottom: '1rem', color: '#ff6b6b', fontSize: '1.3rem' }}>Next Song</h3>
                    <div style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                      <strong>{nextSong.name}</strong><br />
                      <em style={{ opacity: 0.8 }}>{nextSong.artist}</em>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.9rem' }}>
                      <div>💃 {(nextSong.danceability * 100).toFixed(0)}%</div>
                      <div>⚡ {(nextSong.energy * 100).toFixed(0)}%</div>
                      <div>😊 {(nextSong.valence * 100).toFixed(0)}%</div>
                      <div>🎵 {Math.round(nextSong.tempo)} BPM</div>
                      <div>🎸 {(nextSong.acousticness * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {nextSong && (
              <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>
                The greedy algorithm found the next song with the closest {selectedFeature} value!
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!selectedFeature && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '15px',
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            👆 Choose a feature above to start picking songs with the slider!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: '2rem',
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 107, 107, 0.15)',
            border: '1px solid rgba(255, 107, 107, 0.4)',
            color: '#ff9f9f',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
