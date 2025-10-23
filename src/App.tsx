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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        color: 'white',
        fontSize: '1.5rem',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite'
        }} />
        
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse'
        }} />
        
        {/* Glass loading panel */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ 
            marginBottom: '2rem', 
            fontSize: '1.8rem',
            fontWeight: '600',
            background: 'linear-gradient(45deg, #fff, #f0f0f0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🎧 {loadingMessage}
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: `${loadingProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4ecdc4, #44a08d)',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(78, 205, 196, 0.3)'
            }} />
          </div>
          
          <div style={{ 
            fontSize: '1rem', 
            opacity: 0.8,
            fontWeight: '500'
          }}>
            {loadingProgress}% complete
          </div>
        </div>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow-x: hidden;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Custom scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #764ba2, #f093fb);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      color: 'white',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        animation: 'float 20s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 25s ease-in-out infinite reverse'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-20%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float 15s ease-in-out infinite'
      }} />

      <header style={{ 
        textAlign: 'center', 
        marginBottom: '3rem',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '32px',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            marginBottom: '1rem',
            background: 'linear-gradient(45deg, #fff, #f0f0f0, #e0e0e0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: '700',
            letterSpacing: '-0.02em'
          }}>
            🎧 Greedy Listening
          </h1>
          <p style={{ 
            fontSize: '1.3rem', 
            opacity: 0.9,
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            Pick a song with a slider, then see what the algorithm suggests next
          </p>
        </div>
      </header>

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Step 1: Choose Feature */}
        <div style={{ 
          marginBottom: '3rem',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            marginBottom: '1.5rem', 
            fontSize: '1.8rem',
            fontWeight: '600',
            background: 'linear-gradient(45deg, #fff, #f0f0f0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            1. Choose a Feature
          </h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { key: 'danceability', label: '💃 Danceability', color: '#ff6b6b', gradient: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)' },
              { key: 'energy', label: '⚡ Energy', color: '#4ecdc4', gradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)' },
              { key: 'valence', label: '😊 Valence', color: '#45b7d1', gradient: 'linear-gradient(135deg, #45b7d1, #96c93d)' },
              { key: 'tempo', label: '🎵 Tempo', color: '#96ceb4', gradient: 'linear-gradient(135deg, #96ceb4, #feca57)' },
              { key: 'acousticness', label: '🎸 Acousticness', color: '#feca57', gradient: 'linear-gradient(135deg, #feca57, #ff9ff3)' }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedFeature(metric.key as keyof Track)
                  setSliderValue(0)
                }}
                style={{
                  padding: '16px 24px',
                  borderRadius: '20px',
                  border: selectedFeature === metric.key ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.1)',
                  background: selectedFeature === metric.key 
                    ? metric.gradient 
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: selectedFeature === metric.key ? 'white' : 'rgba(255,255,255,0.9)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: selectedFeature === metric.key ? '600' : '400',
                  boxShadow: selectedFeature === metric.key 
                    ? '0 8px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)' 
                    : '0 4px 15px rgba(0,0,0,0.1)',
                  transform: selectedFeature === metric.key ? 'translateY(-2px)' : 'translateY(0)',
                  minWidth: '140px',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
                  }
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <div style={{ 
            marginBottom: '3rem',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '1.5rem', 
              fontSize: '1.8rem',
              fontWeight: '600',
              background: 'linear-gradient(45deg, #fff, #f0f0f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              2. Slide to Pick a Song by {selectedFeature}
            </h2>
            
            <div style={{
              width: '100%',
              margin: '30px 0',
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
                  height: '8px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                  border: 2px solid rgba(255, 255, 255, 0.3);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #667eea, #764ba2);
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                  border: 2px solid rgba(255, 255, 255, 0.3);
                  transition: all 0.2s ease;
                }
                input[type="range"]::-moz-range-thumb:hover {
                  transform: scale(1.1);
                  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.6);
                }
              `}</style>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              fontSize: '1rem', 
              opacity: 0.8,
              fontWeight: '500',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '12px 20px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {sortedTracks.length} songs available • Position {Math.min(sliderValue, sortedTracks.length - 1) + 1}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {selectedSong && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '32px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderRadius: '32px',
              zIndex: 0
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ 
                marginBottom: '2.5rem', 
                fontSize: '2.2rem',
                fontWeight: '700',
                background: 'linear-gradient(45deg, #fff, #f0f0f0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🎯 Your Selection
              </h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: nextSong ? '1fr auto 1fr' : '1fr', 
                gap: '3rem',
                alignItems: 'center',
                marginBottom: '2.5rem'
              }}>
                {/* Selected Song */}
                <div style={{
                  background: 'rgba(102, 126, 234, 0.15)',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  padding: '2rem',
                  borderRadius: '24px',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: '24px',
                    zIndex: 0
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <h3 style={{ 
                      marginBottom: '1.5rem', 
                      color: '#667eea', 
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      Your Song
                    </h3>
                    <div style={{ fontSize: '1.4rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{selectedSong.name}</div>
                      <div style={{ opacity: 0.8, fontSize: '1.1rem' }}>{selectedSong.artist}</div>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(5, 1fr)', 
                      gap: '12px', 
                      fontSize: '0.95rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '1rem',
                      borderRadius: '16px',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}>
                      <div style={{ textAlign: 'center' }}>💃<br />{(selectedSong.danceability * 100).toFixed(0)}%</div>
                      <div style={{ textAlign: 'center' }}>⚡<br />{(selectedSong.energy * 100).toFixed(0)}%</div>
                      <div style={{ textAlign: 'center' }}>😊<br />{(selectedSong.valence * 100).toFixed(0)}%</div>
                      <div style={{ textAlign: 'center' }}>🎵<br />{Math.round(selectedSong.tempo)} BPM</div>
                      <div style={{ textAlign: 'center' }}>🎸<br />{(selectedSong.acousticness * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                {nextSong && (
                  <>
                    <div style={{ 
                      fontSize: '3rem',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontWeight: 'bold',
                      filter: 'drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3))'
                    }}>
                      →
                    </div>
                    
                    {/* Next Song */}
                    <div style={{
                      background: 'rgba(255, 107, 107, 0.15)',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      padding: '2rem',
                      borderRadius: '24px',
                      border: '2px solid rgba(255, 107, 107, 0.3)',
                      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.2)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 142, 142, 0.1) 100%)',
                        borderRadius: '24px',
                        zIndex: 0
                      }} />
                      
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ 
                          marginBottom: '1.5rem', 
                          color: '#ff6b6b', 
                          fontSize: '1.5rem',
                          fontWeight: '600',
                          background: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}>
                          Next Song
                        </h3>
                        <div style={{ fontSize: '1.4rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{nextSong.name}</div>
                          <div style={{ opacity: 0.8, fontSize: '1.1rem' }}>{nextSong.artist}</div>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(5, 1fr)', 
                          gap: '12px', 
                          fontSize: '0.95rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1rem',
                          borderRadius: '16px',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)'
                        }}>
                          <div style={{ textAlign: 'center' }}>💃<br />{(nextSong.danceability * 100).toFixed(0)}%</div>
                          <div style={{ textAlign: 'center' }}>⚡<br />{(nextSong.energy * 100).toFixed(0)}%</div>
                          <div style={{ textAlign: 'center' }}>😊<br />{(nextSong.valence * 100).toFixed(0)}%</div>
                          <div style={{ textAlign: 'center' }}>🎵<br />{Math.round(nextSong.tempo)} BPM</div>
                          <div style={{ textAlign: 'center' }}>🎸<br />{(nextSong.acousticness * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {nextSong && (
                <div style={{ 
                  fontSize: '1.2rem', 
                  opacity: 0.9,
                  fontWeight: '500',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '1rem 2rem',
                  borderRadius: '20px',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'inline-block'
                }}>
                  The greedy algorithm found the next song with the closest {selectedFeature} value!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedFeature && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '24px',
            fontSize: '1.3rem',
            fontWeight: '500',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              background: 'linear-gradient(45deg, #fff, #f0f0f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}>
              👆 Choose a feature above to start picking songs with the slider!
            </div>
            <div style={{ opacity: 0.8, fontSize: '1.1rem' }}>
              Select any musical feature to explore the algorithm's recommendations
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            borderRadius: '20px',
            background: 'rgba(255, 107, 107, 0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 107, 107, 0.3)',
            color: '#ff9f9f',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(255, 107, 107, 0.2)',
            fontSize: '1.1rem',
            fontWeight: '500'
          }}>
            <div style={{
              background: 'linear-gradient(45deg, #ff6b6b, #ff8e8e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '1.3rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              ⚠️ {error}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
