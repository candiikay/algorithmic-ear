export const INFO_CONTENT = {
  project: {
    label: "About this project",
    description:
      "An interactive exploration of algorithmic mediation — how computational systems listen, decide, and recommend. Following Panos's framing, this interface turns data-driven logic into an aesthetic experience, showing how optimization shapes cultural flow.",
  },

  stepOne: {
    label: "Why this step?",
    description:
      "Each musical dimension — danceability, energy, valence, tempo, acousticness, liveness — represents how Spotify quantifies sound. You're choosing the lens the algorithm will use to define similarity.",
  },

  spotifyFeatures: {
    label: "How Spotify measures this",
    description:
      "Spotify's system uses digital signal processing and machine-learning models to predict perceptual features from waveform data — estimating traits like energy, mood, or acousticness. They're statistical guesses about feel, not objective truths.",
  },

  stepTwo: {
    label: "What the slider does",
    description:
      "This slider mirrors how recommendation systems represent taste numerically. As you drag, you're setting a target feeling — the zone the algorithm will try to stay near.",
  },

  greedy: {
    label: "Greedy logic",
    description:
      "The algorithm picks the next song by minimizing distance between your chosen feature values — a greedy approach that always takes the nearest option, without considering long-term diversity.",
  },

  panos: {
    label: "Algorithmic Mediation (Panos)",
    description:
      "Algorithms don't just describe the world — they create perceptual frameworks. This interface lets us feel how a listening system redefines proximity, rhythm, and taste through quantification.",
  },

  serve: {
    label: "Culture as System (Serve)",
    description:
      "Culture now flows through patterned infrastructures. What we see and hear is increasingly shaped by the logic of optimization — what fits next, what feels consistent, what keeps the loop moving.",
  },
};

export const FEATURE_DETAILS = {
  danceability: {
    label: "Danceability",
    description:
      "How easily a track invites movement. Spotify estimates this using rhythmic stability, beat strength, and tempo regularity.",
  },
  energy: {
    label: "Energy",
    description:
      "Overall intensity or drive, based on loudness, tempo, and timbral brightness. 1.0 feels charged; 0.0 feels calm.",
  },
  valence: {
    label: "Valence",
    description:
      "Emotional positivity — how bright or happy a track feels, estimated from harmonic mode and tonality.",
  },
  tempo: {
    label: "Tempo",
    description:
      "The song's speed, measured in beats per minute (BPM). Detected using onset and beat periodicity analysis.",
  },
  acousticness: {
    label: "Acousticness",
    description:
      "The likelihood a track uses acoustic instrumentation, predicted from a machine-learning classifier.",
  },
  liveness: {
    label: "Liveness",
    description:
      "Probability that the recording feels live — background noise, audience reverb, mic bleed.",
  },
};
