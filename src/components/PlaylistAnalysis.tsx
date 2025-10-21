// Playlist analysis component inspired by SoundInsights
import React from 'react'
import type { Track } from '../types'

interface PlaylistAnalysisProps {
  tracks: Track[]
  playlist: Track[]
}

export default function PlaylistAnalysis({ tracks, playlist }: PlaylistAnalysisProps) {
  console.log('📊 PlaylistAnalysis received playlist:', playlist.length, 'tracks')
  console.log('📊 Playlist sample data:', playlist[0])
  console.log('📊 Playlist energy values:', playlist.map(t => t.energy))
  console.log('📊 Playlist valence values:', playlist.map(t => t.valence))
  console.log('📊 Playlist tempo values:', playlist.map(t => t.tempo))
  
  if (playlist.length === 0) return null

  // Calculate playlist statistics
  const stats = calculatePlaylistStats(playlist)
  console.log('📊 Calculated stats:', stats)
  
  const moodDistribution = calculateMoodDistribution(playlist)
  const tempoDistribution = calculateTempoDistribution(playlist)

  return (
    <div className="playlist-analysis">
      <h3>Playlist Analysis</h3>
      
      <div className="analysis-grid">
        <div className="stat-card">
          <h4>Average Energy</h4>
          <div className="stat-value">
            {(stats.avgEnergy * 100).toFixed(0)}%
          </div>
          <div className="stat-bar">
            <div 
              className="stat-fill" 
              style={{ width: `${stats.avgEnergy * 100}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Average Valence (Mood)</h4>
          <div className="stat-value">
            {stats.avgValence > 0.6 ? '😊 Happy' : 
             stats.avgValence > 0.4 ? '😐 Neutral' : '😔 Sad'}
          </div>
          <div className="stat-bar">
            <div 
              className="stat-fill" 
              style={{ width: `${stats.avgValence * 100}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Average Danceability</h4>
          <div className="stat-value">
            {(stats.avgDanceability * 100).toFixed(0)}%
          </div>
          <div className="stat-bar">
            <div 
              className="stat-fill" 
              style={{ width: `${stats.avgDanceability * 100}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <h4>Average Tempo</h4>
          <div className="stat-value">
            {stats.avgTempo.toFixed(0)} BPM
          </div>
          <div className="tempo-indicator">
            {stats.avgTempo < 80 ? '🐌 Slow' :
             stats.avgTempo < 120 ? '🚶 Moderate' : '🏃 Fast'}
          </div>
        </div>
      </div>

      <div className="mood-visualization">
        <h4>Mood Distribution</h4>
        <div className="mood-bars">
          {moodDistribution.map((mood, index) => (
            <div key={index} className="mood-bar">
              <span className="mood-label">{mood.label}</span>
              <div className="mood-bar-fill">
                <div 
                  className="mood-fill" 
                  style={{ 
                    width: `${mood.percentage}%`,
                    backgroundColor: mood.color
                  }}
                />
              </div>
              <span className="mood-count">{mood.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tempo-visualization">
        <h4>Tempo Distribution</h4>
        <div className="tempo-bars">
          {tempoDistribution.map((tempo, index) => (
            <div key={index} className="tempo-bar">
              <span className="tempo-label">{tempo.label}</span>
              <div className="tempo-bar-fill">
                <div 
                  className="tempo-fill" 
                  style={{ 
                    width: `${tempo.percentage}%`,
                    backgroundColor: tempo.color
                  }}
                />
              </div>
              <span className="tempo-count">{tempo.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function calculatePlaylistStats(playlist: Track[]) {
  if (playlist.length === 0) {
    return {
      avgEnergy: 0,
      avgValence: 0,
      avgDanceability: 0,
      avgTempo: 0
    }
  }

  const total = playlist.length
  const avgEnergy = playlist.reduce((sum, track) => sum + track.energy, 0) / total
  const avgValence = playlist.reduce((sum, track) => sum + track.valence, 0) / total
  const avgDanceability = playlist.reduce((sum, track) => sum + track.danceability, 0) / total
  const avgTempo = playlist.reduce((sum, track) => sum + track.tempo, 0) / total

  return { avgEnergy, avgValence, avgDanceability, avgTempo }
}

function calculateMoodDistribution(playlist: Track[]) {
  const moodRanges = [
    { label: 'Very Sad', min: 0, max: 0.2, color: '#1a237e' },
    { label: 'Sad', min: 0.2, max: 0.4, color: '#3949ab' },
    { label: 'Neutral', min: 0.4, max: 0.6, color: '#5c6bc0' },
    { label: 'Happy', min: 0.6, max: 0.8, color: '#7986cb' },
    { label: 'Very Happy', min: 0.8, max: 1.0, color: '#9c27b0' }
  ]

  return moodRanges.map(range => {
    const count = playlist.filter(track => 
      track.valence >= range.min && track.valence < range.max
    ).length
    return {
      ...range,
      count,
      percentage: playlist.length > 0 ? (count / playlist.length) * 100 : 0
    }
  })
}

function calculateTempoDistribution(playlist: Track[]) {
  const tempoRanges = [
    { label: 'Slow (< 80 BPM)', min: 0, max: 80, color: '#2e7d32' },
    { label: 'Moderate (80-120 BPM)', min: 80, max: 120, color: '#388e3c' },
    { label: 'Fast (> 120 BPM)', min: 120, max: 300, color: '#4caf50' }
  ]

  return tempoRanges.map(range => {
    const count = playlist.filter(track => 
      track.tempo >= range.min && track.tempo < range.max
    ).length
    return {
      ...range,
      count,
      percentage: playlist.length > 0 ? (count / playlist.length) * 100 : 0
    }
  })
}
