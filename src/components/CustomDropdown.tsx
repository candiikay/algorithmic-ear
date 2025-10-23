import React, { useState, useRef, useEffect } from 'react'

interface Option {
  id: string
  name: string
  disabled?: boolean
}

interface CustomDropdownProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  onMouseEnter, 
  onMouseLeave 
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.id === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div 
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '16px 24px',
          color: 'rgba(255, 255, 255, 0.95)',
          fontSize: '18px',
          fontWeight: '500',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          minWidth: '300px',
          height: '56px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ 
          textAlign: 'center', 
          width: '100%',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)'
        }}>
          {selectedOption?.name || 'Select Algorithm'}
        </span>
        <span style={{ 
          fontSize: '14px',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          position: 'absolute',
          right: '16px'
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          marginTop: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.id)
                  setIsOpen(false)
                }
              }}
              disabled={option.disabled}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: option.disabled 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'transparent',
                color: option.disabled 
                  ? 'rgba(255, 255, 255, 0.4)' 
                  : option.id === value 
                    ? '#E0CDA9' 
                    : 'rgba(255, 255, 255, 0.8)',
                fontSize: '18px',
                fontWeight: '500',
                textAlign: 'center',
                border: 'none',
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                opacity: option.disabled ? 0.6 : 1,
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                if (!option.disabled) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!option.disabled) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
