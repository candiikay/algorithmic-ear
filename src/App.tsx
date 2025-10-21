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
      console.log('🚀 Starting data load on live site...')
      console.log('🌐 Current URL:', window.location.href)

      // Try to get real Spotify data
      console.log('🔑 Fetching token...')
      const tokenData = await getToken()
      console.log('🔑 Got token:', tokenData.access_token ? 'Yes' : 'No')
      
      console.log('🎵 Fetching recommendations...')
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie'],
        limit: 20
      })
      console.log('🎵 Got recommendations:', recommendations.tracks?.length || 0, 'tracks')
      
      if (recommendations.tracks && recommendations.tracks.length > 0) {
        console.log('🎵 First track:', recommendations.tracks[0].name, 'by', recommendations.tracks[0].artists?.[0]?.name)
      }
      
      // The custom recommendation engine already handles audio features internally
      // No need to fetch them again - just use the tracks directly
      console.log('🎼 Using tracks from custom recommendation engine (audio features already processed)')
      
      // Transform SpotifyTrack to Track type (the custom engine already includes audio features)
      const tracksAsTrackType = recommendations.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name || 'Unknown Artist',
        preview: track.preview_url || '',
        popularity: track.popularity || 50,
        // Audio features are already included by the custom recommendation engine
        // Use type assertion since we know the custom engine adds these properties
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
      console.log('📊 Final tracks:', normalizedTracks.length, 'tracks')
      
      setTracks(normalizedTracks)
      
      if (normalizedTracks.length > 0) {
        setCurrentTrack(normalizedTracks[0])
        generateNewPlaylist(normalizedTracks, currentAlgorithm)
        console.log('✅ Successfully loaded real Spotify data!')
      }
    } catch (err) {
      console.warn('❌ Spotify API failed, using fallback data:', err)
      setError('Using sample data (Spotify API unavailable)')
      
      // Use fallback data
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      setTracks(fallbackTracks)
      
      if (fallbackTracks.length > 0) {
        setCurrentTrack(fallbackTracks[0])
        generateNewPlaylist(fallbackTracks, currentAlgorithm)
      }
      console.log('🔄 Using fallback data')
    } finally {
      setIsLoading(false)
      console.log('🏁 Data loading complete')
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
