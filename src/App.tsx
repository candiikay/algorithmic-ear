import React, { useState, useEffect } from 'react'
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

function App() {
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
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const tokenData = await getToken()
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 20
      })
      
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
        {state.error && <p className="error-message">{state.error}</p>}
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
                className={state.currentAlgorithm === 'greedyDanceability' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('greedyDanceability')}
              >
                Greedy: Most Danceable
              </button>
              <button 
                className={state.currentAlgorithm === 'greedyEnergy' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('greedyEnergy')}
              >
                Greedy: Most Energetic
              </button>
              <button 
                className={state.currentAlgorithm === 'searchHappy' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('searchHappy')}
              >
                Search: Happy Mood
              </button>
              <button 
                className={state.currentAlgorithm === 'searchChill' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('searchChill')}
              >
                Search: Chill Mood
              </button>
              <button 
                className={state.currentAlgorithm === 'clustering' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('clustering')}
              >
                Clustering: Similar Tracks
              </button>
              <button 
                className={state.currentAlgorithm === 'hybrid' ? 'active' : ''}
                onClick={() => handleAlgorithmChange('hybrid')}
              >
                Hybrid: Mixed Approach
              </button>
            </div>
          </div>

          <div className="visualization-container">
            <TasteSpaceVisualization
              tracks={state.tracks}
              currentTrack={state.currentTrack}
              playlist={state.playlist}
              onTrackSelect={handleTrackSelect}
              width={800}
              height={500}
            />
          </div>

          <div className="audio-container">
            <AudioPlayer
              track={state.currentTrack}
              autoPlay={false}
              onTrackEnd={handleTrackEnd}
            />
          </div>

          <div className="playlist-info">
            <h3>Current Playlist ({state.playlist.length} tracks)</h3>
            <div className="playlist-tracks">
              {state.playlist.map((track, index) => (
                <div 
                  key={track.id}
                  className={`playlist-track ${track.id === state.currentTrack?.id ? 'current' : ''}`}
                  onClick={() => handleTrackSelect(track)}
                >
                  <span className="track-number">{index + 1}</span>
                  <span className="track-name">{track.name}</span>
                  <span className="track-artist">{track.artist}</span>
                </div>
              ))}
            </div>
          </div>

          <PlaylistAnalysis tracks={state.tracks} playlist={state.playlist} />
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
