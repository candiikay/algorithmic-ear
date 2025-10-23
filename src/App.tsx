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

  const renderFeatureStats = (track: Track) => (
    <div className="metrics-container">
      <div className="metrics-grid">
        {FEATURE_STATS.map((stat) => {
          const value = track[stat.key] as number
          return (
            <div key={stat.key} className="metric-item">
              <div className="metric-label">{stat.label}</div>
              <div className="metric-value">{stat.format(value)}</div>
            </div>
          )
        })}
      </div>
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
               grid-template-columns: 1fr !important;
               gap: 12px !important;
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
      <style>{`
        .metrics-container {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.25);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .metric-item:last-child {
          border-bottom: none;
        }

        .metric-item:hover {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          padding: 12px 8px;
        }

        .metric-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.5px;
          color: #888888;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (max-width: 640px) {
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .metrics-container {
            padding: 20px;
          }
        }

        .dimension-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 48px;
        }

        .dimension-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          justify-items: center;
          align-items: center;
        }

        .dimension-card {
          width: 240px;
          height: 120px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          transition: all 0.3s ease;
        }

        .dimension-card:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .dimension-card.selected {
          border: 1px solid #C1A75E;
          background: rgba(193,167,94,0.1);
          box-shadow: 0 0 12px rgba(193,167,94,0.3);
        }

        @media (max-width: 1024px) {
          .dimension-section {
            padding: 48px 60px;
            gap: 40px;
          }
          
          .dimension-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }

        @media (max-width: 640px) {
          .dimension-section {
            padding: 32px 24px;
            gap: 32px;
          }
          
          .dimension-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .dimension-card {
            width: 100%;
            height: 100px;
          }
        }

        .slider-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 48px;
        }

        .slider-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 0;
          width: 100%;
          position: relative;
        }

        .slider-track {
          position: relative;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%);
          border-radius: 4px;
          overflow: hidden;
        }

        .slider-fill {
          position: absolute;
          height: 100%;
          left: 0;
          top: 0;
          border-radius: 4px;
          background: linear-gradient(90deg, #c1a75e, #f8e39e);
          box-shadow: 0 0 20px rgba(193, 167, 94, 0.3);
          transition: width 0.3s ease;
        }

        .slider-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #f3d177 0%, #c1a75e 70%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(193, 167, 94, 0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .slider-handle:hover {
          transform: translate(-50%, -50%) scale(1.2);
          box-shadow: 0 0 28px rgba(193, 167, 94, 0.6);
        }

        .slider-label {
          margin-top: 24px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          transition: all 0.3s ease;
          text-align: center;
        }

        @media (max-width: 1024px) {
          .slider-section {
            padding: 48px 60px;
            gap: 40px;
          }
        }

        @media (max-width: 640px) {
          .slider-section {
            padding: 32px 24px;
            gap: 32px;
          }
          
          .slider-container {
            padding: 32px 0;
          }
        }
      `}</style>

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
        <div className="dimension-section" style={{ 
          marginBottom: '4rem',
          background: 'linear-gradient(180deg, #0E0E10 0%, #161618 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '64px 80px',
          maxWidth: '960px',
          margin: '0 auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '48px'
        }}>
          <div style={{
            textAlign: 'center'
          }}>
            <div className="step-label" style={{
              fontSize: '12px',
              fontWeight: '500',
              color: '#C1A75E',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Step One
            </div>
            <h2 className="section-title" style={{ 
              fontSize: '28px',
              fontWeight: '600',
              color: '#ffffff',
              lineHeight: '1.3',
              margin: 0
            }}>
              Select Musical Dimension
            </h2>
          </div>
          
          <div className="dimension-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gridTemplateRows: 'repeat(2, auto)',
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
                className="dimension-card"
                style={{
                  width: '240px',
                  height: '120px',
                  borderRadius: '16px',
                  border: selectedFeature === metric.key 
                    ? '1px solid #C1A75E' 
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  background: selectedFeature === metric.key 
                    ? 'rgba(193, 167, 94, 0.1)' 
                    : 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: selectedFeature === metric.key ? '#C1A75E' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box',
                  boxShadow: selectedFeature === metric.key 
                    ? '0 0 12px rgba(193, 167, 94, 0.3)' 
                    : '0 0 20px rgba(0, 0, 0, 0.15)'
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
                  color: selectedFeature === metric.key ? '#C1A75E' : '#ffffff',
                  lineHeight: '1.2',
                  marginBottom: '4px'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  opacity: 0.6,
                  fontWeight: '400',
                  lineHeight: '1.3',
                  color: selectedFeature === metric.key ? 'rgba(193, 167, 94, 0.8)' : 'rgba(255, 255, 255, 0.6)'
                }}>
                  {metric.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <div className="slider-section" style={{ 
            marginBottom: '4rem',
            background: 'linear-gradient(180deg, #0E0E10 0%, #161618 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '64px 80px',
            maxWidth: '960px',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '48px'
          }}>
            <div style={{
              textAlign: 'center'
            }}>
              <div className="step-label" style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#C1A75E',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}>
                Step Two
              </div>
              <h2 className="section-title" style={{ 
                fontSize: '28px',
                fontWeight: '600',
                color: '#ffffff',
                lineHeight: '1.3',
                margin: 0
              }}>
                Navigate by {selectedFeature}
              </h2>
            </div>
            
            <div className="slider-container" style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 0',
              width: '100%',
              maxWidth: '600px',
              position: 'relative'
            }}>
              <div className="slider-track" style={{
                position: 'relative',
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '24px'
              }}>
                <div 
                  className="slider-fill"
                  style={{
                    position: 'absolute',
                    height: '100%',
                    left: 0,
                    top: 0,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #c1a75e, #f8e39e)',
                    boxShadow: '0 0 20px rgba(193, 167, 94, 0.3)',
                    width: `${(Math.min(sliderValue, sortedTracks.length - 1) / (sortedTracks.length - 1)) * 100}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
                <div 
                  className="slider-handle"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${(Math.min(sliderValue, sortedTracks.length - 1) / (sortedTracks.length - 1)) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '20px',
                    height: '20px',
                    background: 'radial-gradient(circle, #f3d177 0%, #c1a75e 70%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '50%',
                    boxShadow: '0 0 20px rgba(193, 167, 94, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)'
                    e.currentTarget.style.boxShadow = '0 0 28px rgba(193, 167, 94, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(193, 167, 94, 0.4)'
                  }}
                />
              </div>
              
              <input
                type="range"
                min="0"
                max={sortedTracks.length - 1}
                value={Math.min(sliderValue, sortedTracks.length - 1)}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '20px',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              
              <div className="slider-label" style={{
                marginTop: '24px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                textAlign: 'center'
              }}>
                {sortedTracks.length} tracks available • Position {Math.min(sliderValue, sortedTracks.length - 1) + 1}
              </div>
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
                  {renderFeatureStats(selectedSong)}
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
                      {renderFeatureStats(nextSong)}
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
