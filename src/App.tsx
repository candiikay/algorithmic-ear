import React, { useState, useEffect, useMemo } from 'react'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import type { Track } from './types'
import InfoPop from './components/InfoPop'
import CustomDropdown from './components/CustomDropdown'
import { INFO_CONTENT, FEATURE_DETAILS } from './data/infoContent'

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
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy')

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

  const ALGORITHMS = [
    { 
      id: 'greedy', 
      name: 'Greedy Algorithm', 
      description: 'A greedy algorithm always makes the locally optimal choice at each step. In music recommendation, it picks the song most similar to your current selection based on a single feature. This approach is simple and fast, but often leads to repetitive playlists because it never considers long-term variety or context.',
      pros: ['Simple and precise', 'Fast and explainable', 'Good for similarity search'],
      cons: ['Reduces diversity', 'Creates echo chambers', 'Poor for discovery']
    },
    { 
      id: 'sorting', 
      name: 'Sorting Algorithm', 
      description: 'Sorting algorithms organize data in a specific order. In music, this could mean arranging tracks by tempo progression, energy curves, or emotional arcs to create coherent listening experiences. This approach considers the sequence and flow of music rather than just individual similarities.',
      pros: ['Considers multiple factors', 'Creates coherent playlists', 'Better for long-form listening'],
      cons: ['More complex computation', 'Slower processing', 'Requires more data']
    },
    { 
      id: 'searching', 
      name: 'Searching Algorithm', 
      description: 'Search algorithms find specific items in a dataset. In music recommendation, this could involve complex queries like "find songs that are energetic but not too fast" or "discover tracks that bridge two different genres." This approach allows for more nuanced and flexible music discovery.',
      pros: ['Handles complex queries', 'Flexible matching', 'Good for discovery'],
      cons: ['Requires query understanding', 'More computational overhead', 'Less predictable results']
    }
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
    <>
      {FEATURE_STATS.map((stat) => {
        const value = track[stat.key] as number
        return (
          <React.Fragment key={stat.key}>
            <div style={{
              fontSize: '0.8rem',
              color: '#B8B8B8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: '500'
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#EAEAEA',
              fontWeight: '600'
            }}>
              {stat.format(value)}
            </div>
          </React.Fragment>
        )
      })}
    </>
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
    <>
      <style>
        {`
          html, body {
            overflow-x: hidden;
            box-sizing: border-box;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      position: 'relative',
      width: '100vw',
        maxWidth: '100vw',
        overflowX: 'hidden'
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
            margin: '0 0 24px 0',
              lineHeight: '1.1',
            textAlign: 'center'
            }}>
              The Algorithmic Ear
            </h1>

          {/* Info Box */}
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 32px auto',
            padding: '20px 24px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <h4 style={{
              color: '#E0CDA9',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '12px',
              fontFamily: 'Fira Code, monospace'
            }}>
              Can Taste Be Quantified?
            </h4>
            <p style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              margin: 0,
              fontWeight: '400'
            }}>
              The Algorithmic Ear explores a fundamental question: can algorithms truly 'hear' better than humans? From platform to platform, music curation varies dramatically—different algorithms, different human curators, different approaches to taste. Spotify attempts to quantify and qualify taste through audio features<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[1]</a></sup>, but as Louridas explains<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>, greedy algorithms make locally optimal choices that often lead to suboptimal global outcomes. As Seaver argues<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>, algorithms are not just technical objects but cultural ensembles—ways of enacting taste as logic. This interface exposes how recommendation systems become what Gillespie calls "public relevance algorithms"<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[4]</a></sup> that shape our musical worlds. When platforms try to measure the unmeasurable, what gets lost in translation?
            </p>
          </div>
          

          
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
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: '80px',
          paddingTop: '80px'
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
              margin: '0 0 16px 0'
            }}>
              Select Algorithm Type
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#B8B8B8',
              fontWeight: '400',
              lineHeight: '1.5',
              maxWidth: '600px',
              margin: '0 auto 32px',
              letterSpacing: '-0.01em'
            }}>
              Choose how the algorithm will listen to and recommend music. Each approach reveals different aspects of algorithmic curation.
            </p>
            
            {/* Algorithm Type Selector */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontSize: '14px',
                color: '#B8B8B8',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                Algorithm Type:
              </div>
              <CustomDropdown
                options={ALGORITHMS.map(algorithm => ({
                  id: algorithm.id,
                  name: algorithm.name,
                  disabled: algorithm.id !== 'greedy'
                }))}
                value={selectedAlgorithm}
                onChange={(value) => {
                  setSelectedAlgorithm(value)
                }}
              />
              
            </div>
            
            {/* Greedy Algorithm Explanation Box */}
            <div style={{
              maxWidth: '600px',
              margin: '32px auto 0 auto',
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center'
            }}>
              <h5 style={{
                color: '#E0CDA9',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
                fontFamily: 'Fira Code, monospace'
              }}>
                About the Greedy Algorithm
              </h5>
              <p style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                margin: '0 0 20px 0',
                fontStyle: 'normal'
              }}>
                A Greedy Algorithm picks the closest match at each step — simple but often repetitive. It makes locally optimal choices without considering the global picture, which can lead to suboptimal overall outcomes.
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginTop: '20px'
              }}>
                <div>
                  <h6 style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#E0CDA9',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'Fira Code, monospace'
                  }}>
                    Strengths
                  </h6>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Simple and precise
                    </li>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Fast and explainable
                    </li>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Good for similarity search
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h6 style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#E0CDA9',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'Fira Code, monospace'
                  }}>
                    Weaknesses
                  </h6>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Reduces diversity
                    </li>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Creates echo chambers
                    </li>
                    <li style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        color: '#E0CDA9',
                        fontSize: '14px'
                      }}>•</span>
                      Poor for discovery
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
          </div>

          
        </section>

        {/* Step 2: Select Musical Dimension */}
        <section style={{ 
          padding: '96px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          marginTop: '80px',
          paddingTop: '80px'
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
              margin: '0 0 16px 0'
              }}>
                Select Musical Dimension
              </h2>
            <p style={{
              fontSize: '16px',
              color: '#B8B8B8',
              fontWeight: '400',
              lineHeight: '1.5',
              maxWidth: '600px',
              margin: '0 auto 32px',
              letterSpacing: '-0.01em'
            }}>
              Each feature below represents a way Spotify quantifies how we experience music — your chosen lens of qualification.
            </p>
            
            <div style={{
              maxWidth: '700px',
              margin: '0 auto 32px auto',
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'left'
            }}>
              <h5 style={{
                color: '#E0CDA9',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
                fontFamily: 'Fira Code, monospace'
              }}>
                What You're Actually Doing
              </h5>
              <p style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                margin: 0,
                fontStyle: 'normal'
              }}>
                This interface makes visible what usually remains hidden: how platforms like Spotify construct musical taste through algorithmic logic. When you select a feature like "danceability" or "valence," you're not just choosing a parameter—you're entering a system that has already decided what musical qualities matter<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[1]</a></sup>. The greedy algorithm's behavior—always picking the nearest match—demonstrates how recommendation systems prioritize similarity over discovery<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>. As Seaver argues, algorithms are "cultural multiples" shaped by human practices<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>—and Gillespie shows how they become "public relevance algorithms" that decide what counts as culturally important<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[4]</a></sup>. Every interaction here exposes how platforms don't just reflect taste—they actively construct it.
              </p>
            </div>
          </div>
          
          {/* Feature Selection Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '32px 48px',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0 20px'
          }}>
            {FEATURE_STATS.map((metric) => (
                <button
                key={metric.key}
                onClick={() => setSelectedFeature(metric.key)}
                  style={{
                  background: selectedFeature === metric.key 
                    ? 'rgba(224, 205, 169, 0.1)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: selectedFeature === metric.key 
                    ? '2px solid #E0CDA9' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  position: 'relative',
                  transform: selectedFeature === metric.key ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: selectedFeature === metric.key 
                    ? '0 0 20px rgba(193, 167, 94, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 16px rgba(0, 0, 0, 0.2)',
                  textAlign: 'left',
                  width: '100%',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedFeature !== metric.key) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: selectedFeature === metric.key ? '#E0CDA9' : '#FFFFFF',
                  marginBottom: '8px',
                  textAlign: 'left'
                }}>
                  {metric.label}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: selectedFeature === metric.key ? 'rgba(224, 205, 169, 0.8)' : 'rgba(255, 255, 255, 0.6)',
                  lineHeight: '1.4',
                  textAlign: 'left'
                }}>
                    {metric.description}
                  </div>
                </button>
            ))}
          </div>
          
          {/* Feature Explanation Box */}
          {selectedFeature && (
            <div style={{
              maxWidth: '600px',
              margin: '32px auto 0 auto',
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'rgba(25, 25, 25, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              animation: 'fadeInUp 0.3s ease-out'
            }}>
              <h4 style={{
                color: '#E0CDA9',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                fontFamily: 'Fira Code, monospace'
              }}>
                {FEATURE_DETAILS[selectedFeature as keyof typeof FEATURE_DETAILS]?.label || selectedFeature}: 0.0 to 1.0
              </h4>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                margin: 0,
                fontWeight: '400'
              }}>
                {FEATURE_DETAILS[selectedFeature as keyof typeof FEATURE_DETAILS]?.description || 'No description available'}
              </p>
            </div>
          )}
          
        </section>

        {/* Step 3: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <section style={{ 
            padding: '96px 0',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '80px',
            paddingTop: '80px'
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
                  lineHeight: '1.3',
                margin: '0 0 16px 0'
                }}>
                  Navigate by {selectedFeature}
                </h2>
              <p style={{
                fontSize: '16px',
                color: '#B8B8B8',
                fontWeight: '400',
                lineHeight: '1.5',
                maxWidth: '600px',
                margin: '0 auto',
                letterSpacing: '-0.01em'
              }}>
                The slider defines your preferred range; below are tracks that fit this profile.
              </p>
            </div>
            
            <div style={{
              padding: '48px 0',
              maxWidth: '800px',
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

            {/* Horizontal Track List */}
            <div style={{
              marginTop: '48px',
              padding: '0 2rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                padding: '16px 0',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(193, 167, 94, 0.3) transparent'
              }}>
                {sortedTracks.slice(0, 20).map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      const trackIndex = sortedTracks.findIndex(t => t.id === track.id)
                      setSliderValue(trackIndex)
                    }}
                    style={{
                      minWidth: '200px',
                      padding: '16px',
                      borderRadius: '12px',
                      border: selectedSong?.id === track.id 
                        ? '1px solid #E0CDA9' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedSong?.id === track.id 
                        ? 'rgba(224, 205, 169, 0.08)' 
                        : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedSong?.id !== track.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedSong?.id !== track.id) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: selectedSong?.id === track.id ? '#E0CDA9' : '#EAEAEA',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: selectedSong?.id === track.id ? 'rgba(224, 205, 169, 0.7)' : '#B8B8B8',
                      marginBottom: '8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.artist}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#B8B8B8',
                      fontFamily: 'Fira Code, monospace'
                    }}>
                      {selectedFeature}: {((track[selectedFeature] as number) * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Algorithmic Recommendations Info */}
            <div style={{
              maxWidth: '700px',
              margin: '60px auto 0 auto',
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center'
            }}>
              <h4 style={{
                color: '#E0CDA9',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '16px',
                fontFamily: 'Fira Code, monospace'
              }}>
                Algorithmic Recommendations
              </h4>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                margin: 0,
                fontStyle: 'italic'
              }}>
                Every playlist here is the product of a logic that prioritizes proximity. As Louridas demonstrates, greedy algorithms make locally optimal choices that often lead to suboptimal global outcomes—a perfect metaphor for how recommendation systems can create echo chambers. As Seaver observes, algorithms are "cultural multiples" — made through the practices, preferences, and compromises of engineers and listeners alike. This interface exposes how recommendation systems become what he calls "ensembles of human practice" rather than neutral technical tools. The greedy algorithm's tendency toward homogenization reveals the cultural work embedded in what appears to be pure computation.
              </p>
            </div>
            
          </section>
        )}

        {/* Step 4: Results */}
        {selectedSong && (
          <section style={{ 
            padding: '96px 0',
            background: 'radial-gradient(circle at center, rgba(224, 205, 169, 0.02) 0%, transparent 70%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '80px',
            paddingTop: '80px'
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
                Step Four
              </div>
                <h2 style={{ 
                  fontSize: '32px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                margin: '0 0 16px 0'
                }}>
                  Algorithmic Recommendation
                </h2>
              <p style={{
                fontSize: '16px',
                color: '#B8B8B8',
                fontWeight: '400',
                lineHeight: '1.5',
                maxWidth: '600px',
                margin: '0 auto',
                letterSpacing: '-0.01em'
              }}>
                The algorithm listened closely — here's what it heard.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column'
            }}>
            <div className="recommendation-grid" style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2rem',
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              {/* Selected Song */}
              <div className="recommendation-card" style={{
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.01)',
                borderRadius: '16px',
                padding: '24px',
                width: '280px',
                minHeight: '360px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.2s ease'
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
                  <div style={{ 
                    fontSize: '20px', 
                    marginBottom: '8px', 
                    lineHeight: '1.3', 
                    fontWeight: '500',
                    color: '#EAEAEA',
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
                    fontSize: '14px', 
                    fontWeight: '400',
                    marginBottom: '24px',
                    color: '#B8B8B8',
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
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridAutoRows: 'minmax(20px, auto)',
                    rowGap: '0.5rem',
                    columnGap: '1rem',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                  }}>
                    {renderFeatureStats(selectedSong)}
                  </div>
                </div>
              </div>

              {/* Next Song */}
              {nextSong && (
                <div className="recommendation-card" style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '16px',
                  padding: '24px',
                  width: '280px',
                  minHeight: '360px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s ease'
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
                    <div style={{ 
                      fontSize: '20px', 
                      marginBottom: '8px', 
                      lineHeight: '1.3', 
                      fontWeight: '500',
                      color: '#EAEAEA',
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
                      fontSize: '14px', 
                      fontWeight: '400',
                      marginBottom: '24px',
                      color: '#B8B8B8',
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
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gridAutoRows: 'minmax(20px, auto)',
                      rowGap: '0.5rem',
                      columnGap: '1rem',
                      textTransform: 'uppercase',
                      fontSize: '0.8rem',
                      lineHeight: '1.4'
                    }}>
                      {renderFeatureStats(nextSong)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>
            
            {/* Why This Isn't True Taste Development */}
            <div style={{
              maxWidth: '700px',
              margin: '60px auto 0 auto',
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'left'
            }}>
              <h5 style={{
                color: '#E0CDA9',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '12px',
                fontFamily: 'Fira Code, monospace'
              }}>
                Why This Isn't True Taste Development
              </h5>
              <p style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                margin: 0,
                fontStyle: 'normal'
              }}>
                The algorithmic recommendations you see here aren't truly developing your taste—they're reinforcing it. As Gillespie argues, "public relevance algorithms" don't just reflect what's relevant; they construct it. Every "similar" track the greedy algorithm suggests is a micro-decision about what counts as musical relevance. This creates a feedback loop: the more you interact with these recommendations, the more the system narrows your musical world. True taste development requires surprise, challenge, and discovery—qualities that greedy algorithms, by design, cannot provide. What you're experiencing isn't musical growth; it's algorithmic homogenization disguised as personalization.
              </p>
            </div>

            
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


        {/* References Section */}
        <div id="references" style={{
          marginTop: '80px',
          paddingTop: '40px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '700px',
          margin: '80px auto 0 auto',
          padding: '40px 0 0 0'
        }}>
          <h4 style={{
            color: '#E0CDA9',
            fontSize: '16px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '24px',
            fontFamily: 'Fira Code, monospace',
            textAlign: 'center'
          }}>
            References
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  color: '#E0CDA9',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  fontFamily: 'Fira Code, monospace',
                  minWidth: '20px'
                }}>
                  [1]
      </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6',
                    marginBottom: '8px'
                  }}>
                    Spotify. (2024). Audio Features. <em>Spotify Web API Documentation</em>.
    </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic',
                    marginBottom: '8px'
                  }}>
                    Technical documentation for Spotify's audio feature extraction
                  </div>
                  <a 
                    href="https://developer.spotify.com/documentation/web-api/reference/get-audio-features" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      color: '#E0CDA9', 
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(224, 205, 169, 0.1)',
                      border: '1px solid rgba(224, 205, 169, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(224, 205, 169, 0.2)'
                      e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.4)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(224, 205, 169, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.2)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    View Documentation →
                  </a>
                </div>
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  color: '#E0CDA9',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  fontFamily: 'Fira Code, monospace',
                  minWidth: '20px'
                }}>
                  [2]
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6',
                    marginBottom: '8px'
                  }}>
                    Louridas, P. (2020). <em>Algorithms</em>. MIT Press. (Chapter on Greedy Algorithms, pp. 45-67).
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic'
                  }}>
                    Foundational text on algorithmic thinking and greedy algorithm design principles
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  color: '#E0CDA9',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  fontFamily: 'Fira Code, monospace',
                  minWidth: '20px'
                }}>
                  [3]
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6',
                    marginBottom: '8px'
                  }}>
                    Seaver, N. (2017). "Algorithms as Culture: Some Tactics for the Ethnography of Algorithmic Systems." <em>Big Data & Society</em>, 4(2), 1-12. (pp. 3-8).
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic'
                  }}>
                    Ethnographic approach to understanding algorithms as cultural ensembles
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  color: '#E0CDA9',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  fontFamily: 'Fira Code, monospace',
                  minWidth: '20px'
                }}>
                  [4]
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: '1.6',
                    marginBottom: '8px'
                  }}>
                    Gillespie, T. (2014). "The Relevance of Algorithms." In <em>Media Technologies: Essays on Communication, Materiality, and Society</em>, edited by T. Gillespie, P. Boczkowski, and K. Foot, 167-194. MIT Press. (pp. 167-180).
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontStyle: 'italic'
                  }}>
                    Foundational work on how algorithms shape public knowledge and cultural production
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  )
}

export default App
