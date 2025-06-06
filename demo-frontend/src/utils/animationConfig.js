export const ANIMATION_CONFIG = {
  CARD_DISSOLUTION: 500,    // Other cards fade out
  CARD_EXPANSION: 600,      // Selected card expands
  CONTAINER_RESIZE: 400,    // Container height adjusts
  CONTENT_FADE_IN: 300,     // New content appears
  
  // Easing (Framer Motion format)
  DISSOLVE_EASE: [0.4, 0.0, 0.2, 1],          // Material Design standard easing
  EXPAND_EASE: [0.25, 0.46, 0.45, 0.94],      // Smooth expansion curve
  CONTENT_EASE: [0.165, 0.84, 0.44, 1],       // Quick ease-out for content
  
  // Reduced motion
  REDUCED_MOTION_DURATION: 200,
};

export const shouldReduceMotion = () => 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches; 