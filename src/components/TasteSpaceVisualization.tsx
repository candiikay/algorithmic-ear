import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { Track, VisualizationPoint } from '../types'

interface TasteSpaceVisualizationProps {
  tracks: Track[]
  currentTrack: Track | null
  playlist: Track[]
  width?: number
  height?: number
  onTrackSelect?: (track: Track) => void
}

export default function TasteSpaceVisualization({
  tracks,
  currentTrack,
  playlist,
  width = 600,
  height = 400,
  onTrackSelect
}: TasteSpaceVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null)

  useEffect(() => {
    if (!svgRef.current || tracks.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth])

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0])

    const sizeScale = d3.scaleLinear()
      .domain(d3.extent(tracks, d => d.popularity) as [number, number])
      .range([4, 20])

    // Create visualization points
    const points: VisualizationPoint[] = tracks.map(track => ({
      x: track.energy,
      y: track.valence,
      track,
      color: getColorForValence(track.valence),
      size: sizeScale(track.popularity)
    }))

    // Draw grid
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
      .style('opacity', 0.3)

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
      .style('opacity', 0.3)

    // Draw axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format('.1f')))
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 35)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .text('Energy')

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d3.format('.1f')))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -25)
      .attr('x', -innerHeight / 2)
      .attr('fill', 'currentColor')
      .style('text-anchor', 'middle')
      .text('Valence')

    // Draw playlist path
    if (playlist.length > 1) {
      const line = d3.line<VisualizationPoint>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveLinear)

      const playlistPoints = playlist.map(track => {
        const point = points.find(p => p.track.id === track.id)
        return point || { x: track.energy, y: track.valence, track, color: '', size: 0 }
      })

      g.append('path')
        .datum(playlistPoints)
        .attr('fill', 'none')
        .attr('stroke', '#667eea')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('d', line)
    }

    // Draw points
    g.selectAll('.track-point')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'track-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.track.id === currentTrack?.id ? '#333' : 'white')
      .attr('stroke-width', d => d.track.id === currentTrack?.id ? 3 : 1)
      .style('cursor', 'pointer')
      .style('opacity', d => playlist.some(p => p.id === d.track.id) ? 0.7 : 1)
      .on('click', (_, d) => {
        onTrackSelect?.(d.track)
      })
      .on('mouseover', (_, d) => {
        setHoveredTrack(d.track)
      })
      .on('mouseout', () => {
        setHoveredTrack(null)
      })

    // Tooltip
    if (hoveredTrack) {
      const tooltip = g.append('g')
        .attr('class', 'tooltip')
        .style('pointer-events', 'none')

      tooltip.append('rect')
        .attr('x', -5)
        .attr('y', -5)
        .attr('width', 200)
        .attr('height', 40)
        .attr('fill', 'rgba(0,0,0,0.8)')
        .attr('rx', 5)

      tooltip.append('text')
        .attr('x', 5)
        .attr('y', 15)
        .attr('fill', 'white')
        .style('font-size', '12px')
        .text(`${hoveredTrack.name} - ${hoveredTrack.artist}`)

      tooltip.append('text')
        .attr('x', 5)
        .attr('y', 30)
        .attr('fill', 'white')
        .style('font-size', '10px')
        .text(`E:${(hoveredTrack.energy * 100).toFixed(0)}% V:${(hoveredTrack.valence * 100).toFixed(0)}%`)
    }

  }, [tracks, currentTrack, playlist, width, height, onTrackSelect])

  return (
    <div className="taste-space-viz">
      <svg ref={svgRef} />
      {hoveredTrack && (
        <div className="track-details">
          <h4>{hoveredTrack.name}</h4>
          <p>{hoveredTrack.artist}</p>
        </div>
      )}
    </div>
  )
}

function getColorForValence(valence: number): string {
  const hue = valence * 120 // 0-120 degrees (red to green)
  const saturation = 70
  const lightness = 50
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
