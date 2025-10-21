// Type definitions for The Algorithmic Ear

export interface Track {
  id: string
  name: string
  artist: string
  preview: string | null
  popularity: number
  // Audio features
  danceability: number
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  liveness: number
  speechiness: number
  loudness: number
  mode: number
  key: number
  time_signature: number
}

export interface AudioFeatures {
  id: string
  danceability: number
  energy: number
  valence: number
  tempo: number
  acousticness: number
  instrumentalness: number
  liveness: number
  speechiness: number
  loudness: number
  mode: number
  key: number
  time_signature: number
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string | null
  popularity: number
}

export interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[]
}

export interface SpotifyAudioFeaturesResponse {
  audio_features: (AudioFeatures | null)[]
}

export interface TokenResponse {
  access_token: string
  expires_in: number
}

export interface AlgorithmConfig {
  mode: 'greedy' | 'search'
  weight?: (track: Track) => number
  target?: Partial<Pick<Track, 'energy' | 'valence' | 'danceability'>>
  keys?: Array<keyof Pick<Track, 'energy' | 'valence' | 'danceability'>>
}

export interface VisualizationPoint {
  x: number
  y: number
  track: Track
  color: string
  size: number
}
