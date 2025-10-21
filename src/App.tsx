import React, { useState, useEffect } from 'react'
import AudioPlayer from './components/AudioPlayer'
import TasteSpaceVisualization from './components/TasteSpaceVisualization'
import PlaylistAnalysis from './components/PlaylistAnalysis'
import type { Track } from './types'
import { getToken, getRecommendations, getAudioFeatures, FALLBACK_TRACKS } from './lib/spotify'
import { joinTracksWithFeatures, normalizeFeatures } from './lib/transform'
import { generatePlaylist, generateClusteringPlaylist, generateHybridPlaylist, ALGORITHM_CONFIGS } from './lib/algorithms'
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [playlist, setPlaylist] = useState<Track[]>([])
  const [currentAlgorithm, setCurrentAlgorithm] = useState<keyof typeof ALGORITHM_CONFIGS>('greedyDanceability')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Try to get real Spotify data
      const tokenData = await getToken()
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 20
      })
      
      const trackIds = recommendations.tracks.map(t => t.id)
      const audioFeatures = await getAudioFeatures(tokenData.access_token, trackIds)
      
      const joinedTracks = joinTracksWithFeatures(recommendations.tracks, audioFeatures.audio_features)
      const normalizedTracks = normalizeFeatures(joinedTracks)
      
      setTracks(normalizedTracks)
      
      if (normalizedTracks.length > 0) {
        setCurrentTrack(normalizedTracks[0])
        generateNewPlaylist(normalizedTracks, currentAlgorithm)
      }
    } catch (err) {
      console.warn('Spotify API failed, using fallback data:', err)
      setError('Using sample data (Spotify API unavailable)')
      
      // Use fallback data
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      setTracks(fallbackTracks)
      
      if (fallbackTracks.length > 0) {
        setCurrentTrack(fallbackTracks[0])
        generateNewPlaylist(fallbackTracks, currentAlgorithm)
      }
    } finally {
      setIsLoading(false)
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
    
    setPlaylist(newPlaylist)
  }

  const handleAlgorithmChange = (algorithm: keyof typeof ALGORITHM_CONFIGS) => {
    setCurrentAlgorithm(algorithm)
    generateNewPlaylist(tracks, algorithm)
  }

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track)
  }

  const handleTrackEnd = () => {
    // Auto-advance to next track in playlist
    const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id)
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      setCurrentTrack(playlist[currentIndex + 1])
    }
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>🎧 The Algorithmic Ear</h1>
          <p>Loading how machines listen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>The Algorithmic Ear</h1>
        <p className="subtitle">How Machines Listen (and Decide What Sounds Good)</p>
        <p className="description">
          An interactive exploration of how algorithms shape musical taste through 
          Spotify data and machine reasoning.
        </p>
        {error && <p className="error-message">{error}</p>}
      </header>

      <main className="content">
        <section className="intro">
          <h2>If algorithms can shape what we hear, what happens when we teach them to listen?</h2>
          <p>
            This project merges design, code, and cultural critique to show how 
            computational systems "listen" and make aesthetic judgments.
          </p>
        </section>

        <section className="demo-section">
          <h2>Interactive Demo</h2>
          <p>
            Experience how different algorithms create playlists. Each algorithm 
            "listens" differently, optimizing for different musical features.
          </p>

          <div className="algorithm-controls">
            <h3>Choose an Algorithm:</h3>
            <div className="algorithm-buttons">
              <button 
                className={currentAlgorithm === 'greedyDanceability' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('greedyDanceability')}
              >
                Greedy: Most Danceable
              </button>
              <button 
                className={currentAlgorithm === 'greedyEnergy' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('greedyEnergy')}
              >
                Greedy: Most Energetic
              </button>
              <button 
                className={currentAlgorithm === 'searchHappy' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('searchHappy')}
              >
                Search: Happy Mood
              </button>
              <button 
                className={currentAlgorithm === 'searchChill' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('searchChill')}
              >
                Search: Chill Mood
              </button>
              <button 
                className={currentAlgorithm === 'clustering' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('clustering')}
              >
                Clustering: Similar Tracks
              </button>
              <button 
                className={currentAlgorithm === 'hybrid' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('hybrid')}
              >
                Hybrid: Mixed Approach
              </button>
            </div>
          </div>

          <div className="visualization-container">
            <TasteSpaceVisualization
              tracks={tracks}
              currentTrack={currentTrack}
              playlist={playlist}
              onTrackSelect={handleTrackSelect}
              width={800}
              height={500}
            />
          </div>

          <div className="audio-container">
            <AudioPlayer
              track={currentTrack}
              autoPlay={false}
              onTrackEnd={handleTrackEnd}
            />
          </div>

          <div className="playlist-info">
            <h3>Current Playlist ({playlist.length} tracks)</h3>
            <div className="playlist-tracks">
              {playlist.map((track, index) => (
                <div 
                  key={track.id}
                  className={`playlist-track ${track.id === currentTrack?.id ? 'current' : ''}`}
                  onClick={() => setCurrentTrack(track)}
                >
                  <span className="track-number">{index + 1}</span>
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">{track.artist}</span>
                </div>
              ))}
            </div>
          </div>

          <PlaylistAnalysis tracks={tracks} playlist={playlist} />
        </section>

        <section className="theory-section">
          <h2>Theory & Citations</h2>
          <p>
            This project draws from critical algorithm studies and music information retrieval 
            to examine how computational systems encode cultural assumptions about taste and preference.
          </p>
          <div className="citations">
            <h3>Key References:</h3>
            <ul>
              <li>Seaver, N. (2017). Algorithms as culture: Some tactics for the ethnography of algorithmic systems. <em>Big Data & Society, 4</em>(2), 1-12.</li>
              <li>Goffey, A. (2008). Algorithm. In M. Fuller (Ed.), <em>Software Studies: A Lexicon</em> (pp. 15-20). MIT Press.</li>
              <li>Louridas, P. (2020). <em>Algorithms</em>. MIT Press Essential Knowledge Series.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
