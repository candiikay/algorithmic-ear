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

  const FEATURE_STATS: Array<{
    key: keyof Pick<Track, 'danceability' | 'energy' | 'valence' | 'tempo' | 'acousticness' | 'liveness'>
    label: string
    description: string
    format: (value: number) => string
  }> = [
    { key: 'danceability', label: 'Danceability', description: 'How rhythmically engaging the track feels', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'energy', label: 'Energy', description: 'Overall intensity and drive', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'valence', label: 'Valence', description: 'Emotional brightness of the song', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'tempo', label: 'Tempo', description: 'Beats per minute', format: (value) => `${Math.round(value)} BPM` },
    { key: 'acousticness', label: 'Acousticness', description: 'Organic vs. electronic instrumentation', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'liveness', label: 'Liveness', description: 'Presence of a live performance feel', format: (value) => `${(value * 100).toFixed(0)}%` }
  ]

  const normalizeTrack = (track: any): Track => ({
    id: track.id,
    name: track.name,
    artist: track.artist || (Array.isArray(track.artists) ? track.artists[0]?.name : track.artists) || 'Unknown Artist',
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

  // Load tracks on component mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        setIsLoading(true)
        setLoadingMessage('Initializing...')
        setLoadingProgress(10)

        // Check if we're in local development
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        
        if (isLocal) {
          // Use fallback data immediately for local development
          setLoadingMessage('Using sample data for local development...')
          setLoadingProgress(50)
          const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
          setTracks(fallbackTracks)
          setError('Using sample data for local development. Deploy to Vercel for real Spotify data!')
          setIsLoading(false)
          return
        }
        
        // Set a timeout to fall back to sample data if Spotify takes too long
        const timeoutId = setTimeout(() => {
          setLoadingMessage('Spotify is slow, using sample data...')
          const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
          setTracks(fallbackTracks)
          setError('Using sample data because Spotify is unavailable right now.')
          setIsLoading(false)
        }, 10000) // 10 second timeout

        setLoadingMessage('Connecting to Spotify...')
        setLoadingProgress(20)
        
        const token = await getToken()
        setLoadingMessage('Fetching recommendations...')
        setLoadingProgress(40)
        
        const recommendations = await getRecommendations(token.access_token)
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
        setLoadingMessage('Loading sample data...')
        const fallbackTracks: Track[] = FALLBACK_TRACKS.map(track => normalizeTrack(track))
        setTracks(fallbackTracks)
        setError('Using sample data because Spotify is unavailable right now.')
      } finally {
        setTimeout(() => setIsLoading(false), 500) // Small delay to show completion
      }
    }

    loadTracks()
  }, [])

  // Sort tracks when the feature selection changes
  const sortedTracks = useMemo(() => {
    if (!selectedFeature) return tracks
    return [...tracks].sort((a, b) => {
      const aValue = a[selectedFeature] as number
      const bValue = b[selectedFeature] as number
      return Math.abs(aValue - sliderValue) - Math.abs(bValue - sliderValue)
    })
  }, [tracks, selectedFeature, sliderValue])

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
  }, [sortedTracks.length])

  // Keep the selected song aligned with the slider position
  useEffect(() => {
    if (!selectedFeature || sortedTracks.length === 0) {
      setSelectedSong(null)
      return
    }

    const clampedIndex = Math.min(sliderValue, sortedTracks.length - 1)
    setSelectedSong(sortedTracks[clampedIndex])
  }, [selectedFeature, sliderValue, sortedTracks])

  const renderFeatureStats = (track: Track) => (
    <div className="metric">
      {FEATURE_STATS.map((stat) => {
        const value = track[stat.key] as number
        return (
          <React.Fragment key={stat.key}>
            <div>{stat.label}</div>
            <div>{stat.format(value)}</div>
          </React.Fragment>
        )
      })}
    </div>
  )

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: '#ffffff',
        fontSize: '1.5rem',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)',
          zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#E0CDA9'
          }}>
            The Algorithmic Ear
          </div>
          <div style={{
            fontSize: '1rem',
            marginBottom: '2rem',
            color: '#B8B8B8'
          }}>
            {loadingMessage}
          </div>
          <div style={{
            width: '300px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #E0CDA9, #F8E39E)',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#888888'
          }}>
            {loadingProgress}%
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden',
      width: '100vw',
      maxWidth: '100vw'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <header style={{ 
          textAlign: 'center', 
          padding: '160px 0 100px',
          background: 'radial-gradient(circle at top, rgba(255,255,255,0.02) 0%, transparent 70%)',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '500',
            color: '#E0CDA9',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            fontFamily: 'Fira Code, monospace',
            marginBottom: '24px'
          }}>
            Algorithmic Curation
          </div>
          <h1 style={{ 
            fontSize: '52px',
            fontWeight: '500',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            margin: '0 0 32px 0',
            lineHeight: '1.1'
          }}>
            The Algorithmic Ear
          </h1>
          <p style={{ 
            fontSize: '18px',
            color: '#B8B8B8',
            fontWeight: '400',
            lineHeight: '1.6',
            maxWidth: '640px',
            margin: '0 auto',
            letterSpacing: '-0.01em'
          }}>
            Discover the next song through algorithmic precision. Select a musical dimension and explore curated recommendations.
          </p>
        </header>

        {/* Step 1: Feature Selection */}
        <section style={{ 
          padding: '96px 0',
          textAlign: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '48px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '500',
              color: '#E0CDA9',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'Fira Code, monospace',
              marginBottom: '12px'
            }}>
              Step One
            </div>
            <h2 style={{ 
              fontSize: '32px',
              fontWeight: '500',
              color: '#FFFFFF',
              lineHeight: '1.3',
              margin: 0
            }}>
              Select Musical Dimension
            </h2>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '24px',
            justifyItems: 'center',
            alignItems: 'center'
          }}>
            {[
              { key: 'danceability', label: 'Danceability', description: 'Rhythmic quality' },
              { key: 'energy', label: 'Energy', description: 'Intensity level' },
              { key: 'valence', label: 'Valence', description: 'Emotional positivity' },
              { key: 'tempo', label: 'Tempo', description: 'Beats per minute' },
              { key: 'acousticness', label: 'Acousticness', description: 'Instrumental purity' },
              { key: 'liveness', label: 'Liveness', description: 'Live performance energy' }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedFeature(metric.key as keyof Track)
                  setSliderValue(0)
                }}
                style={{
                  width: '240px',
                  height: '120px',
                  borderRadius: '12px',
                  border: selectedFeature === metric.key 
                    ? '1px solid #E0CDA9' 
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  background: selectedFeature === metric.key 
                    ? 'rgba(224, 205, 169, 0.08)' 
                    : 'rgba(255, 255, 255, 0.01)',
                  color: selectedFeature === metric.key ? '#E0CDA9' : '#EAEAEA',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: selectedFeature === metric.key ? '#E0CDA9' : '#EAEAEA',
                  lineHeight: '1.2',
                  marginBottom: '4px'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '400',
                  lineHeight: '1.3',
                  color: selectedFeature === metric.key ? 'rgba(224, 205, 169, 0.7)' : '#B8B8B8'
                }}>
                  {metric.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <section style={{ 
            padding: '96px 0',
            textAlign: 'center'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '48px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '500',
                color: '#E0CDA9',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: 'Fira Code, monospace',
                marginBottom: '12px'
              }}>
                Step Two
              </div>
              <h2 style={{ 
                fontSize: '32px',
                fontWeight: '500',
                color: '#FFFFFF',
                lineHeight: '1.3',
                margin: 0
              }}>
                Navigate by {selectedFeature}
              </h2>
            </div>
            
            <div style={{
              padding: '48px 0',
              maxWidth: '640px',
              margin: '0 auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '24px',
                fontFamily: 'Fira Code, monospace',
                fontSize: '14px',
                color: '#B8B8B8'
              }}>
                <span>{selectedFeature}:</span>
                <span style={{ color: '#E0CDA9' }}>
                  {selectedSong ? (selectedSong[selectedFeature] as number).toFixed(2) : '0.00'}
                </span>
              </div>
              
              <input
                type="range"
                min="0"
                max={sortedTracks.length - 1}
                step="1"
                value={sliderValue}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              
              <div style={{
                marginTop: '24px',
                color: '#B8B8B8',
                fontSize: '13px',
                fontFamily: 'Fira Code, monospace'
              }}>
                {sortedTracks.length} tracks available
              </div>
              
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: 'rgba(184, 184, 184, 0.6)',
                fontFamily: 'Fira Code, monospace'
              }}>
                ⬅️ Drag to adjust {selectedFeature} ➡️
              </div>
            </div>
          </section>
        )}

        {/* Step 3: Results */}
        {selectedSong && (
          <section style={{ 
            padding: '96px 0',
            background: 'radial-gradient(circle at center, rgba(224, 205, 169, 0.02) 0%, transparent 70%)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '48px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '500',
                color: '#E0CDA9',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: 'Fira Code, monospace',
                marginBottom: '12px'
              }}>
                Step Three
              </div>
              <h2 style={{ 
                fontSize: '32px',
                fontWeight: '500',
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
                margin: 0
              }}>
                Algorithmic Recommendation
              </h2>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              {/* Selected Song */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '12px',
                padding: '24px',
                width: '280px',
                minHeight: '360px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#E0CDA9',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontFamily: 'Fira Code, monospace',
                    marginBottom: '16px'
                  }}>
                    Current Selection
                  </div>
                  <h3 style={{
                    fontSize: '1.2rem',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#FFFFFF'
                  }}>
                    {selectedSong.name}
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    opacity: 0.8,
                    color: '#B8B8B8',
                    marginBottom: '1.5rem'
                  }}>
                    {selectedSong.artist}
                  </p>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridAutoRows: 'minmax(20px, auto)',
                  rowGap: '0.5rem',
                  columnGap: '1rem',
                  marginTop: '1.5rem',
                  textTransform: 'uppercase',
                  fontSize: '0.8rem',
                  lineHeight: '1.4'
                }}>
                  {renderFeatureStats(selectedSong)}
                </div>
              </div>

              {/* Next Song */}
              {nextSong && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '12px',
                  padding: '24px',
                  width: '280px',
                  minHeight: '360px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      color: '#E0CDA9',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      fontFamily: 'Fira Code, monospace',
                      marginBottom: '16px'
                    }}>
                      Algorithmic Next
                    </div>
                    <h3 style={{
                      fontSize: '1.2rem',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: '#FFFFFF'
                    }}>
                      {nextSong.name}
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      opacity: 0.8,
                      color: '#B8B8B8',
                      marginBottom: '1.5rem'
                    }}>
                      {nextSong.artist}
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridAutoRows: 'minmax(20px, auto)',
                    rowGap: '0.5rem',
                    columnGap: '1rem',
                    marginTop: '1.5rem',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                  }}>
                    {renderFeatureStats(nextSong)}
                  </div>
                </div>
              )}
            </div>

            {nextSong && (
              <div style={{
                textAlign: 'center',
                marginTop: '48px'
              }}>
                <div style={{
                  height: '1px',
                  background: 'rgba(224, 205, 169, 0.3)',
                  margin: '0 auto 16px',
                  maxWidth: '200px'
                }} />
                <div style={{
                  fontSize: '14px',
                  color: '#B8B8B8',
                  fontStyle: 'italic',
                  fontFamily: 'Fira Code, monospace'
                }}>
                  The algorithm listened closely — here's what it heard.
                </div>
              </div>
            )}
          </section>
        )}

        {/* Instructions */}
        {!selectedFeature && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 3rem',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '300',
              color: '#ffffff',
              marginBottom: '1rem',
              letterSpacing: '0.3px'
            }}>
              Select a musical dimension to begin algorithmic curation
            </div>
            <div style={{ 
              opacity: 0.6, 
              fontSize: '0.875rem',
              fontWeight: '300',
              color: '#888888',
              letterSpacing: '0.5px'
            }}>
              Choose from the available parameters above to explore curated recommendations
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#888888',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
            fontSize: '0.875rem',
            fontWeight: '300'
          }}>
            <div style={{
              color: '#d4af37',
              fontSize: '1rem',
              fontWeight: '400',
              marginBottom: '0.5rem',
              letterSpacing: '0.5px'
            }}>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
