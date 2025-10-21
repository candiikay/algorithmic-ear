// Algorithm implementations for playlist generation
import type { Track, AlgorithmConfig } from '../types'
import { kMeansClustering, findSimilarTracks, findClusterTracks, cosineSimilarity } from './clustering'

export function greedyNext(
  current: Track, 
  pool: Track[], 
  weight: (track: Track) => number = (t) => t.danceability
): Track | null {
  const candidates = pool.filter(t => t.id !== current.id)
  if (candidates.length === 0) return null

  return candidates.reduce((best, track) => 
    weight(track) > weight(best) ? track : best, 
    candidates[0]
  )
}

export function nearestByVector(
  current: Track, 
  pool: Track[], 
  target: Partial<Pick<Track, 'energy' | 'valence' | 'danceability'>> = { energy: 0.7, valence: 0.7 },
  keys: Array<keyof Pick<Track, 'energy' | 'valence' | 'danceability'>> = ['energy', 'valence']
): Track | null {
  const candidates = pool.filter(t => t.id !== current.id)
  if (candidates.length === 0) return null

  const distance = (a: Track, b: Track | Partial<Track>) => {
    return Math.sqrt(
      keys.reduce((sum, key) => {
        const aVal = a[key] ?? 0
        const bVal = (b as any)[key] ?? 0
        return sum + Math.pow(aVal - bVal, 2)
      }, 0)
    )
  }

  const result = candidates.reduce((best, track) => {
    const targetDistance = distance(track, target)
    const currentDistance = distance(track, current) * 0.25 // Small penalty for distance from current
    const totalScore = targetDistance + currentDistance

    return totalScore < best.score 
      ? { track, score: totalScore } 
      : best
  }, { track: candidates[0], score: Infinity })

  return result.track
}

export function generatePlaylist(
  tracks: Track[], 
  config: AlgorithmConfig, 
  length: number = 10
): Track[] {
  if (tracks.length === 0) return []
  
  const playlist: Track[] = []
  const availableTracks = [...tracks]
  
  // Start with a random track
  const startIndex = Math.floor(Math.random() * availableTracks.length)
  let current = availableTracks.splice(startIndex, 1)[0]
  playlist.push(current)

  for (let i = 1; i < length && availableTracks.length > 0; i++) {
    let next: Track | null = null

    if (config.mode === 'greedy') {
      const weight = config.weight || ((t: Track) => t.danceability)
      next = greedyNext(current, availableTracks, weight)
    } else if (config.mode === 'search') {
      const target = config.target || { energy: 0.7, valence: 0.7 }
      const keys = config.keys || ['energy', 'valence']
      next = nearestByVector(current, availableTracks, target, keys)
    }

    if (next) {
      const nextIndex = availableTracks.findIndex(t => t.id === next!.id)
      if (nextIndex !== -1) {
        current = availableTracks.splice(nextIndex, 1)[0]
        playlist.push(current)
      }
    } else {
      // Fallback: pick random if algorithm fails
      const randomIndex = Math.floor(Math.random() * availableTracks.length)
      current = availableTracks.splice(randomIndex, 1)[0]
      playlist.push(current)
    }
  }

  return playlist
}

// Advanced clustering-based algorithm inspired by the repository
export function generateClusteringPlaylist(
  tracks: Track[], 
  length: number = 10,
  clusterCount: number = 5
): Track[] {
  if (tracks.length === 0) return []
  
  // Create clusters
  const clusters = kMeansClustering(tracks, clusterCount)
  
  const playlist: Track[] = []
  const availableTracks = [...tracks]
  
  // Start with a random track
  const startIndex = Math.floor(Math.random() * availableTracks.length)
  let current = availableTracks.splice(startIndex, 1)[0]
  playlist.push(current)

  for (let i = 1; i < length && availableTracks.length > 0; i++) {
    // Find similar tracks using cosine similarity
    const similarTracks = findSimilarTracks(current, availableTracks, 5)
    
    if (similarTracks.length > 0) {
      // Pick the most similar track
      const next = similarTracks[0].track
      const nextIndex = availableTracks.findIndex(t => t.id === next.id)
      if (nextIndex !== -1) {
        current = availableTracks.splice(nextIndex, 1)[0]
        playlist.push(current)
      }
    } else {
      // Fallback: pick random
      const randomIndex = Math.floor(Math.random() * availableTracks.length)
      current = availableTracks.splice(randomIndex, 1)[0]
      playlist.push(current)
    }
  }

  return playlist
}

// Hybrid algorithm combining multiple approaches
export function generateHybridPlaylist(
  tracks: Track[], 
  length: number = 10
): Track[] {
  if (tracks.length === 0) return []
  
  const playlist: Track[] = []
  const availableTracks = [...tracks]
  
  // Start with a random track
  const startIndex = Math.floor(Math.random() * availableTracks.length)
  let current = availableTracks.splice(startIndex, 1)[0]
  playlist.push(current)

  for (let i = 1; i < length && availableTracks.length > 0; i++) {
    let next: Track | null = null
    
    // Alternate between different strategies
    if (i % 3 === 1) {
      // Use similarity-based approach
      const similarTracks = findSimilarTracks(current, availableTracks, 3)
      if (similarTracks.length > 0) {
        next = similarTracks[0].track
      }
    } else if (i % 3 === 2) {
      // Use greedy approach for energy
      next = greedyNext(current, availableTracks, (t) => t.energy)
    } else {
      // Use search approach for valence
      next = nearestByVector(current, availableTracks, { valence: 0.6 }, ['valence'])
    }

    if (next) {
      const nextIndex = availableTracks.findIndex(t => t.id === next!.id)
      if (nextIndex !== -1) {
        current = availableTracks.splice(nextIndex, 1)[0]
        playlist.push(current)
      }
    } else {
      // Fallback: pick random
      const randomIndex = Math.floor(Math.random() * availableTracks.length)
      current = availableTracks.splice(randomIndex, 1)[0]
      playlist.push(current)
    }
  }

  return playlist
}

// Predefined algorithm configurations
export const ALGORITHM_CONFIGS = {
  greedyDanceability: {
    mode: 'greedy' as const,
    weight: (track: Track) => track.danceability
  },
  greedyEnergy: {
    mode: 'greedy' as const,
    weight: (track: Track) => track.energy
  },
  greedyValence: {
    mode: 'greedy' as const,
    weight: (track: Track) => track.valence
  },
  searchHappy: {
    mode: 'search' as const,
    target: { energy: 0.8, valence: 0.8 },
    keys: ['energy', 'valence'] as Array<keyof Pick<Track, 'energy' | 'valence' | 'danceability'>>
  },
  searchSad: {
    mode: 'search' as const,
    target: { energy: 0.3, valence: 0.2 },
    keys: ['energy', 'valence'] as Array<keyof Pick<Track, 'energy' | 'valence' | 'danceability'>>
  },
  searchChill: {
    mode: 'search' as const,
    target: { energy: 0.4, valence: 0.6 },
    keys: ['energy', 'valence'] as Array<keyof Pick<Track, 'energy' | 'valence' | 'danceability'>>
  },
  clustering: {
    mode: 'clustering' as const
  },
  hybrid: {
    mode: 'hybrid' as const
  }
} as const
