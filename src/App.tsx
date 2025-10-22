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

  useEffect(() => {
    loadTracks()
  }, [])

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
      
      const normalizedTracks = normalizeFeatures(tracksAsTrackType)
      
      setState(prev => ({
        ...prev,
        tracks: normalizedTracks,
        currentTrack: normalizedTracks[0] || null,
        isLoading: false
      }))
      
      if (normalizedTracks.length > 0) {
        generateNewPlaylist(normalizedTracks, 'greedyDanceability')
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
    let newPlaylist: Track[] = []
    
    if (algorithm === 'clustering') {
      newPlaylist = generateClusteringPlaylist(trackPool, 8, 5)
    } else if (algorithm === 'hybrid') {
      newPlaylist = generateHybridPlaylist(trackPool, 8)
    } else {
      const config = { ...ALGORITHM_CONFIGS[algorithm] }
      newPlaylist = generatePlaylist(trackPool, config, 8)
    }
    
    setState(prev => ({ ...prev, playlist: newPlaylist }))
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
  
  return (
    <div className="app">
      <motion.header 
        className="hero"
        style={{ y, opacity }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          The Algorithmic Ear
        </motion.h1>
        <motion.p 
          className="subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          How Machines Listen (and Decide What Sounds Good)
        </motion.p>
        <motion.p 
          className="description"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
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
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <TasteSpaceVisualization
              tracks={state.tracks}
              currentTrack={state.currentTrack}
              playlist={state.playlist}
              onTrackSelect={handleTrackSelect}
              width={800}
              height={500}
            />
          </motion.div>

          <motion.div 
            className="audio-container"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <AudioPlayer
              track={state.currentTrack}
              autoPlay={false}
              onTrackEnd={handleTrackEnd}
            />
          </motion.div>

          <motion.div 
            className="playlist-info"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h3>Current Playlist ({state.playlist.length} tracks)</h3>
            <div className="playlist-tracks">
              {state.playlist.map((track, index) => (
                <motion.div 
                  key={track.id}
                  className={`playlist-track ${track.id === state.currentTrack?.id ? 'current' : ''}`}
                  onClick={() => handleTrackSelect(track)}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.4 + index * 0.05, ease: "easeOut" }}
                  viewport={{ once: true, margin: "-100px" }}
                  whileHover={{ x: 10, scale: 1.02 }}
                >
                  <span className="track-number">{index + 1}</span>
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">{track.artist}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <PlaylistAnalysis tracks={state.tracks} playlist={state.playlist} />
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
}

export default App
