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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: '#ffffff',
        fontSize: '1.5rem',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        {/* Subtle background texture */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)',
          zIndex: 0
        }} />
        
        {/* Loading panel */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '4rem 3rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ 
            marginBottom: '3rem', 
            fontSize: '1.5rem',
            fontWeight: '300',
            color: '#ffffff',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            {loadingMessage}
          </div>
          
          <div style={{
            width: '100%',
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '1px',
            overflow: 'hidden',
            marginBottom: '2rem'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #d4af37, #ffd700)',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '1px'
            }} />
          </div>
          
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#888888',
            fontWeight: '400',
            letterSpacing: '0.3px'
          }}>
            {loadingProgress}% complete
          </div>
        </div>
        
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            overflow-x: hidden;
            background: #000000;
          }
          
          html {
            scroll-behavior: smooth;
          }
          
          ::-webkit-scrollbar {
            width: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(212, 175, 55, 0.3);
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(212, 175, 55, 0.5);
          }
          
          /* Responsive Design */
          @media (max-width: 768px) {
            .grid-container {
              grid-template-columns: 1fr !important;
              gap: 1rem !important;
            }
            
            .results-grid {
              grid-template-columns: 1fr !important;
              gap: 2rem !important;
            }
            
            .arrow {
              transform: rotate(90deg) !important;
              margin: 1rem 0 !important;
            }
            
            .card-padding {
              padding: 1.5rem 1rem !important;
            }
            
            .min-height-mobile {
              min-height: 300px !important;
            }
          }
          
          @media (max-width: 480px) {
            .button-grid {
              grid-template-columns: 1fr !important;
              gap: 0.75rem !important;
            }
            
            .button-padding {
              padding: 1.25rem 1rem !important;
              min-height: 100px !important;
            }
            
            .metrics-grid {
              grid-template-columns: repeat(3, minmax(70px, 1fr)) !important;
              gap: 0.75rem !important;
              padding: 1.25rem !important;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: '#ffffff',
      minHeight: '100vh',
      padding: '4rem 2rem',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle editorial background texture */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(255, 215, 0, 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.01) 0%, transparent 50%)',
        zIndex: 0
      }} />

      <header style={{ 
        textAlign: 'center', 
        marginBottom: '6rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '4rem 3rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '400',
            color: '#d4af37',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '1rem'
          }}>
            Algorithmic Curation
          </div>
          <h1 style={{ 
            fontSize: '4rem', 
            marginBottom: '1.5rem',
            color: '#ffffff',
            fontWeight: '300',
            letterSpacing: '-0.02em',
            lineHeight: '1.1'
          }}>
            The Algorithmic Ear
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#888888',
            fontWeight: '300',
            lineHeight: '1.6',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Discover the next song through algorithmic precision. Select a musical dimension and explore curated recommendations.
          </p>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Step 1: Choose Feature */}
        <div style={{ 
          marginBottom: '4rem',
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '3rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem'
          }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '400',
              color: '#d4af37',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '0.5rem'
            }}>
              Step One
            </div>
            <h2 style={{ 
              fontSize: '2rem',
              fontWeight: '300',
              color: '#ffffff',
              letterSpacing: '-0.01em',
              margin: 0
            }}>
              Select Musical Dimension
            </h2>
          </div>
          
          <div className="button-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '1.25rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {[
              { key: 'danceability', label: 'Danceability', description: 'Rhythmic quality' },
              { key: 'energy', label: 'Energy', description: 'Intensity level' },
              { key: 'valence', label: 'Valence', description: 'Emotional positivity' },
              { key: 'tempo', label: 'Tempo', description: 'Beats per minute' },
              { key: 'acousticness', label: 'Acousticness', description: 'Instrumental purity' }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedFeature(metric.key as keyof Track)
                  setSliderValue(0)
                }}
                className="button-padding"
                style={{
                  padding: '1.75rem 1.25rem',
                  borderRadius: '16px',
                  border: selectedFeature === metric.key 
                    ? '1px solid #d4af37' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedFeature === metric.key 
                    ? 'rgba(212, 175, 55, 0.1)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: selectedFeature === metric.key ? '#d4af37' : '#ffffff',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: '400',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minHeight: '140px',
                  justifyContent: 'center',
                  width: '100%',
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
                  fontSize: '1rem',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                  lineHeight: '1.2',
                  wordWrap: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  opacity: 0.6,
                  fontWeight: '300',
                  lineHeight: '1.3',
                  wordWrap: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}>
                  {metric.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <div style={{ 
            marginBottom: '4rem',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '3rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '3rem'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '400',
                color: '#d4af37',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                Step Two
              </div>
              <h2 style={{ 
                fontSize: '2rem',
                fontWeight: '300',
                color: '#ffffff',
                letterSpacing: '-0.01em',
                margin: 0
              }}>
                Navigate by {selectedFeature}
              </h2>
            </div>
            
            <div style={{
              width: '100%',
              margin: '3rem 0',
              position: 'relative'
            }}>
              <input
                type="range"
                min="0"
                max={sortedTracks.length - 1}
                value={Math.min(sliderValue, sortedTracks.length - 1)}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '2px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '1px',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #d4af37;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                  border: 2px solid rgba(255, 255, 255, 0.1);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: #d4af37;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                  border: 2px solid rgba(255, 255, 255, 0.1);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-moz-range-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
                }
              `}</style>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              fontSize: '0.875rem', 
              color: '#888888',
              fontWeight: '300',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '1rem 2rem',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'inline-block',
              letterSpacing: '0.5px'
            }}>
              {sortedTracks.length} tracks available • Position {Math.min(sliderValue, sortedTracks.length - 1) + 1}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {selectedSong && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '4rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '4rem'
            }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '400',
                color: '#d4af37',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '0.5rem'
              }}>
                Step Three
              </div>
              <h2 style={{ 
                fontSize: '2rem',
                fontWeight: '300',
                color: '#ffffff',
                letterSpacing: '-0.01em',
                margin: 0
              }}>
                Algorithmic Recommendation
              </h2>
            </div>
            
            <div className="results-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: nextSong ? '1fr auto 1fr' : '1fr', 
              gap: '3rem',
              alignItems: 'stretch',
              marginBottom: '3rem',
              maxWidth: '1000px',
              margin: '0 auto 3rem auto'
            }}>
              {/* Selected Song */}
              <div className="card-padding min-height-mobile" style={{
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                padding: '2.5rem 1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  borderRadius: '16px',
                  zIndex: 0
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    color: '#d4af37',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    marginBottom: '1rem'
                  }}>
                    Current Selection
                  </div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    marginBottom: '0.5rem', 
                    lineHeight: '1.3', 
                    fontWeight: '400',
                    wordWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxHeight: '3.9rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {selectedSong.name}
                  </div>
                  <div style={{ 
                    opacity: 0.6, 
                    fontSize: '0.9rem', 
                    fontWeight: '300',
                    marginBottom: '2rem',
                    color: '#888888',
                    wordWrap: 'break-word',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxHeight: '2.7rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {selectedSong.artist}
                  </div>
                  <div className="metrics-grid" style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, minmax(80px, 1fr))', 
                    gap: '1rem', 
                    fontSize: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    minWidth: '100%'
                  }}>
                    <div style={{ 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '60px',
                      padding: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888888', 
                        marginBottom: '0.5rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        lineHeight: '1.2',
                        fontWeight: '400'
                      }}>Dance</div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '0.9rem',
                        color: '#ffffff'
                      }}>{(selectedSong.danceability * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '60px',
                      padding: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888888', 
                        marginBottom: '0.5rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        lineHeight: '1.2',
                        fontWeight: '400'
                      }}>Energy</div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '0.9rem',
                        color: '#ffffff'
                      }}>{(selectedSong.energy * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '60px',
                      padding: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888888', 
                        marginBottom: '0.5rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        lineHeight: '1.2',
                        fontWeight: '400'
                      }}>Valence</div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '0.9rem',
                        color: '#ffffff'
                      }}>{(selectedSong.valence * 100).toFixed(0)}%</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '60px',
                      padding: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888888', 
                        marginBottom: '0.5rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        lineHeight: '1.2',
                        fontWeight: '400'
                      }}>Tempo</div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '0.9rem',
                        color: '#ffffff'
                      }}>{Math.round(selectedSong.tempo)}</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '60px',
                      padding: '0.5rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#888888', 
                        marginBottom: '0.5rem', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        lineHeight: '1.2',
                        fontWeight: '400',
                        wordWrap: 'break-word',
                        textAlign: 'center'
                      }}>Acoustic</div>
                      <div style={{ 
                        fontWeight: '500', 
                        fontSize: '0.9rem',
                        color: '#ffffff'
                      }}>{(selectedSong.acousticness * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              {nextSong && (
                <>
                  <div className="arrow" style={{ 
                    fontSize: '2rem',
                    color: '#d4af37',
                    fontWeight: '300',
                    opacity: 0.6
                  }}>
                    →
                  </div>
                  
                  {/* Next Song */}
                  <div className="card-padding min-height-mobile" style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(15px)',
                    WebkitBackdropFilter: 'blur(15px)',
                    padding: '2.5rem 1.5rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(212, 175, 55, 0.03) 100%)',
                      borderRadius: '16px',
                      zIndex: 0
                    }} />
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '400',
                        color: '#d4af37',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        marginBottom: '1rem'
                      }}>
                        Algorithmic Next
                      </div>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        marginBottom: '0.5rem', 
                        lineHeight: '1.3', 
                        fontWeight: '400',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '3.9rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {nextSong.name}
                      </div>
                      <div style={{ 
                        opacity: 0.6, 
                        fontSize: '0.9rem', 
                        fontWeight: '300',
                        marginBottom: '2rem',
                        color: '#888888',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxHeight: '2.7rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {nextSong.artist}
                      </div>
                      <div className="metrics-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(5, minmax(80px, 1fr))', 
                        gap: '1rem', 
                        fontSize: '0.875rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        minWidth: '100%'
                      }}>
                        <div style={{ 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '60px',
                          padding: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888', 
                            marginBottom: '0.5rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            fontWeight: '400'
                          }}>Dance</div>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>{(nextSong.danceability * 100).toFixed(0)}%</div>
                        </div>
                        <div style={{ 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '60px',
                          padding: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888', 
                            marginBottom: '0.5rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            fontWeight: '400'
                          }}>Energy</div>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>{(nextSong.energy * 100).toFixed(0)}%</div>
                        </div>
                        <div style={{ 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '60px',
                          padding: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888', 
                            marginBottom: '0.5rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            fontWeight: '400'
                          }}>Valence</div>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>{(nextSong.valence * 100).toFixed(0)}%</div>
                        </div>
                        <div style={{ 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '60px',
                          padding: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888', 
                            marginBottom: '0.5rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            fontWeight: '400'
                          }}>Tempo</div>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>{Math.round(nextSong.tempo)}</div>
                        </div>
                        <div style={{ 
                          textAlign: 'center', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'center',
                          alignItems: 'center',
                          minHeight: '60px',
                          padding: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#888888', 
                            marginBottom: '0.5rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            lineHeight: '1.2',
                            fontWeight: '400',
                            wordWrap: 'break-word',
                            textAlign: 'center'
                          }}>Acoustic</div>
                          <div style={{ 
                            fontWeight: '500', 
                            fontSize: '0.9rem',
                            color: '#ffffff'
                          }}>{(nextSong.acousticness * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {nextSong && (
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#888888',
                fontWeight: '300',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '1.5rem 2rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'inline-block',
                letterSpacing: '0.3px',
                lineHeight: '1.5'
              }}>
                Algorithmic precision found the next track with the closest {selectedFeature} value
              </div>
            )}
          </div>
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
