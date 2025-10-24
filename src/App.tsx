/**
 * The Algorithmic Ear - Interactive Music Recommendation System
 * 
 * This React application demonstrates how algorithmic music recommendation systems work
 * by allowing users to interact with a simplified greedy algorithm. The app explores
 * the relationship between measurable audio features and subjective musical experience.
 * 
 * Key Features:
 * - Interactive feature selection (danceability, energy, valence, etc.)
 * - Real-time slider-based track exploration
 * - Greedy algorithm demonstration with 30 diverse tracks
 * - Mobile-responsive design with touch-friendly interactions
 * - Academic framework integrating cultural theory and algorithmic critique
 * 
 * Architecture:
 * - Main App component handles all state and UI logic
 * - CustomDropdown for algorithm selection
 * - Spotify API integration with fallback data
 * - Responsive design with mobile optimization
 * 
 * @author Candace Stewart
 * @version 2.0
 * @created 2024
 */

import React, { useState, useEffect, useMemo } from 'react'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import type { Track } from './types'
import CustomDropdown from './components/CustomDropdown'
import { INFO_CONTENT, FEATURE_DETAILS } from './data/infoContent'

function App() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Core data state
  const [tracks, setTracks] = useState<Track[]>([])                    // All available tracks (30 tracks)
  const [selectedSong, setSelectedSong] = useState<Track | null>(null) // Currently selected track
  const [nextSong, setNextSong] = useState<Track | null>(null)         // Algorithm's next recommendation
  
  // User interaction state
  const [selectedFeature, setSelectedFeature] = useState<keyof Track | null>(null) // Selected audio feature
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('greedy')             // Algorithm type (only greedy works)
  const [sliderValue, setSliderValue] = useState(0)                               // Slider position (0-29)
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)           // Loading state for initial data fetch
  const [loadingProgress, setLoadingProgress] = useState(0)  // Loading progress percentage
  const [loadingMessage, setLoadingMessage] = useState('Starting...') // Loading status message
  const [error, setError] = useState<string | null>(null)    // Error state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Mobile navigation menu state

  // ============================================================================
  // CONSTANTS & CONFIGURATION
  // ============================================================================
  
  /**
   * Audio features available for selection
   * These correspond to Spotify's audio analysis features
   * Each feature has a key (property name), label (display name), description, and format function
   */
  const FEATURE_STATS: Array<{
    key: keyof Pick<Track, 'danceability' | 'energy' | 'valence' | 'tempo' | 'loudness' | 'acousticness'>
    label: string
    description: string
    format: (value: number) => string
  }> = [
    { key: 'danceability', label: 'Danceability', description: 'How suitable the track is for dancing', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'energy', label: 'Energy', description: 'Perceptual intensity and activity level', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'valence', label: 'Valence', description: 'Musical positivity (happy vs. sad)', format: (value) => `${(value * 100).toFixed(0)}%` },
    { key: 'tempo', label: 'Tempo', description: 'Speed of the track in BPM', format: (value) => `${Math.round(value)} BPM` },
    { key: 'loudness', label: 'Loudness', description: 'Overall loudness level', format: (value) => `${Math.round(value)} dB` },
    { key: 'acousticness', label: 'Acousticness', description: 'Likelihood of being acoustic vs. electronic', format: (value) => `${(value * 100).toFixed(0)}%` }
  ]

  /**
   * Available algorithms for demonstration
   * Currently only 'greedy' is functional
   * Other algorithms are placeholders for future implementation
   */
  const ALGORITHMS = [
    { 
      id: 'greedy', 
      name: 'Greedy Algorithm', 
      description: 'I chose greedy algorithms as the foundation for this prototype because they represent the most fundamental approach to optimization problems. Every complex recommendation system starts with greedy principles—from Spotify\'s initial similarity matching to Netflix\'s early collaborative filtering. By starting with greedy algorithms, we can isolate the core challenge: how feature selection constrains recommendation quality. This foundational approach makes the limitations visible and understandable, providing a clear baseline for understanding why more sophisticated systems are necessary.',
      pros: ['Foundational algorithmic concept', 'Clear baseline for comparison', 'Makes limitations visible', 'Fast and explainable'],
      cons: ['Locally optimal, globally suboptimal', 'Creates recommendation loops', 'Poor long-term user satisfaction']
    },
    { 
      id: 'collaborative', 
      name: 'Collaborative Filtering', 
      description: 'Collaborative filtering recommends items based on user behavior patterns. It finds users with similar taste and suggests songs they liked. This approach leverages collective intelligence but can create filter bubbles and struggles with new users or niche content.',
      pros: ['Leverages collective wisdom', 'Works without content analysis', 'Good for popular music'],
      cons: ['Cold start problem', 'Creates filter bubbles', 'Poor for niche content']
    },
    { 
      id: 'content', 
      name: 'Content-Based Filtering', 
      description: 'Content-based filtering analyzes the actual musical content (audio features, lyrics, metadata) to find similar songs. It recommends based on musical similarity rather than user behavior. This approach works well for new users but can be limited by the quality of feature extraction.',
      pros: ['Works for new users', 'Based on musical content', 'Good for niche genres'],
      cons: ['Limited by feature quality', 'Can be too narrow', 'Requires content analysis']
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

  // ============================================================================
  // EFFECTS & DATA LOADING
  // ============================================================================
  
  /**
   * Load tracks on component mount
   * Attempts to fetch from Spotify API, falls back to FALLBACK_TRACKS
   * Simulates loading progress for better UX
   */
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

  // ============================================================================
  // COMPUTED VALUES & ALGORITHM LOGIC
  // ============================================================================
  
  /**
   * Sort tracks based on selected feature and slider value
   * Implements greedy algorithm: finds tracks most similar to slider position
   * Adds randomness factor to make recommendations less predictable
   * Returns top 15 most similar tracks
   */
  const sortedTracks = useMemo(() => {
    if (!selectedFeature) return tracks
    
    // Convert slider value (0-29) to feature value (0-1) for more realistic recommendations
    const targetValue = sliderValue / (tracks.length - 1)
    
    return [...tracks]
      .map(track => {
        const featureValue = track[selectedFeature] as number
        const distance = Math.abs(featureValue - targetValue)
        
        // Add some randomness to make recommendations less predictable
        const randomness = Math.random() * 0.1 // Small random factor
        const score = distance + randomness
        
        return { track, score, distance }
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 15) // Show top 15 most similar tracks instead of all
      .map(item => item.track)
  }, [tracks, selectedFeature, sliderValue])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Handle slider value change
   * Updates slider position and selects corresponding track from sorted recommendations
   * @param value - New slider value (0-29)
   */
  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    // Select a track from the sorted recommendations based on slider position
    if (sortedTracks.length > 0) {
      const index = Math.floor((value / (tracks.length - 1)) * sortedTracks.length)
      const clampedIndex = Math.min(index, sortedTracks.length - 1)
      if (sortedTracks[clampedIndex]) {
        setSelectedSong(sortedTracks[clampedIndex])
      }
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
    if (tracks.length === 0) {
      setSliderValue(0)
      setSelectedSong(null)
      return
    }

    setSliderValue(prev => {
      const maxIndex = tracks.length - 1
      return prev > maxIndex ? maxIndex : prev
    })
  }, [tracks.length])

  // Keep the selected song aligned with the slider position
  useEffect(() => {
    if (!selectedFeature || sortedTracks.length === 0) {
      setSelectedSong(null)
      return
    }

    // Select a track from the sorted recommendations based on slider position
    const index = Math.floor((sliderValue / (tracks.length - 1)) * sortedTracks.length)
    const clampedIndex = Math.min(index, sortedTracks.length - 1)
    if (sortedTracks[clampedIndex]) {
      setSelectedSong(sortedTracks[clampedIndex])
    }
  }, [selectedFeature, sliderValue, sortedTracks, tracks.length])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  /**
   * Render feature statistics for a track
   * Displays all audio features with formatted values
   * @param track - Track object to render stats for
   * @returns JSX element with feature statistics
   */
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

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================
  
  // Show loading screen while tracks are being fetched
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

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      {/* Global styles for animations and responsive design */}
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
      {/* Progress Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'rgba(255, 255, 255, 0.1)',
        zIndex: 1001
      }}>
        <div style={{
          height: '100%',
          background: '#E0CDA9',
          width: `${Math.min(100, (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* ========================================================================
           MAIN HEADER - Fixed navigation and branding
           ======================================================================== */}
      <header style={{
        position: 'fixed',
        top: '3px',
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 10, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#E0CDA9',
            fontFamily: 'Fira Code, monospace'
          }}>
            The Algorithmic Ear
          </div>
          
          {/* Navigation Menu */}
          <nav style={{
            display: window.innerWidth < 768 ? 'none' : 'flex',
            gap: '24px',
            fontSize: '14px',
            fontFamily: 'Fira Code, monospace'
          }}>
            <a 
              href="#step1" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E0CDA9'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Algorithm
            </a>
            <a 
              href="#step2" 
              style={{ 
                color: selectedAlgorithm === 'greedy' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: selectedAlgorithm === 'greedy' ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => {
                if (selectedAlgorithm === 'greedy') {
                  e.currentTarget.style.color = '#E0CDA9'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedAlgorithm === 'greedy') {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (selectedAlgorithm === 'greedy') {
                  document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  // Scroll to step1 to help user select greedy algorithm first
                  document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Features
            </a>
            <a 
              href="#step3" 
              style={{ 
                color: (selectedFeature && selectedAlgorithm === 'greedy') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: (selectedFeature && selectedAlgorithm === 'greedy') ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => {
                if (selectedFeature && selectedAlgorithm === 'greedy') {
                  e.currentTarget.style.color = '#E0CDA9'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedFeature && selectedAlgorithm === 'greedy') {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (selectedFeature && selectedAlgorithm === 'greedy') {
                  document.querySelector('#step3')?.scrollIntoView({ behavior: 'smooth' });
                } else if (selectedAlgorithm === 'greedy') {
                  // Scroll to step2 to help user select a feature first
                  document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  // Scroll to step1 to help user select greedy algorithm first
                  document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Explore
            </a>
            <a 
              href="#step4" 
              style={{ 
                color: selectedSong ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: selectedSong ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => {
                if (selectedSong) {
                  e.currentTarget.style.color = '#E0CDA9'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSong) {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                if (selectedSong) {
                  document.querySelector('#step4')?.scrollIntoView({ behavior: 'smooth' });
                } else if (selectedFeature && selectedAlgorithm === 'greedy') {
                  // Scroll to step3 to help user select a song first
                  document.querySelector('#step3')?.scrollIntoView({ behavior: 'smooth' });
                } else if (selectedAlgorithm === 'greedy') {
                  // Scroll to step2 to help user select a feature first
                  document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  // Scroll to step1 to help user select greedy algorithm first
                  document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Results
            </a>
            <a 
              href="#references" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                textDecoration: 'none',
                transition: 'color 0.2s ease',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#E0CDA9'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#references')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              References
            </a>
          </nav>
          
          {/* Mobile Menu Button */}
          <div style={{
            display: window.innerWidth < 768 ? 'block' : 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#E0CDA9',
            padding: '8px',
            transition: 'color 0.2s ease'
          }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(224, 205, 169, 0.8)'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#E0CDA9'}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
            display: window.innerWidth < 768 ? 'block' : 'none',
            zIndex: 1000
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              fontSize: '16px',
              fontFamily: 'Fira Code, monospace'
            }}>
              <a 
                href="#step1" 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
              >
                Algorithm
              </a>
              <a 
                href="#step2" 
                style={{ 
                  color: selectedAlgorithm === 'greedy' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: selectedAlgorithm === 'greedy' ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedAlgorithm === 'greedy') {
                    document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                  }
                  setMobileMenuOpen(false);
                }}
              >
                Features
              </a>
              <a 
                href="#step3" 
                style={{ 
                  color: (selectedFeature && selectedAlgorithm === 'greedy') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: (selectedFeature && selectedAlgorithm === 'greedy') ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedFeature && selectedAlgorithm === 'greedy') {
                    document.querySelector('#step3')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (selectedAlgorithm === 'greedy') {
                    document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                  }
                  setMobileMenuOpen(false);
                }}
              >
                Explore
              </a>
              <a 
                href="#step4" 
                style={{ 
                  color: selectedSong ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.4)', 
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: selectedSong ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (selectedSong) {
                    document.querySelector('#step4')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (selectedFeature && selectedAlgorithm === 'greedy') {
                    document.querySelector('#step3')?.scrollIntoView({ behavior: 'smooth' });
                  } else if (selectedAlgorithm === 'greedy') {
                    document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    document.querySelector('#step1')?.scrollIntoView({ behavior: 'smooth' });
                  }
                  setMobileMenuOpen(false);
                }}
              >
                Results
              </a>
              <a 
                href="#references" 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  textDecoration: 'none',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#references')?.scrollIntoView({ behavior: 'smooth' });
                  setMobileMenuOpen(false);
                }}
              >
                References
              </a>
            </div>
          </div>
        )}
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: window.innerWidth < 768 ? '0 1rem' : '0 2rem',
        position: 'relative',
        zIndex: 1,
        width: '100%',
        overflow: 'hidden',
        paddingTop: '80px' // Add space for fixed header
      }}>
        {/* ========================================================================
             HERO SECTION - Main title and introduction
             ======================================================================== */}
        <header style={{ 
          textAlign: 'center', 
          padding: window.innerWidth < 768 ? '80px 0 60px' : '120px 0 100px',
          background: 'radial-gradient(circle at top, rgba(255,255,255,0.03) 0%, transparent 60%)',
          position: 'relative',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: window.innerWidth < 768 ? '20px' : '40px'
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
              fontSize: window.innerWidth < 768 ? '36px' : '52px',
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
              Every music platform faces the same fundamental challenge: how do you predict what someone will love before they've heard it? Spotify's approach—converting audio signals into numerical features like danceability, energy, and valence—represents one solution to this prediction problem<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[1]</a></sup>. But this raises deeper questions about the relationship between measurable audio properties and subjective musical experience.<br /><br />
              
              This interface lets you explore how recommendation systems translate musical experience into computational decisions. You'll select a feature and watch as the algorithm constructs a similarity space—but as you'll discover, mathematical proximity doesn't guarantee emotional resonance<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>. Two tracks with identical energy scores might belong to completely different cultural contexts: a punk anthem and a techno banger occupy the same numerical space but different emotional territories. This reveals the core challenge: how do you optimize for user engagement when the features that drive engagement aren't the same as the features you can measure<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>?<br /><br />
              
              For product teams, this creates a tension between optimization and discovery. The features that predict short-term engagement (familiarity, energy, danceability) might not be the same features that drive long-term user satisfaction and platform growth<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[4]</a></sup>. The question isn't just whether algorithms can find similar songs—it's whether the metrics we optimize for align with the experiences users actually value.
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
          
          {/* Scroll Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: '#E0CDA9',
            fontSize: '12px',
            fontFamily: 'Fira Code, monospace',
            animation: 'bounce 2s infinite',
            zIndex: 10
          }}>
            <div style={{ marginBottom: '8px' }}>Scroll to explore</div>
            <div style={{ fontSize: '20px' }}>↓</div>
          </div>
        </header>

        {/* Step 1: Feature Selection */}
        <section id="step1" style={{ 
          padding: '80px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          marginTop: '60px',
          paddingTop: '60px',
          marginBottom: '20px',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.005) 0%, transparent 50%)'
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
              {/* ========================================================================
                   STEP ONE - Algorithm Selection
                   ======================================================================== */}
              Step One
            </div>
            <h2 style={{
                fontSize: window.innerWidth < 768 ? '24px' : '32px',
                fontWeight: '500',
                color: '#FFFFFF',
                lineHeight: '1.3',
              margin: '0 0 16px 0'
            }}>
              Select Algorithm Type
            </h2>
            <p style={{
              fontSize: window.innerWidth < 768 ? '14px' : '16px',
              color: '#B8B8B8',
              fontWeight: '400',
              lineHeight: '1.5',
              maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
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
                  if (value === 'greedy') {
                    setSelectedAlgorithm(value)
                  }
                }}
              />
              
            </div>
            
            {/* Algorithm Explanation Box */}
            <div style={{
              maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
              margin: '32px auto 0 auto',
              padding: window.innerWidth < 768 ? '16px 20px' : '20px 24px',
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
                About {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.name}
              </h5>
              <p style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: '0.85rem',
                lineHeight: '1.6',
                margin: '0 0 20px 0',
                fontStyle: 'normal'
              }}>
                {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.description}
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
                    fontFamily: 'Fira Code, monospace',
                    textAlign: 'center'
                  }}>
                    Strengths
                  </h6>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.pros.map((pro, index) => (
                      <li key={index} style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        lineHeight: '1.4'
                      }}>
                        <span style={{
                          color: '#E0CDA9',
                          fontSize: '12px',
                          marginTop: '1px',
                          flexShrink: 0
                        }}>•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
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
                    fontFamily: 'Fira Code, monospace',
                    textAlign: 'center'
                  }}>
                    Weaknesses
                  </h6>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                  }}>
                    {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.cons.map((con, index) => (
                      <li key={index} style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        lineHeight: '1.4'
                      }}>
                        <span style={{
                          color: '#E0CDA9',
                          fontSize: '12px',
                          marginTop: '1px',
                          flexShrink: 0
                        }}>•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Coming Soon Message for Non-Greedy Algorithms */}
            {selectedAlgorithm !== 'greedy' && (
              <div style={{
                maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
                margin: '24px auto 0 auto',
                padding: '20px 24px',
                borderRadius: '16px',
                background: 'rgba(224, 205, 169, 0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(224, 205, 169, 0.2)',
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
                  Coming Soon
                </h5>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  margin: 0,
                  fontStyle: 'italic'
                }}>
                  {selectedAlgorithm === 'collaborative' 
                    ? 'Collaborative filtering requires user behavior data and would need a completely different interface focused on user similarity rather than musical features.'
                    : 'Content-based filtering would need a multi-dimensional interface to handle multiple features simultaneously, which requires a different interaction model.'
                  }
                </p>
              </div>
            )}
            
          </div>

          {/* Continue Button */}
          <div style={{
            textAlign: 'center',
            marginTop: '40px'
          }}>
            <button 
              onClick={() => document.querySelector('#step2')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: 'rgba(224, 205, 169, 0.1)',
                border: '1px solid rgba(224, 205, 169, 0.3)',
                color: '#E0CDA9',
                padding: window.innerWidth < 768 ? '16px 32px' : '12px 24px',
                minHeight: window.innerWidth < 768 ? '48px' : 'auto',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'Fira Code, monospace',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(224, 205, 169, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.5)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(224, 205, 169, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Continue to Features →
            </button>
          </div>
          
        </section>

        {/* Step 2: Select Musical Dimension */}
        {selectedAlgorithm === 'greedy' && (
        <section id="step2" style={{ 
          padding: '80px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
          marginTop: '60px',
          paddingTop: '60px',
          marginBottom: '20px',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.005) 0%, transparent 50%)'
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
              {/* ========================================================================
                   STEP TWO - Feature Selection
                   ======================================================================== */}
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
              maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
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
                This interface reveals the product strategy behind recommendation systems: feature engineering as user behavior optimization. When you select a feature like "danceability" or "valence," you're not just choosing a parameter—you're entering Spotify's optimization framework, where these features represent hypotheses about what drives user engagement<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[1]</a></sup>. Each feature is a product decision: danceability because it correlates with skip rates, energy because it predicts playlist completion, valence because it drives sharing behavior. The algorithm's behavior—whether greedy, collaborative filtering, or content-based—operates within this feature space, but the real constraint is the business logic embedded in feature selection<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>. As Seaver argues, algorithms are "cultural multiples" shaped by human practices<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>—and Gillespie shows how they become "public relevance algorithms" that decide what counts as culturally important<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[4]</a></sup>. The critical question for product teams isn't just about algorithmic performance, but about whether the features you optimize for actually capture the user experiences that drive retention, discovery, and long-term platform value.
              </p>
            </div>
          </div>
          
          {/* Feature Selection Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
            gap: window.innerWidth < 768 ? '16px 24px' : '32px 48px',
            maxWidth: '800px',
            margin: '0 auto',
            padding: window.innerWidth < 768 ? '0 16px' : '0 20px'
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
                  padding: window.innerWidth < 768 ? '32px 20px' : '24px 20px',
                  minHeight: window.innerWidth < 768 ? '120px' : '120px',
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
              maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
              margin: '32px auto 0 auto',
              padding: window.innerWidth < 768 ? '16px 20px' : '20px 24px',
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
                {FEATURE_DETAILS[selectedFeature as keyof typeof FEATURE_DETAILS]?.label || selectedFeature}
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
          
          {/* Continue Button */}
          {selectedFeature && (
            <div style={{
              textAlign: 'center',
              marginTop: '40px'
            }}>
              <button 
                onClick={() => document.querySelector('#step3')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  background: 'rgba(224, 205, 169, 0.1)',
                  border: '1px solid rgba(224, 205, 169, 0.3)',
                  color: '#E0CDA9',
                  padding: window.innerWidth < 768 ? '16px 32px' : '12px 24px',
                minHeight: window.innerWidth < 768 ? '48px' : 'auto',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Fira Code, monospace',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(224, 205, 169, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.5)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(224, 205, 169, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(224, 205, 169, 0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Continue to Explore →
              </button>
            </div>
          )}
          
        </section>
        )}

        {/* Step 3: Slider */}
        {selectedFeature && sortedTracks.length > 0 && (
          <section id="step3" style={{ 
            padding: window.innerWidth < 768 ? '60px 0' : '80px 0',
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
            marginTop: '60px',
            paddingTop: '60px',
            marginBottom: '20px',
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.005) 0%, transparent 50%)'
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
                {/* ========================================================================
                     STEP THREE - Track Exploration & Slider
                     ======================================================================== */}
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
                maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
                margin: '0 auto',
                letterSpacing: '-0.01em'
              }}>
                The slider controls your preferred {selectedFeature} level; below are the {sortedTracks.length} most similar tracks. Drag the slider or click any track to explore.
              </p>
            </div>
            
            {/* Algorithmic Recommendations Info */}
            <div style={{
              maxWidth: '700px',
              margin: '40px auto 0 auto',
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
                Every playlist here demonstrates why greedy algorithms provide the ideal foundation for understanding recommendation systems. Greedy algorithms make locally optimal choices at each step—a fundamental principle that underlies most recommendation approaches, from Spotify's similarity matching to Netflix's collaborative filtering<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>. By starting with greedy algorithms, we can isolate the core constraint: the feature space itself. When we reduce musical experience to a fixed set of numerical dimensions, we create what mathematicians call a "manifold" of possible recommendations—a curved space where only certain types of similarity can be expressed<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>. As Seaver observes, algorithms are "cultural multiples" — made through the practices, preferences, and compromises of engineers and listeners alike<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[3]</a></sup>. This greedy approach reveals how recommendation systems become what he calls "ensembles of human practice" rather than neutral technical tools. The homogenization isn't just algorithmic—it's geometric, constrained by the very dimensions we choose to measure.
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
              
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="range"
                  min="0"
                  max={tracks.length - 1}
                  step="1"
                  value={sliderValue}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: window.innerWidth < 768 ? '10px' : '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    position: 'relative'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  left: `${(sliderValue / (tracks.length - 1)) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  color: '#E0CDA9',
                  fontFamily: 'Fira Code, monospace',
                  background: 'rgba(0, 0, 0, 0.8)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  {(sliderValue / (tracks.length - 1)).toFixed(1)}
                </div>
              </div>
              
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
                gap: window.innerWidth < 768 ? '12px' : '16px',
                overflowX: 'auto',
                padding: window.innerWidth < 768 ? '20px 0' : '16px 0',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(193, 167, 94, 0.3) transparent',
                WebkitOverflowScrolling: 'touch'
              }}>
                {sortedTracks.map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      const trackIndex = sortedTracks.findIndex(t => t.id === track.id)
                      if (trackIndex !== -1) {
                        // Convert the track's feature value back to slider position
                        const featureValue = track[selectedFeature as keyof Track] as number
                        const sliderPos = Math.floor(featureValue * (tracks.length - 1))
                        setSliderValue(sliderPos)
                        setSelectedSong(track)
                      }
                    }}
                    style={{
                      minWidth: window.innerWidth < 768 ? '180px' : '200px',
                      padding: window.innerWidth < 768 ? '20px 16px' : '16px',
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
            
          </section>
        )}

        {/* Step 4: Results */}
        {selectedSong && (
          <section id="step4" style={{ 
            padding: window.innerWidth < 768 ? '60px 0' : '80px 0',
            background: 'radial-gradient(circle at center, rgba(224, 205, 169, 0.02) 0%, transparent 70%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
            marginTop: '60px',
            paddingTop: '60px',
            marginBottom: '20px'
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
                {/* ========================================================================
                     STEP FOUR - Algorithmic Recommendations
                     ======================================================================== */}
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
                maxWidth: window.innerWidth < 768 ? '90vw' : '600px',
                margin: '0 auto',
                letterSpacing: '-0.01em'
              }}>
                The algorithm listened closely — here's what it heard.
              </p>
            </div>
            
            {/* Why This Isn't True Taste Development */}
            <div style={{
              maxWidth: '700px',
              margin: '40px auto 0 auto',
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
                The algorithmic recommendations you see here reveal the epistemological constraints of feature-based music curation. As Gillespie argues, "public relevance algorithms" don't just reflect what's relevant; they construct it through the categories and measurements that engineers choose to include<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[4]</a></sup>. The deeper issue isn't algorithmic choice—whether greedy, collaborative filtering, or content-based—but the axiomatic foundation of the feature space itself. By treating musical experience as a vector in a fixed-dimensional space, we create what computer scientists call a "representation learning" problem: the algorithm can only discover patterns within the representational constraints we've imposed<sup><a href="#references" onClick={(e) => { e.preventDefault(); document.getElementById('references')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#E0CDA9', textDecoration: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>[2]</a></sup>. Every "similar" track represents not just a computational decision, but an ontological commitment to a particular way of understanding musical meaning. The real question is whether engineering teams should have the epistemic authority to define the fundamental categories through which we experience music—or whether this represents a form of cultural imperialism disguised as technical optimization.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column'
            }}>
            <div className="recommendation-grid" style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(2, 280px)',
              justifyContent: 'center',
              gap: window.innerWidth < 768 ? '1rem' : '2rem',
              marginTop: '2rem'
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
                padding: window.innerWidth < 768 ? '20px' : '24px',
                width: window.innerWidth < 768 ? '100%' : '280px',
                minHeight: 'auto',
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
                  padding: window.innerWidth < 768 ? '20px' : '24px',
                  width: window.innerWidth < 768 ? '100%' : '280px',
                  minHeight: 'auto',
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


            
          </section>
        )}

        {/* Future of Algorithmic Curation */}
        <section style={{ 
          padding: '80px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.01) 0%, transparent 50%)'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0 2rem'
          }}>
            <div style={{
              color: '#E0CDA9',
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontFamily: 'Fira Code, monospace',
              marginBottom: '12px'
            }}>
              Looking Forward
            </div>
            <h2 style={{ 
              fontSize: '32px',
              fontWeight: '500',
              color: '#FFFFFF',
              marginBottom: '24px',
              letterSpacing: '-0.02em'
            }}>
              The Future of Algorithmic Curation
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              maxWidth: '700px',
              margin: '0 auto 40px auto',
              letterSpacing: '-0.01em'
            }}>
              This prototype demonstrates the limitations of simple algorithms, but it's not the whole story. Beyond simple algorithms, the future of music discovery lies in hybrid approaches that combine algorithmic efficiency with human insight.
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: window.innerWidth < 768 ? '16px' : '32px',
              marginTop: '48px'
            }}>
              <div style={{
                padding: '32px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'left'
              }}>
                <h3 style={{
                  color: '#E0CDA9',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  fontFamily: 'Fira Code, monospace'
                }}>
                  Beyond Simple Algorithms
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  margin: 0,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  Modern platforms use ensemble methods, collaborative filtering, content-based filtering, and contextual awareness. Spotify's Discover Weekly combines multiple algorithms with user behavior patterns, while Apple Music emphasizes human curation. The key is balancing algorithmic efficiency with serendipitous discovery—moving beyond simple similarity matching to understand musical context and cultural meaning.
                </p>
              </div>
              
              <div style={{
                padding: '32px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'left'
              }}>
                <h3 style={{
                  color: '#E0CDA9',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  fontFamily: 'Fira Code, monospace'
                }}>
                  The Human Element
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  margin: 0,
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}>
                  True taste development requires human context: cultural knowledge, emotional resonance, and the ability to make unexpected connections. The best recommendation systems don't replace human curators—they amplify their work, using algorithms to surface hidden gems that human experts can then contextualize and present.
                </p>
              </div>
            </div>
            
            <div style={{
              maxWidth: '700px',
              margin: '48px auto 0 auto',
              padding: '32px',
              borderRadius: '16px',
              background: 'rgba(224, 205, 169, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(224, 205, 169, 0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{
                color: '#E0CDA9',
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px',
                fontFamily: 'Fira Code, monospace'
              }}>
                The Path Forward
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: 0,
                fontStyle: 'italic'
              }}>
                The future isn't about choosing between algorithms and humans—it's about designing systems that honor both the efficiency of computation and the wisdom of human experience. As we build the next generation of music discovery tools, we must remember that the goal isn't to replace taste, but to expand it.
              </p>
            </div>
          </div>
        </section>

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
          marginTop: '120px',
          paddingTop: '60px',
          paddingBottom: '80px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'radial-gradient(circle at center, rgba(255,255,255,0.01) 0%, transparent 70%)',
          maxWidth: '800px',
          margin: '120px auto 0 auto',
          padding: '60px 0 80px 0'
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

      {/* Footer */}
      <footer style={{
        background: 'rgba(10, 10, 10, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '40px 0',
        marginTop: '80px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'Fira Code, monospace'
          }}>
            © 2024 The Algorithmic Ear
          </div>
          <div style={{
            display: 'flex',
            gap: '24px',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'Fira Code, monospace'
          }}>
            <a href="#references" style={{
              color: 'rgba(255, 255, 255, 0.6)',
              textDecoration: 'none',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#E0CDA9'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'}
            >
              References
            </a>
            <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Algorithmic Curation Research
            </span>
          </div>
        </div>
      </footer>
    </div>
    </>
  )
}

export default App
