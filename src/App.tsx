import React, { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useInView as useIntersectionObserver } from 'react-intersection-observer'
import AudioPlayer from './components/AudioPlayer'
import TasteSpaceVisualization from './components/TasteSpaceVisualization'
import PlaylistAnalysis from './components/PlaylistAnalysis'
import type { Track } from './types'
import { getToken, getRecommendations, getAudioFeatures, FALLBACK_TRACKS } from './lib/spotify'
import { joinTracksWithFeatures, normalizeFeatures } from './lib/transform'
import { generatePlaylist, generateClusteringPlaylist, generateHybridPlaylist, ALGORITHM_CONFIGS } from './lib/algorithms'
import './App.css'

interface AppState {
  isLoading: boolean
  tracks: Track[]
  currentTrack: Track | null
  playlist: Track[]
  currentAlgorithm: keyof typeof ALGORITHM_CONFIGS
  error: string | null
}

// Scroll-driven section component
const ScrollSection = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const { ref, inView } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  })

  return (
    <motion.section 
      ref={ref}
      className={`scroll-section ${className}`}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  )
}

function App() {
  console.log('🎧 App component rendering...')
  
  const [state, setState] = useState<AppState>({
    isLoading: true,
    tracks: [],
    currentTrack: null,
    playlist: [],
    currentAlgorithm: 'greedyDanceability',
    error: null
  })

  // Prevent infinite re-renders
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // Debug: Log state changes
  console.log('🎯 Current state:', {
    isLoading: state.isLoading,
    tracksCount: state.tracks.length,
    playlistCount: state.playlist.length,
    currentTrack: state.currentTrack?.name || 'none',
    error: state.error
  })

  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      loadTracks()
    }
  }, [hasInitialized])

  const loadTracks = async () => {
    console.log('🚀 Starting data load (v3.0 - Custom Engine)')
    console.log('App is loading...')
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokenData = await getToken()
      console.log('🔑 Got token, calling CUSTOM getRecommendations...')
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 20
      })
      console.log('🎵 Got recommendations from CUSTOM engine:', recommendations.tracks.length, 'tracks')
      
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
      
      console.log('🎯 About to normalize features for', tracksAsTrackType.length, 'tracks')
      let normalizedTracks: Track[] = []
      try {
        normalizedTracks = normalizeFeatures(tracksAsTrackType)
        console.log('✅ Features normalized successfully, got', normalizedTracks.length, 'tracks')
        
        console.log('🎯 About to update state with tracks')
        console.log('🎯 Sample normalized track:', normalizedTracks[0])
        setState(prev => {
          console.log('🎯 Previous state:', prev)
          const newState = {
            ...prev,
            tracks: normalizedTracks,
            currentTrack: normalizedTracks[0] || null,
            isLoading: false
          }
          console.log('🎯 New state:', newState)
          return newState
        })
        console.log('✅ State updated successfully')
      } catch (error) {
        console.error('❌ Error normalizing features or updating state:', error)
        throw error
      }
      
      if (normalizedTracks.length > 0) {
        console.log('🎯 About to generate playlist with', normalizedTracks.length, 'tracks')
        try {
          generateNewPlaylist(normalizedTracks, 'greedyDanceability')
          console.log('✅ Playlist generated successfully')
        } catch (error) {
          console.error('❌ Error generating playlist:', error)
        }
      }
    } catch (err) {
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      
      setState(prev => ({
        ...prev,
        tracks: fallbackTracks,
        currentTrack: fallbackTracks[0] || null,
        error: 'Using sample data (Spotify API unavailable)',
        isLoading: false
      }))
      
      if (fallbackTracks.length > 0) {
        generateNewPlaylist(fallbackTracks, 'greedyDanceability')
      }
    }
  }

  const generateNewPlaylist = (trackPool: Track[], algorithm: keyof typeof ALGORITHM_CONFIGS) => {
    console.log('🎯 generateNewPlaylist called with:', { trackPoolLength: trackPool.length, algorithm })
    
    try {
      let newPlaylist: Track[] = []
      
      if (algorithm === 'clustering') {
        console.log('🎯 Using clustering algorithm')
        newPlaylist = generateClusteringPlaylist(trackPool, 8, 5)
      } else if (algorithm === 'hybrid') {
        console.log('🎯 Using hybrid algorithm')
        newPlaylist = generateHybridPlaylist(trackPool, 8)
      } else {
        console.log('🎯 Using greedy algorithm:', algorithm)
        const config = { ...ALGORITHM_CONFIGS[algorithm] }
        newPlaylist = generatePlaylist(trackPool, config, 8)
      }
      
      console.log('🎯 Generated playlist with', newPlaylist.length, 'tracks')
      setState(prev => ({ ...prev, playlist: newPlaylist }))
      console.log('✅ Playlist state updated')
    } catch (error) {
      console.error('❌ Error in generateNewPlaylist:', error)
      throw error
    }
  }

  const handleAlgorithmChange = (algorithm: keyof typeof ALGORITHM_CONFIGS) => {
    setState(prev => ({ ...prev, currentAlgorithm: algorithm }))
    generateNewPlaylist(state.tracks, algorithm)
  }

  const handleTrackSelect = (track: Track) => {
    setState(prev => ({ ...prev, currentTrack: track }))
  }

  const handleTrackEnd = () => {
    const currentIndex = state.playlist.findIndex(t => t.id === state.currentTrack?.id)
    if (currentIndex !== -1 && currentIndex < state.playlist.length - 1) {
      setState(prev => ({ ...prev, currentTrack: state.playlist[currentIndex + 1] }))
    }
  }

  if (state.isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🎧 The Algorithmic Ear</h1>
          <p>Loading how machines listen...</p>
          <p>Debug: {state.tracks.length} tracks loaded</p>
        </div>
      </div>
    )
  }

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])

  console.log('🎵 App rendering main content with', state.tracks.length, 'tracks and', state.playlist.length, 'playlist items')
  
  // Simple test to see if content renders
  if (state.tracks.length === 0) {
    return <div style={{padding: '20px', color: 'white', background: 'red'}}>NO TRACKS LOADED - This should not happen!</div>
  }

  // Debug: Show current state
  console.log('🎯 Current state:', {
    isLoading: state.isLoading,
    tracksCount: state.tracks.length,
    playlistCount: state.playlist.length,
    currentTrack: state.currentTrack?.name || 'none',
    error: state.error
  })
  
  try {
    return (
      <div className="app">
        {/* Debug overlay to confirm render */}
        <div style={{ 
          position: 'fixed', 
          top: 20, 
          left: 20, 
          color: 'lime', 
          backgroundColor: 'black',
          padding: '10px',
          zIndex: 9999,
          fontSize: '14px',
          border: '2px solid lime'
        }}>
          ✅ RENDERED: {state.tracks.length} tracks, {state.playlist.length} playlist
        </div>
        
        <motion.header 
          className="hero"
          style={{ y, opacity }}
        >
        <motion.h1
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
        >
          The Algorithmic Ear
        </motion.h1>
        <motion.p 
          className="subtitle"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
        >
          How Machines Listen (and Decide What Sounds Good)
        </motion.p>
        <motion.p 
          className="description"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
        >
          An interactive exploration of how algorithms shape musical taste through 
          Spotify data and machine reasoning.
        </motion.p>
        {state.error && (
          <motion.p 
            className="error-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {state.error}
          </motion.p>
        )}
      </motion.header>

      <main className="content">
        <ScrollSection>
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            If algorithms can shape what we hear, what happens when we teach them to listen?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            This project merges design, code, and cultural critique to show how 
            computational systems "listen" and make aesthetic judgments.
          </motion.p>
        </ScrollSection>

        <ScrollSection className="demo-section">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Interactive Demo
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Experience how different algorithms create playlists. Each algorithm 
            "listens" differently, optimizing for different musical features.
          </motion.p>

          <motion.div 
            className="algorithm-controls"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h3>Choose an Algorithm:</h3>
            <div className="algorithm-buttons">
              {Object.entries(ALGORITHM_CONFIGS).map(([key, config], index) => (
                <motion.button
                  key={key}
                  className={state.currentAlgorithm === key ? 'active' : ''}
                  onClick={() => handleAlgorithmChange(key as keyof typeof ALGORITHM_CONFIGS)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1, ease: "easeOut" }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {key === 'greedyDanceability' && 'Greedy: Most Danceable'}
                  {key === 'greedyEnergy' && 'Greedy: Most Energetic'}
                  {key === 'searchHappy' && 'Search: Happy Mood'}
                  {key === 'searchChill' && 'Search: Chill Mood'}
                  {key === 'clustering' && 'Clustering: Similar Tracks'}
                  {key === 'hybrid' && 'Hybrid: Mixed Approach'}
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div 
            className="visualization-container"
            initial={{ opacity: 1, scale: 1 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Temporarily disabled for debugging */}
            {/* <TasteSpaceVisualization
              tracks={state.tracks || []}
              currentTrack={state.currentTrack}
              playlist={state.playlist || []}
              onTrackSelect={handleTrackSelect}
              width={800}
              height={500}
            /> */}
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f0f0f0', borderRadius: '8px' }}>
              <h3>🎵 Visualization (Temporarily Disabled)</h3>
              <p>Found {state.tracks.length} tracks, {state.playlist.length} in playlist</p>
            </div>
          </motion.div>

          <motion.div 
            className="audio-container"
            initial={{ opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Temporarily disabled for debugging */}
            {/* <AudioPlayer
              track={state.currentTrack}
              autoPlay={false}
              onTrackEnd={handleTrackEnd}
            /> */}
            <div style={{ padding: '2rem', textAlign: 'center', background: '#1a1a2e', color: 'white', borderRadius: '8px' }}>
              <h3>🎧 Audio Player (Temporarily Disabled)</h3>
              <p>Current track: {state.currentTrack?.name || 'None'}</p>
            </div>
          </motion.div>

          <motion.div 
            className="playlist-info"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h3>Current Playlist ({state.playlist?.length || 0} tracks)</h3>
            <div className="playlist-tracks">
              {Array.isArray(state.playlist) && state.playlist.length > 0 ? (
                state.playlist.map((track, index) => (
                  <motion.div 
                    key={track.id || `track-${index}`}
                    className={`playlist-track ${track.id === state.currentTrack?.id ? 'current' : ''}`}
                    onClick={() => handleTrackSelect(track)}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.4 + index * 0.05, ease: "easeOut" }}
                    viewport={{ once: true, margin: "-100px" }}
                    whileHover={{ x: 10, scale: 1.02 }}
                  >
                    <span className="track-number">{index + 1}</span>
                    <span className="track-name">{track.name || 'Unknown Track'}</span>
                    <span className="track-artist">{track.artist || 'Unknown Artist'}</span>
                  </motion.div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                  Generating playlist...
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <PlaylistAnalysis tracks={state.tracks || []} playlist={state.playlist || []} />
          </motion.div>
        </ScrollSection>

        <ScrollSection className="theory-section">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Theory & Citations
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            This project draws from critical algorithm studies and music information retrieval 
            to examine how computational systems encode cultural assumptions about taste and preference.
          </motion.p>
          <motion.div 
            className="citations"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h3>Key References:</h3>
            <ul>
              <motion.li
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
                viewport={{ once: true, margin: "-100px" }}
              >
                Seaver, N. (2017). Algorithms as culture: Some tactics for the ethnography of algorithmic systems. <em>Big Data & Society, 4</em>(2), 1-12.
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
                viewport={{ once: true, margin: "-100px" }}
              >
                Goffey, A. (2008). Algorithm. In M. Fuller (Ed.), <em>Software Studies: A Lexicon</em> (pp. 15-20). MIT Press.
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.8, ease: "easeOut" }}
                viewport={{ once: true, margin: "-100px" }}
              >
                Louridas, P. (2020). <em>Algorithms</em>. MIT Press Essential Knowledge Series.
              </motion.li>
            </ul>
          </motion.div>
        </ScrollSection>
      </main>
    </div>
    )
  } catch (error) {
    console.error('🚨 Error rendering app:', error)
    return (
      <div style={{padding: '20px', color: 'white', background: 'red'}}>
        <h1>Rendering Error</h1>
        <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>State: {JSON.stringify(state, null, 2)}</p>
      </div>
    )
  }
}

export default App
