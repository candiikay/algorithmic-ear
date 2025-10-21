import React, { useEffect, useRef, useState } from 'react'
import type { Track } from '../types'

interface AudioPlayerProps {
  track: Track | null
  autoPlay?: boolean
  onTrackEnd?: () => void
}

export default function AudioPlayer({ track, autoPlay = true, onTrackEnd }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Reset state
    setError(null)
    setIsPlaying(false)

    if (!track?.preview) {
      setError('No preview available for this track')
      return
    }

    // Load new track
    audio.pause()
    audio.load()

    if (autoPlay) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setError('Click to play (autoplay blocked)')
        })
    }

    // Event listeners
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      onTrackEnd?.()
    }
    const handleError = () => {
      setError('Failed to load audio')
      setIsPlaying(false)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [track, autoPlay, onTrackEnd])

  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setError('Failed to play audio'))
    }
  }

  if (!track) {
    return (
      <div className="audio-player">
        <p>No track selected</p>
      </div>
    )
  }

  return (
    <div className="audio-player">
      <div className="track-info">
        <h3>{track.name}</h3>
        <p>by {track.artist}</p>
      </div>
      
      {error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={handlePlayPause} className="play-button">
            Try Again
          </button>
        </div>
      ) : (
        <div className="controls">
          <button onClick={handlePlayPause} className="play-button">
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <div className="track-features">
            <span>Danceability: {(track.danceability * 100).toFixed(0)}%</span>
            <span>Energy: {(track.energy * 100).toFixed(0)}%</span>
            <span>Valence: {(track.valence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      >
        {track.preview && <source src={track.preview} type="audio/mpeg" />}
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}
