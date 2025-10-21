// Data transformation utilities
import type { Track, SpotifyTrack, AudioFeatures } from '../types'

export function joinTracksWithFeatures(
  tracks: SpotifyTrack[], 
  features: (AudioFeatures | null)[]
): Track[] {
  const featuresMap = new Map(
    features
      .filter((f): f is AudioFeatures => f !== null)
      .map(f => [f.id, f])
  )

  return tracks
    .map(track => {
      const audioFeatures = featuresMap.get(track.id)
      if (!audioFeatures) return null

      return {
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name ?? 'Unknown Artist',
        preview: track.preview_url,
        popularity: track.popularity,
        // Audio features
        danceability: audioFeatures.danceability,
        energy: audioFeatures.energy,
        valence: audioFeatures.valence,
        tempo: audioFeatures.tempo,
        acousticness: audioFeatures.acousticness,
        instrumentalness: audioFeatures.instrumentalness,
        liveness: audioFeatures.liveness,
        speechiness: audioFeatures.speechiness,
        loudness: audioFeatures.loudness,
        mode: audioFeatures.mode,
        key: audioFeatures.key,
        time_signature: audioFeatures.time_signature
      } as Track
    })
    .filter((track): track is Track => track !== null && track.preview !== null)
}

export function normalizeFeatures(tracks: Track[]): Track[] {
  return tracks.map(track => ({
    ...track,
    // Normalize features to 0-1 range where needed
    tempo: Math.min(track.tempo / 200, 1), // Assume max tempo of 200 BPM
    loudness: Math.max(0, (track.loudness + 60) / 60), // Normalize loudness (-60 to 0 dB)
  }))
}

export function createVisualizationPoints(tracks: Track[]): Array<{
  x: number
  y: number
  track: Track
  color: string
  size: number
}> {
  return tracks.map(track => ({
    x: track.energy,
    y: track.valence,
    track,
    color: getColorForValence(track.valence),
    size: Math.max(5, track.popularity / 10) // Scale popularity to size
  }))
}

function getColorForValence(valence: number): string {
  // Map valence (0-1) to color spectrum
  // Low valence = cool colors, high valence = warm colors
  const hue = valence * 120 // 0-120 degrees (red to green)
  const saturation = 70
  const lightness = 50
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
