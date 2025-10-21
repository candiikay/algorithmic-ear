// Clustering and similarity-based recommendation algorithms
// Inspired by: https://github.com/unkletam/Spotify-Recommendation-System

import type { Track } from '../types'

export interface Cluster {
  id: number
  center: number[]
  tracks: Track[]
}

export interface SimilarityResult {
  track: Track
  similarity: number
}

// K-means clustering implementation
export function kMeansClustering(tracks: Track[], k: number = 5, maxIterations: number = 100): Cluster[] {
  if (tracks.length === 0) return []
  
  // Extract audio features for clustering
  const features = tracks.map(track => [
    track.danceability,
    track.energy,
    track.valence,
    track.acousticness,
    track.instrumentalness,
    track.liveness,
    track.speechiness,
    track.tempo / 200, // Normalize tempo
    track.loudness / 60, // Normalize loudness
    track.popularity / 100 // Normalize popularity
  ])

  // Initialize centroids randomly
  let centroids = initializeCentroids(features, k)
  let clusters: Cluster[] = []
  let iterations = 0

  while (iterations < maxIterations) {
    // Assign tracks to nearest centroid
    clusters = assignTracksToClusters(tracks, features, centroids)
    
    // Update centroids
    const newCentroids = updateCentroids(clusters, features[0].length)
    
    // Check for convergence
    if (hasConverged(centroids, newCentroids)) {
      break
    }
    
    centroids = newCentroids
    iterations++
  }

  return clusters
}

// Calculate cosine similarity between two feature vectors
export function cosineSimilarity(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) return 0
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0
  
  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i]
    norm1 += features1[i] * features1[i]
    norm2 += features2[i] * features2[i]
  }
  
  if (norm1 === 0 || norm2 === 0) return 0
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

// Find similar tracks using cosine similarity
export function findSimilarTracks(
  targetTrack: Track, 
  candidateTracks: Track[], 
  limit: number = 10
): SimilarityResult[] {
  const targetFeatures = extractFeatures(targetTrack)
  
  const similarities = candidateTracks
    .filter(track => track.id !== targetTrack.id)
    .map(track => ({
      track,
      similarity: cosineSimilarity(targetFeatures, extractFeatures(track))
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
  
  return similarities
}

// Find tracks in the same cluster
export function findClusterTracks(
  targetTrack: Track, 
  clusters: Cluster[], 
  limit: number = 10
): Track[] {
  // Find which cluster the target track belongs to
  const targetCluster = clusters.find(cluster => 
    cluster.tracks.some(track => track.id === targetTrack.id)
  )
  
  if (!targetCluster) return []
  
  // Return other tracks from the same cluster
  return targetCluster.tracks
    .filter(track => track.id !== targetTrack.id)
    .slice(0, limit)
}

// Extract normalized features from a track
function extractFeatures(track: Track): number[] {
  return [
    track.danceability,
    track.energy,
    track.valence,
    track.acousticness,
    track.instrumentalness,
    track.liveness,
    track.speechiness,
    track.tempo / 200, // Normalize tempo
    track.loudness / 60, // Normalize loudness
    track.popularity / 100 // Normalize popularity
  ]
}

// Initialize centroids randomly
function initializeCentroids(features: number[][], k: number): number[][] {
  const centroids: number[][] = []
  const featureCount = features[0].length
  
  for (let i = 0; i < k; i++) {
    const centroid: number[] = []
    for (let j = 0; j < featureCount; j++) {
      // Random value between min and max of this feature
      const values = features.map(f => f[j])
      const min = Math.min(...values)
      const max = Math.max(...values)
      centroid.push(min + Math.random() * (max - min))
    }
    centroids.push(centroid)
  }
  
  return centroids
}

// Assign tracks to nearest centroid
function assignTracksToClusters(
  tracks: Track[], 
  features: number[][], 
  centroids: number[][]
): Cluster[] {
  const clusters: Cluster[] = centroids.map((_, index) => ({
    id: index,
    center: centroids[index],
    tracks: []
  }))
  
  features.forEach((featureVector, trackIndex) => {
    let bestCluster = 0
    let bestDistance = Infinity
    
    centroids.forEach((centroid, centroidIndex) => {
      const distance = euclideanDistance(featureVector, centroid)
      if (distance < bestDistance) {
        bestDistance = distance
        bestCluster = centroidIndex
      }
    })
    
    clusters[bestCluster].tracks.push(tracks[trackIndex])
  })
  
  return clusters
}

// Update centroids based on assigned tracks
function updateCentroids(clusters: Cluster[], featureCount: number): number[][] {
  return clusters.map(cluster => {
    if (cluster.tracks.length === 0) return cluster.center
    
    const newCenter: number[] = []
    for (let i = 0; i < featureCount; i++) {
      const sum = cluster.tracks.reduce((acc, track) => {
        const features = extractFeatures(track)
        return acc + features[i]
      }, 0)
      newCenter.push(sum / cluster.tracks.length)
    }
    
    return newCenter
  })
}

// Check if centroids have converged
function hasConverged(oldCentroids: number[][], newCentroids: number[][], threshold: number = 0.001): boolean {
  for (let i = 0; i < oldCentroids.length; i++) {
    for (let j = 0; j < oldCentroids[i].length; j++) {
      if (Math.abs(oldCentroids[i][j] - newCentroids[i][j]) > threshold) {
        return false
      }
    }
  }
  return true
}

// Calculate Euclidean distance between two vectors
function euclideanDistance(vector1: number[], vector2: number[]): number {
  let sum = 0
  for (let i = 0; i < vector1.length; i++) {
    sum += Math.pow(vector1[i] - vector2[i], 2)
  }
  return Math.sqrt(sum)
}
