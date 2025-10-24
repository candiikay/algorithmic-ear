# The Algorithmic Ear 🎵

An interactive music recommendation system that demonstrates how algorithmic curation works by letting users explore a simplified greedy algorithm. This project explores the relationship between measurable audio features and subjective musical experience.

## 🎯 Project Overview

**The Algorithmic Ear** is a React-based web application that serves as both an educational tool and a critical examination of algorithmic music recommendation systems. It allows users to:

- Select audio features (danceability, energy, valence, etc.)
- Explore tracks using an interactive slider
- Experience how a greedy algorithm makes recommendations
- Understand the limitations of simple algorithmic approaches

## 🏗️ Architecture

### Core Technologies
- **React 18** with TypeScript
- **Vite** for build tooling
- **Spotify Web API** for track data (with fallback)
- **CSS-in-JS** for styling
- **Responsive Design** for mobile and desktop

### File Structure
```
src/
├── App.tsx                 # Main application component
├── components/
│   └── CustomDropdown.tsx  # Custom dropdown component
├── data/
│   └── infoContent.ts      # Static content and feature descriptions
├── lib/
│   └── spotify.ts          # Spotify API integration & fallback data
├── types/
│   └── index.ts            # TypeScript type definitions
└── index.css               # Global styles and animations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Spotify Developer Account (optional, uses fallback data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/candiikay/algorithmic-ear.git
   cd algorithmic-ear
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Spotify API (optional)**
   - Create a Spotify app at [developer.spotify.com](https://developer.spotify.com)
   - Add your client ID to `src/lib/spotify.ts`
   - The app works with fallback data if no API key is provided

4. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:5173`

## 🎵 How It Works

### Algorithm Implementation

The app implements a **greedy algorithm** for music recommendations:

1. **Feature Selection**: User selects an audio feature (danceability, energy, etc.)
2. **Slider Input**: User sets preferred intensity level (0.0-1.0)
3. **Similarity Calculation**: Algorithm finds tracks most similar to the slider value
4. **Recommendation**: Shows top 15 most similar tracks
5. **Next Track**: Displays the algorithm's next recommendation

### Key Features

- **30 Diverse Tracks**: Includes popular songs with varied audio characteristics
- **Real-time Updates**: Slider and track selection update recommendations instantly
- **Mobile Responsive**: Touch-friendly interface for mobile devices
- **Academic Framework**: Integrates cultural theory and algorithmic critique

## 📱 Mobile Optimization

The app is fully responsive with:
- Touch-friendly slider and track selection
- Mobile navigation menu
- Responsive typography and spacing
- Optimized card layouts for small screens

## 🎨 Design System

### Color Palette
- **Primary**: `#E0CDA9` (Gold accent)
- **Background**: `#0A0A0A` (Dark background)
- **Text**: `#FFFFFF` with opacity variations
- **Cards**: Glass morphism with blur effects

### Typography
- **Headers**: Fira Code (monospace)
- **Body**: System font stack
- **Responsive**: Scales from mobile to desktop

## 🔧 Development

### Code Organization

The main `App.tsx` file is organized into sections:

1. **State Management** - All React state variables
2. **Constants & Configuration** - Feature definitions and algorithms
3. **Effects & Data Loading** - useEffect hooks for data fetching
4. **Computed Values & Algorithm Logic** - useMemo for track sorting
5. **Event Handlers** - User interaction handlers
6. **Render Helpers** - Utility functions for rendering
7. **Main Render** - JSX structure

### Key Functions

- `handleSliderChange()` - Updates slider and selects tracks
- `sortedTracks` - Computed value that sorts tracks by similarity
- `renderFeatureStats()` - Displays track audio features
- `loadTracks()` - Fetches track data from Spotify API

### Adding New Features

1. **New Audio Features**: Add to `FEATURE_STATS` array
2. **New Algorithms**: Add to `ALGORITHMS` array and implement logic
3. **New Tracks**: Add to `FALLBACK_TRACKS` in `spotify.ts`
4. **UI Components**: Add to `components/` directory

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Deploy automatically on push to main branch
3. Environment variables are handled automatically

### Other Platforms
- **Netlify**: Works with standard React build
- **GitHub Pages**: Use `npm run build` and deploy `dist/` folder
- **Docker**: Create Dockerfile for containerized deployment

## 📚 Academic Context

This project integrates several academic frameworks:

- **Nick Seaver's "Algorithms as Culture"** - Understanding algorithms as cultural practice
- **Panos Louridas's "Algorithms"** - Foundational algorithmic concepts
- **Tarleton Gillespie's "The Relevance of Algorithms"** - Algorithmic power and authority

The app demonstrates how recommendation systems:
- Convert musical experience into computational decisions
- Prioritize measurable features over cultural context
- Create feedback loops that reinforce existing preferences
- Limit musical discovery through similarity-based matching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Credits

- **Author**: Candace Stewart
- **Academic Framework**: Nick Seaver, Panos Louridas, Tarleton Gillespie
- **Data Source**: Spotify Web API
- **Design**: Custom implementation with glass morphism

## 🔗 Links

- **Live Demo**: [Deployed on Vercel]
- **GitHub Repository**: [candiikay/algorithmic-ear]
- **Spotify API**: [developer.spotify.com]

---

*This project serves as both an educational tool and a critical examination of algorithmic music recommendation systems. It demonstrates how mathematical proximity doesn't guarantee emotional resonance, and how the features we can measure aren't always the features that matter most to listeners.*
