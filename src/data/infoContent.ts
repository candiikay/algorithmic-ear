export const INFO_CONTENT = {
  project: {
    label: "The Algorithmic Ear: Can Taste Be Quantified?",
    description: "The Algorithmic Ear explores a fundamental question: can algorithms truly 'hear' better than humans? From platform to platform, music curation varies dramatically—different algorithms, different human curators, different approaches to taste. Spotify attempts to quantify and qualify taste through audio features, but as Panos argues, algorithms don't just describe music; they create perceptual frameworks that reshape how we understand it. This interface asks: when platforms try to measure the unmeasurable, what gets lost in translation? The greedy algorithm demonstrates this tension—it optimizes for data proximity but fails to capture the contextual, emotional, and cultural dimensions that make music meaningful. As Serve's work reveals, there are no features that could be combined to produce what you actually need. Human curation understands context, surprise, and the ineffable quality of 'rightness.' Algorithmic curation can only approximate—it cannot feel. This is why algorithmic playlists often feel 'off'—they optimize for data, not feeling. The question remains: can taste be quantified, or is it fundamentally unmeasurable?"
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
    description: "When you choose this, the algorithm will find songs with similar rhythmic patterns and beat strength. It will group together tracks that feel equally 'danceable'—so you might get a disco hit, a reggaeton track, and a techno song all in a row. The algorithm thinks they're similar because they have the same danceability score, but they might feel completely different to you."
  },
  energy: {
    label: "Energy: 0.0 to 1.0", 
    description: "When you choose this, the algorithm will match songs based on their intensity level—loudness, speed, and overall drive. It will group together tracks that have similar energy scores, so you might get a punk song, a metal track, and an electronic banger all together. The algorithm thinks they're similar because they're equally 'energetic,' but they might be from completely different genres."
  },
  valence: {
    label: "Valence: 0.0 to 1.0",
    description: "When you choose this, the algorithm will find songs with similar emotional 'brightness'—happy vs. sad, major vs. minor keys. It will group together tracks that sound equally 'positive' or 'negative' to the algorithm, so you might get a pop song, a folk ballad, and a jazz standard all together. The algorithm thinks they're similar because they have the same emotional tone, but they might feel completely different to you."
  },
  tempo: {
    label: "Tempo: Beats Per Minute",
    description: "When you choose this, the algorithm will match songs based on their speed—how many beats per minute. It will group together tracks that have similar tempos, so you might get a slow ballad, a mid-tempo rock song, and a fast electronic track all together. The algorithm thinks they're similar because they have the same BPM, but they might be from completely different genres and moods."
  },
  acousticness: {
    label: "Acousticness: 0.0 to 1.0",
    description: "When you choose this, the algorithm will find songs with similar instrumentation—acoustic vs. electronic sounds. It will group together tracks that have similar 'acoustic' scores, so you might get a folk song, a classical piece, and an acoustic pop track all together. The algorithm thinks they're similar because they use similar instruments, but they might be from completely different eras and styles."
  },
  liveness: {
    label: "Liveness: 0.0 to 1.0",
    description: "When you choose this, the algorithm will match songs based on whether they sound 'live' or 'studio-recorded.' It will group together tracks that have similar 'liveness' scores, so you might get a live concert recording, a studio track with audience sounds, and a raw demo all together. The algorithm thinks they're similar because they have the same 'live' quality, but they might be from completely different artists and contexts."
  },
  loudness: {
    label: "Loudness: Decibels (dB)",
    description: "When you choose this, the algorithm will find songs with similar volume levels—how loud or quiet they are overall. It will group together tracks that have similar loudness scores, so you might get a quiet ballad, a mid-volume pop song, and a loud rock track all together. The algorithm thinks they're similar because they have the same volume level, but they might be from completely different genres and moods."
  }
};