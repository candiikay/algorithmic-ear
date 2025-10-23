import React, { useState, useEffect } from 'react'
import { getRecommendations } from './lib/spotify'
import type { Track } from './types'

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectedSong, setSelectedSong] = useState<Track | null>(null)
  const [nextSong, setNextSong] = useState<Track | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<keyof Track | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sliderValue, setSliderValue] = useState(0)

  // Load tracks
  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      const recommendations = await getRecommendations(['pop', 'electronic', 'indie', 'rock', 'hip-hop'], 100)
      setTracks(recommendations.tracks)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading tracks:', error)
      setIsLoading(false)
    }
  }

  // Get songs sorted by selected feature
  const getSortedTracks = () => {
    if (!selectedFeature) return tracks
    return [...tracks].sort((a, b) => {
      const aVal = a[selectedFeature] as number
      const bVal = b[selectedFeature] as number
      return aVal - bVal
    })
  }

  // Handle slider change
  const handleSliderChange = (value: number) => {
    setSliderValue(value)
    const sortedTracks = getSortedTracks()
    if (sortedTracks[value]) {
      setSelectedSong(sortedTracks[value])
    }
  }

  // Find next song when selected song changes
  useEffect(() => {
    if (selectedSong && selectedFeature) {
      const sortedTracks = getSortedTracks()
      const currentIndex = sortedTracks.findIndex(track => track.id === selectedSong.id)
      if (currentIndex >= 0 && currentIndex < sortedTracks.length - 1) {
        setNextSong(sortedTracks[currentIndex + 1])
      }
    }
  }, [selectedSong, selectedFeature])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        🎧 Loading your music...
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: 'white',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧 Greedy Listening</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
          Pick a song with a slider, then see what the algorithm suggests next
        </p>
      </header>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Step 1: Choose Feature */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>1. Choose a Feature</h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { key: 'danceability', label: '💃 Danceability', color: '#ff6b6b' },
              { key: 'energy', label: '⚡ Energy', color: '#4ecdc4' },
              { key: 'valence', label: '😊 Valence', color: '#45b7d1' },
              { key: 'tempo', label: '🎵 Tempo', color: '#96ceb4' },
              { key: 'acousticness', label: '🎸 Acousticness', color: '#feca57' }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedFeature(metric.key as keyof Track)
                  setSliderValue(0)
                  setSelectedSong(null)
                  setNextSong(null)
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '25px',
                  border: `2px solid ${selectedFeature === metric.key ? metric.color : 'rgba(255,255,255,0.2)'}`,
                  backgroundColor: selectedFeature === metric.key ? metric.color : 'rgba(255,255,255,0.1)',
                  color: selectedFeature === metric.key ? 'white' : 'rgba(255,255,255,0.8)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: selectedFeature === metric.key ? 'bold' : 'normal'
                }}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Slider */}
        {selectedFeature && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>
              2. Slide to Pick a Song by {selectedFeature}
            </h2>
            
            <div style={{
              width: '100%',
              height: '40px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              position: 'relative',
              margin: '20px 0'
            }}>
              <input
                type="range"
                min="0"
                max={getSortedTracks().length - 1}
                value={sliderValue}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '40px',
                  background: 'transparent',
                  outline: 'none',
                  cursor: 'pointer',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  margin: 0,
                  padding: 0,
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: `${(sliderValue / Math.max(1, getSortedTracks().length - 1)) * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                backgroundColor: '#667eea',
                borderRadius: '50%',
                border: '4px solid white',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }} />
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.7 }}>
              {getSortedTracks().length} songs available • Position {sliderValue + 1}
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {selectedSong && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>🎯 Your Selection</h2>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: nextSong ? '1fr auto 1fr' : '1fr', 
              gap: '2rem',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              {/* Selected Song */}
              <div style={{
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                padding: '25px',
                borderRadius: '15px',
                border: '3px solid #667eea'
              }}>
                <h3 style={{ marginBottom: '1rem', color: '#667eea', fontSize: '1.3rem' }}>Your Song</h3>
                <div style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                  <strong>{selectedSong.name}</strong><br />
                  <em style={{ opacity: 0.8 }}>{selectedSong.artist}</em>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.9rem' }}>
                  <div>💃 {(selectedSong.danceability * 100).toFixed(0)}%</div>
                  <div>⚡ {(selectedSong.energy * 100).toFixed(0)}%</div>
                  <div>😊 {(selectedSong.valence * 100).toFixed(0)}%</div>
                  <div>🎵 {(selectedSong.tempo * 100).toFixed(0)}%</div>
                  <div>🎸 {(selectedSong.acousticness * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Arrow */}
              {nextSong && (
                <>
                  <div style={{ fontSize: '2.5rem' }}>→</div>
                  
                  {/* Next Song */}
                  <div style={{
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    padding: '25px',
                    borderRadius: '15px',
                    border: '3px solid #ff6b6b'
                  }}>
                    <h3 style={{ marginBottom: '1rem', color: '#ff6b6b', fontSize: '1.3rem' }}>Next Song</h3>
                    <div style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                      <strong>{nextSong.name}</strong><br />
                      <em style={{ opacity: 0.8 }}>{nextSong.artist}</em>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '0.9rem' }}>
                      <div>💃 {(nextSong.danceability * 100).toFixed(0)}%</div>
                      <div>⚡ {(nextSong.energy * 100).toFixed(0)}%</div>
                      <div>😊 {(nextSong.valence * 100).toFixed(0)}%</div>
                      <div>🎵 {(nextSong.tempo * 100).toFixed(0)}%</div>
                      <div>🎸 {(nextSong.acousticness * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {nextSong && (
              <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>
                The greedy algorithm found the next song with the closest {selectedFeature} value!
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!selectedFeature && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '15px',
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            👆 Choose a feature above to start picking songs with the slider!
          </div>
        )}
      </div>
    </div>
  )
}

export default App