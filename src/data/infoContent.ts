export const INFO_CONTENT = {
  project: {
    label: "The Greedy Algorithm: A Study in Computational Curation",
    description: "This interface demonstrates Spotify's recommendation system at its most basic level: the greedy algorithm. By always choosing the 'nearest neighbor' based on a single feature, it reveals a fundamental limitation of algorithmic curation—you cannot quantify feeling. As Panos argues, algorithms don't just describe music; they create perceptual frameworks that reshape how we understand it."
  },

  stepOne: {
    label: "Choosing the Lens of Quantification",
    description: "Each feature represents how Spotify attempts to measure the unmeasurable. Danceability, energy, valence—these are statistical approximations of human experience, not the experience itself. The greedy algorithm will use whichever feature you select to make its 'optimal' choice, but as we'll see, optimal for data doesn't mean optimal for humans."
  },

  stepTwo: {
    label: "Setting the Target: The Illusion of Precision",
    description: "You're setting a numerical target for an emotional experience. The algorithm will find the song closest to this number, believing proximity equals similarity. But what if the perfect song for this moment exists outside this mathematical space? This is where Serve's insight becomes crucial—there are no features that could be combined to produce what you actually need."
  },

  greedy: {
    label: "The Greedy Choice: Why Algorithms Fail at Curation",
    description: "The greedy algorithm always picks the nearest neighbor—the song with the smallest difference in your chosen feature. It never considers context, surprise, or the complex web of human emotion. This is why algorithmic playlists feel 'off'—they optimize for data, not feeling. As Panos writes, algorithms create perceptual frameworks that redefine proximity, rhythm, and taste through quantification."
  },

  nearestNeighbor: {
    label: "The Greedy Step: Nearest Neighbor Selection",
    description: "The algorithm calculated the absolute difference between your chosen feature values and selected the song with the smallest gap. It believes this is 'optimal,' but optimal for what? Data points, not human experience. This one-step optimization reveals why greedy algorithms produce coherence without curiosity."
  },

  panos: {
    label: "Algorithmic Mediation (Panos)",
    description: "As Panos argues, algorithms don't just describe the world—they create perceptual frameworks. This interface lets us feel how a listening system redefines proximity, rhythm, and taste through quantification. Every recommendation teaches us that music can be reduced to numbers, but the question remains: can it really?"
  },

  serve: {
    label: "Culture as System (Serve)",
    description: "Serve's work reveals the fundamental problem: there are no features that could be combined to produce what you actually need. Human curation understands context, surprise, and the ineffable quality of 'rightness.' Algorithmic curation can only approximate—it cannot feel. The greedy algorithm, though simple, demonstrates this truth: you cannot curate feeling through data alone."
  }
};

export const FEATURE_DETAILS = {
  danceability: {
    label: "Danceability: 0.0 to 1.0",
    description: "Spotify calculates this using beat strength, tempo stability, and rhythmic regularity. But here's the catch—a funeral march and a club banger can have the same danceability score. The algorithm thinks they're similar. Your body knows better. This reveals how statistical approximations miss the contextual nature of human experience."
  },
  energy: {
    label: "Energy: 0.0 to 1.0", 
    description: "Overall intensity based on loudness, tempo, and timbral brightness. The algorithm believes 0.8 energy equals 'high energy,' but energy is contextual—what energizes you at 2pm differs from 2am. This highlights the limitation of treating emotional states as objective, measurable quantities."
  },
  valence: {
    label: "Valence: 0.0 to 1.0",
    description: "Emotional positivity estimated from harmonic mode and tonality. But happiness isn't a number—it's complex, situational, and deeply personal. The greedy algorithm reduces your entire emotional landscape to a decimal, demonstrating how algorithmic systems flatten human experience into data points."
  },
  tempo: {
    label: "Tempo: Beats Per Minute",
    description: "The song's speed detected through onset analysis. But tempo alone can't capture the difference between a funeral march and a dance track at 60 BPM. Context matters more than data. This shows how single-dimensional measurements fail to capture the richness of musical meaning."
  },
  acousticness: {
    label: "Acousticness: 0.0 to 1.0",
    description: "Probability of acoustic instrumentation from machine learning. But 'acoustic' doesn't mean 'authentic' or 'emotional'—it's just a technical classification that misses the point entirely. This reveals how algorithmic categorization can obscure rather than illuminate musical meaning."
  },
  liveness: {
    label: "Liveness: 0.0 to 1.0",
    description: "Probability of live performance elements like audience noise and reverb. But liveness isn't about technical recording quality—it's about energy, connection, that feeling you get when you're there. You can't measure that. This demonstrates the gap between what algorithms can detect and what humans actually experience."
  }
};