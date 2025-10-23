import React, { useState, useEffect } from 'react'
import type { Track } from './types'
import { getToken, getRecommendations, FALLBACK_TRACKS } from './lib/spotify'
import { normalizeFeatures } from './lib/transform'

interface AppState {
  isLoading: boolean
  tracks: Track[]
  selectedSong: Track | null
  selectedFeature: 'danceability' | 'energy' | 'valence' | 'tempo' | 'acousticness'
  greedyPlaylist: Track[]
  error: string | null
  searchQuery: string
  genreFilter: string
}

function App() {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    tracks: [],
    selectedSong: null,
    selectedFeature: 'danceability',
    greedyPlaylist: [],
    error: null,
    searchQuery: '',
    genreFilter: 'all'
  })

  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    setLoadingProgress(10)

    try {
      setLoadingProgress(20)
      const tokenData = await getToken()
      
      setLoadingProgress(40)
      const recommendations = await getRecommendations(tokenData.access_token, {
        genres: ['pop', 'electronic', 'indie', 'rock', 'hip-hop', 'jazz', 'classical', 'country', 'reggae', 'blues'],
        limit: 100
      })
      
      setLoadingProgress(70)
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
      
      setLoadingProgress(90)
      const normalizedTracks = normalizeFeatures(tracksAsTrackType)
      
      setLoadingProgress(100)
      setState(prev => ({
        ...prev,
        tracks: normalizedTracks,
        selectedSong: normalizedTracks[0] || null,
        isLoading: false
      }))
    } catch (err) {
      setLoadingProgress(100)
      const fallbackTracks = normalizeFeatures([...FALLBACK_TRACKS] as Track[])
      
      setState(prev => ({
        ...prev,
        tracks: fallbackTracks,
        selectedSong: fallbackTracks[0] || null,
        error: 'Using sample data (Spotify API unavailable)',
        isLoading: false
      }))
    }
  }

  // The core greedy algorithm
  const greedyNextSong = (seed: Track, candidates: Track[], feature: keyof Track): Track | null => {
    let closest: Track | null = null
    let minDiff = Infinity
    
    for (const track of candidates) {
      if (track.id === seed.id) continue // Skip the seed song
      
      const diff = Math.abs((track[feature] as number) - (seed[feature] as number))
      if (diff < minDiff) {
        closest = track
        minDiff = diff
      }
    }
    
    return closest
  }

  const findNextSong = () => {
    if (!state.selectedSong) return

    const availableTracks = state.tracks.filter(track => track.id !== state.selectedSong!.id)
    const nextSong = greedyNextSong(state.selectedSong, availableTracks, state.selectedFeature)
    
    if (nextSong) {
      setState(prev => ({ ...prev, greedyPlaylist: [state.selectedSong!, nextSong] }))
    }
  }

  const handleSongSelect = (song: Track) => {
    setState(prev => ({ ...prev, selectedSong: song, greedyPlaylist: [] }))
  }

  const handleFeatureChange = (feature: keyof Track) => {
    setState(prev => ({ ...prev, selectedFeature: feature as any, greedyPlaylist: [] }))
  }

  const getFilteredTracks = () => {
    let filtered = state.tracks

    // Filter by search query - much more flexible search
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(track => {
        const trackName = track.name.toLowerCase()
        const artistName = track.artist.toLowerCase()
        
        // Search by individual words
        const queryWords = query.split(' ').filter(word => word.length > 0)
        
        return queryWords.every(word => 
          trackName.includes(word) || 
          artistName.includes(word)
        )
      })
    }

    // Filter by genre using artist-based detection - MASSIVE MAPPING
    if (state.genreFilter !== 'all') {
      const artistToGenre: { [key: string]: string } = {
        // Pop (20 artists)
        'Taylor Swift': 'pop', 'Ariana Grande': 'pop', 'Billie Eilish': 'pop', 'Olivia Rodrigo': 'pop', 'Dua Lipa': 'pop',
        'Ed Sheeran': 'pop', 'Harry Styles': 'pop', 'Justin Bieber': 'pop', 'Selena Gomez': 'pop', 'Miley Cyrus': 'pop',
        'Lady Gaga': 'pop', 'Katy Perry': 'pop', 'Rihanna': 'pop', 'Beyoncé': 'pop', 'Adele': 'pop',
        'Bruno Mars': 'pop', 'The Weeknd': 'pop', 'Justin Timberlake': 'pop', 'P!nk': 'pop', 'Maroon 5': 'pop',
        
        // Electronic/Dance (20 artists)
        'Calvin Harris': 'electronic', 'The Chainsmokers': 'electronic', 'Marshmello': 'electronic', 'Skrillex': 'electronic', 'Deadmau5': 'electronic',
        'David Guetta': 'electronic', 'Martin Garrix': 'electronic', 'Avicii': 'electronic', 'Swedish House Mafia': 'electronic', 'Tiësto': 'electronic',
        'Armin van Buuren': 'electronic', 'Hardwell': 'electronic', 'Afrojack': 'electronic', 'Steve Aoki': 'electronic', 'Diplo': 'electronic',
        'Flume': 'electronic', 'Odesza': 'electronic', 'Porter Robinson': 'electronic', 'Madeon': 'electronic', 'Zedd': 'electronic',
        
        // Rock (25 artists)
        'The Beatles': 'rock', 'Queen': 'rock', 'Led Zeppelin': 'rock', 'Pink Floyd': 'rock', 'AC/DC': 'rock',
        'Rolling Stones': 'rock', 'The Who': 'rock', 'Nirvana': 'rock', 'Guns N Roses': 'rock', 'Metallica': 'rock',
        'U2': 'rock', 'Coldplay': 'rock', 'Radiohead': 'rock', 'Foo Fighters': 'rock', 'Red Hot Chili Peppers': 'rock',
        'Green Day': 'rock', 'Linkin Park': 'rock', 'Pearl Jam': 'rock', 'Soundgarden': 'rock', 'Alice in Chains': 'rock',
        'The Clash': 'rock', 'The Ramones': 'rock', 'Black Sabbath': 'rock', 'Deep Purple': 'rock', 'Jimi Hendrix': 'rock',
        
        // Hip-Hop/Rap (25 artists)
        'Drake': 'hip-hop', 'Kendrick Lamar': 'hip-hop', 'Travis Scott': 'hip-hop', 'Post Malone': 'hip-hop', 'Kanye West': 'hip-hop',
        'J. Cole': 'hip-hop', 'Eminem': 'hip-hop', 'Jay-Z': 'hip-hop', 'Nas': 'hip-hop', 'Tupac': 'hip-hop',
        'Biggie': 'hip-hop', 'Snoop Dogg': 'hip-hop', 'Dr. Dre': 'hip-hop', '50 Cent': 'hip-hop', 'Lil Wayne': 'hip-hop',
        'Future': 'hip-hop', 'Migos': 'hip-hop', 'Cardi B': 'hip-hop', 'Nicki Minaj': 'hip-hop', 'Lil Nas X': 'hip-hop',
        'Tyler, The Creator': 'hip-hop', 'A$AP Rocky': 'hip-hop', 'JID': 'hip-hop', 'Vince Staples': 'hip-hop', 'Anderson .Paak': 'hip-hop',
        
        // Indie/Alternative (20 artists)
        'Arctic Monkeys': 'indie', 'The 1975': 'indie', 'Tame Impala': 'indie', 'Lorde': 'indie', 'Phoebe Bridgers': 'indie',
        'Vampire Weekend': 'indie', 'Arcade Fire': 'indie', 'The Strokes': 'indie', 'Interpol': 'indie', 'Modest Mouse': 'indie',
        'Death Cab for Cutie': 'indie', 'Bon Iver': 'indie', 'Sufjan Stevens': 'indie', 'Fleet Foxes': 'indie', 'Beach House': 'indie',
        'Mac DeMarco': 'indie', 'King Gizzard': 'indie', 'Glass Animals': 'indie', 'Alt-J': 'indie',
        
        // Jazz (15 artists)
        'Miles Davis': 'jazz', 'John Coltrane': 'jazz', 'Ella Fitzgerald': 'jazz', 'Billie Holiday': 'jazz', 'Duke Ellington': 'jazz',
        'Louis Armstrong': 'jazz', 'Charlie Parker': 'jazz', 'Thelonious Monk': 'jazz', 'Dave Brubeck': 'jazz', 'Herbie Hancock': 'jazz',
        'Chick Corea': 'jazz', 'Pat Metheny': 'jazz', 'Wynton Marsalis': 'jazz', 'Diana Krall': 'jazz', 'Norah Jones': 'jazz',
        
        // Classical (15 artists)
        'Ludwig van Beethoven': 'classical', 'Wolfgang Amadeus Mozart': 'classical', 'Johann Sebastian Bach': 'classical', 'Pyotr Ilyich Tchaikovsky': 'classical', 'Frédéric Chopin': 'classical',
        'Franz Schubert': 'classical', 'Franz Liszt': 'classical', 'Richard Wagner': 'classical', 'Giuseppe Verdi': 'classical', 'Giacomo Puccini': 'classical',
        'Claude Debussy': 'classical', 'Maurice Ravel': 'classical', 'Igor Stravinsky': 'classical', 'Antonín Dvořák': 'classical', 'Gustav Mahler': 'classical',
        
        // Country (15 artists)
        'Johnny Cash': 'country', 'Dolly Parton': 'country', 'Willie Nelson': 'country', 'Luke Combs': 'country', 'Chris Stapleton': 'country',
        'Carrie Underwood': 'country', 'Miranda Lambert': 'country', 'Kacey Musgraves': 'country', 'Zac Brown Band': 'country', 'Florida Georgia Line': 'country',
        'Tim McGraw': 'country', 'Faith Hill': 'country', 'George Strait': 'country', 'Alan Jackson': 'country', 'Garth Brooks': 'country',
        
        // Reggae (10 artists)
        'Bob Marley': 'reggae', 'Peter Tosh': 'reggae', 'Jimmy Cliff': 'reggae', 'UB40': 'reggae', 'Sean Paul': 'reggae',
        'Shaggy': 'reggae', 'Damian Marley': 'reggae', 'Ziggy Marley': 'reggae', 'Burning Spear': 'reggae', 'Toots and the Maytals': 'reggae',
        
        // Blues (10 artists)
        'B.B. King': 'blues', 'Muddy Waters': 'blues', 'Howlin Wolf': 'blues', 'John Lee Hooker': 'blues', 'Etta James': 'blues',
        'Robert Johnson': 'blues', 'Albert King': 'blues', 'Freddie King': 'blues', 'Stevie Ray Vaughan': 'blues', 'Buddy Guy': 'blues',
        
        // R&B/Soul (15 artists)
        'Marvin Gaye': 'r&b', 'Stevie Wonder': 'r&b', 'Aretha Franklin': 'r&b', 'Ray Charles': 'r&b', 'Sam Cooke': 'r&b',
        'Otis Redding': 'r&b', 'Al Green': 'r&b', 'Curtis Mayfield': 'r&b', 'James Brown': 'r&b', 'Prince': 'r&b',
        'Michael Jackson': 'r&b', 'Whitney Houston': 'r&b', 'Luther Vandross': 'r&b', 'Anita Baker': 'r&b', 'Sade': 'r&b',
        
        // Latin (10 artists)
        'Shakira': 'latin', 'Ricky Martin': 'latin', 'Enrique Iglesias': 'latin', 'J Balvin': 'latin', 'Bad Bunny': 'latin',
        'Maluma': 'latin', 'Ozuna': 'latin', 'Daddy Yankee': 'latin', 'Wisin': 'latin', 'Yandel': 'latin',
        
        // K-Pop (10 artists)
        'BTS': 'k-pop', 'BLACKPINK': 'k-pop', 'TWICE': 'k-pop', 'Red Velvet': 'k-pop', 'EXO': 'k-pop',
        'NCT': 'k-pop', 'Stray Kids': 'k-pop', 'ITZY': 'k-pop', 'aespa': 'k-pop', 'NewJeans': 'k-pop',
        
        // World Music (10 artists)
        'Youssou N\'Dour': 'world', 'Salif Keita': 'world', 'Fela Kuti': 'world', 'Buena Vista Social Club': 'world', 'Ravi Shankar': 'world',
        'Ali Farka Touré': 'world', 'Amadou & Mariam': 'world', 'Tinariwen': 'world', 'Seun Kuti': 'world', 'Bombino': 'world'
      }
      
      filtered = filtered.filter(track => {
        const artistGenre = artistToGenre[track.artist] || 'pop'
        return artistGenre === state.genreFilter
      })
    }

    return filtered
  }

  const selectRandomSong = () => {
    const filteredTracks = getFilteredTracks()
    if (filteredTracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length)
      handleSongSelect(filteredTracks[randomIndex])
    }
  }

  if (state.isLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '2rem' }}>🎧 Greedy Listening</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>Loading how algorithms decide what sounds similar...</p>
        
        {/* Enhanced Progress Bar */}
        <div style={{ 
          width: '400px', 
          height: '12px', 
          backgroundColor: 'rgba(255,255,255,0.2)', 
          borderRadius: '6px',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: `${loadingProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '6px',
            transition: 'width 0.5s ease',
            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)',
            position: 'relative'
          }}>
            {/* Animated shine effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shine 2s infinite'
            }} />
          </div>
        </div>
        
        {/* Progress Percentage */}
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: '#667eea'
        }}>
          {loadingProgress}%
        </div>
        
        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
          {loadingProgress < 20 && '🔑 Getting access token...'}
          {loadingProgress >= 20 && loadingProgress < 40 && '🎵 Searching for music...'}
          {loadingProgress >= 40 && loadingProgress < 70 && '🎼 Processing tracks...'}
          {loadingProgress >= 70 && loadingProgress < 90 && '⚡ Generating features...'}
          {loadingProgress >= 90 && '✨ Almost ready...'}
        </p>
        
        {state.error && <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>Error: {state.error}</p>}
      </div>
    )
  }

  return (
    <>
      {/* Add CSS animation for shine effect */}
      <style>
        {`
          @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}
      </style>
      
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#1a1a2e',
        color: 'white',
        minHeight: '100vh'
      }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          🎧 Greedy Listening
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
          What happens when we let a greedy algorithm decide what we listen to next?
          <br />
          <em>Simulating Spotify's recommendation logic with one simple rule.</em>
        </p>
        {state.error && (
          <p style={{ color: '#ff6b6b', marginTop: '1rem' }}>
            ⚠️ {state.error}
          </p>
        )}
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* Song Selection */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>1. Choose Your Starting Song</h2>
          
          {/* Search and Filter Controls */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Try: 'Taylor', 'Drake', 'Beatles', 'jazz', 'classical'..."
                value={state.searchQuery || ''}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
              />
              
              {/* Search suggestions */}
              {state.searchQuery && state.searchQuery.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                    💡 Try searching for:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['Taylor', 'Drake', 'Beatles', 'BTS', 'Miles', 'Bach', 'Marley', 'Hendrix', 'jazz', 'k-pop', 'classical', 'rock', 'pop', 'electronic'].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setState(prev => ({ ...prev, searchQuery: suggestion }))}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'rgba(102, 126, 234, 0.2)',
                          border: '1px solid #667eea',
                          borderRadius: '4px',
                          color: '#667eea',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={state.genreFilter || 'all'}
                onChange={(e) => setState(prev => ({ ...prev, genreFilter: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.9)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                  e.target.style.backgroundColor = 'rgba(0,0,0,0.8)'
                }}
              >
                  <option value="all" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>All Genres</option>
                  <option value="pop" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Pop</option>
                  <option value="electronic" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Electronic</option>
                  <option value="rock" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Rock</option>
                  <option value="hip-hop" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Hip-Hop</option>
                  <option value="indie" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Indie</option>
                  <option value="jazz" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Jazz</option>
                  <option value="classical" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Classical</option>
                  <option value="country" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Country</option>
                  <option value="reggae" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Reggae</option>
                  <option value="blues" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Blues</option>
                  <option value="r&b" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>R&B/Soul</option>
                  <option value="latin" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>Latin</option>
                  <option value="k-pop" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>K-Pop</option>
                  <option value="world" style={{ backgroundColor: '#1a1a2e', color: 'white' }}>World Music</option>
              </select>
              
              <button
                onClick={selectRandomSong}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ff6b6b',
                  backgroundColor: 'rgba(255, 107, 107, 0.2)',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                🎲 Random Song
              </button>
            </div>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {getFilteredTracks().slice(0, 30).map((track, index) => (
              <div 
                key={track.id}
                onClick={() => handleSongSelect(track)}
                style={{ 
                  padding: '12px', 
                  margin: '5px 0', 
                  backgroundColor: track.id === state.selectedSong?.id ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: track.id === state.selectedSong?.id ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.2s ease',
                  transform: track.id === state.selectedSong?.id ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (track.id !== state.selectedSong?.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.transform = 'scale(1.01)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (track.id !== state.selectedSong?.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{track.name}</strong>
                    <br />
                    <em style={{ fontSize: '12px', opacity: 0.8 }}>{track.artist}</em>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.7 }}>
                    <div>💃 {(track.danceability * 100).toFixed(0)}%</div>
                    <div>⚡ {(track.energy * 100).toFixed(0)}%</div>
                    <div>😊 {(track.valence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Selection */}
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>2. Choose What Makes Songs "Similar"</h2>
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '1rem' }}>
            The algorithm will find the song with the closest value for this feature.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { key: 'danceability', label: '💃 Danceability', desc: 'How danceable', emoji: '💃' },
              { key: 'energy', label: '⚡ Energy', desc: 'How energetic', emoji: '⚡' },
              { key: 'valence', label: '😊 Valence', desc: 'How happy/sad', emoji: '😊' },
              { key: 'tempo', label: '🎵 Tempo', desc: 'How fast', emoji: '🎵' },
              { key: 'acousticness', label: '🎸 Acousticness', desc: 'How acoustic', emoji: '🎸' }
            ].map(feature => (
              <label key={feature.key} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '15px',
                backgroundColor: state.selectedFeature === feature.key ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.05)',
                borderRadius: '10px',
                cursor: 'pointer',
                border: state.selectedFeature === feature.key ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                transform: state.selectedFeature === feature.key ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (state.selectedFeature !== feature.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.transform = 'scale(1.01)'
                }
              }}
              onMouseLeave={(e) => {
                if (state.selectedFeature !== feature.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.transform = 'scale(1)'
                }
              }}
              >
                <input
                  type="radio"
                  name="feature"
                  value={feature.key}
                  checked={state.selectedFeature === feature.key}
                  onChange={() => handleFeatureChange(feature.key as any)}
                  style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {feature.label}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {feature.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          onClick={findNextSong}
          disabled={!state.selectedSong}
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            backgroundColor: state.selectedSong ? '#667eea' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: state.selectedSong ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          🎯 Find Next Song
        </button>
      </div>

      {/* Next Song Result */}
      {state.greedyPlaylist.length === 2 && (
        <div style={{ 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>
            🎵 Greedy Algorithm Says: "Play This Next"
          </h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            <strong>Algorithm:</strong> Found the song with the closest {state.selectedFeature} value to your selection.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Original Song */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              border: '2px solid #667eea'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#667eea' }}>🎧 Your Song</h3>
              <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                <strong>{state.greedyPlaylist[0].name}</strong>
                <br />
                <em>{state.greedyPlaylist[0].artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature}: {((state.greedyPlaylist[0][state.selectedFeature] as number) * 100).toFixed(0)}%
              </div>
            </div>

            {/* Next Song */}
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(46, 204, 113, 0.2)',
              borderRadius: '8px',
              border: '2px solid #2ecc71'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2ecc71' }}>➡️ Next Song</h3>
              <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
                <strong>{state.greedyPlaylist[1].name}</strong>
                <br />
                <em>{state.greedyPlaylist[1].artist}</em>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {state.selectedFeature}: {((state.greedyPlaylist[1][state.selectedFeature] as number) * 100).toFixed(0)}%
                <br />
                <strong>Difference:</strong> {Math.abs((state.greedyPlaylist[1][state.selectedFeature] as number) - (state.greedyPlaylist[0][state.selectedFeature] as number)).toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Section */}
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>🤔 What This Shows</h2>
        <div style={{ lineHeight: '1.6' }}>
          <p>
            <strong>Algorithmic Convergence:</strong> Notice how the {state.selectedFeature} values get closer and closer together as the playlist progresses. This is the greedy algorithm optimizing for similarity.
          </p>
          <p>
            <strong>Cultural Flattening:</strong> By always choosing the "most similar" song, the algorithm creates a narrow, predictable listening experience. Real discovery requires surprise and diversity.
          </p>
          <p>
            <strong>Optimization vs. Discovery:</strong> This demonstrates how algorithmic systems prioritize engagement and similarity over cultural exploration and serendipity.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

export default App