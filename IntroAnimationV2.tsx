import React, { useEffect, useState, useRef } from 'react';
import styles from './IntroAnimationV2.module.css';

// IMPORTANT: Ensure this path is correct for your satellite image.
import satelliteImage from '../../assests/satellite.png'; 

const IntroAnimationV2: React.FC = () => {
  // 'initialLarge': Satellite starts large in the center.
  // 'orbSizeCenter': Satellite shrinks to orb size in center, title appears.
  // 'sideViewFixed': Satellite has moved to the side, is fixed, and follows scroll.
  const [satelliteMode, setSatelliteMode] = useState<'initialLarge' | 'orbSizeCenter' | 'sideViewFixed'>('initialLarge');
  const introContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Timer for satellite to shrink from initialLarge to orbSizeCenter
    const shrinkToOrbTimer = setTimeout(() => {
      if (satelliteMode === 'initialLarge') { // Only shrink if it's still in the initial large state
        setSatelliteMode('orbSizeCenter');
      }
    }, 2000); // Time satellite stays large before shrinking (e.g., 2 seconds)

    const handleScroll = () => {
      // Threshold to switch to sideView: when user scrolls past approx 70% of the intro section height
      const scrollThreshold = window.innerHeight * 0.7; 

      if (window.scrollY > scrollThreshold) {
        if (satelliteMode !== 'sideViewFixed') {
          setSatelliteMode('sideViewFixed');
        }
      } else {
        // If scrolling back up, revert from sideViewFixed to orbSizeCenter
        if (satelliteMode === 'sideViewFixed') {
          setSatelliteMode('orbSizeCenter');
        }
        // Note: This doesn't handle reverting from orbSizeCenter back to initialLarge on scroll up.
        // initialLarge is primarily a timed state.
      }
    };
    
    // Start listening to scroll after a brief delay to allow initial animations to start
    const scrollListenerSetupTimer = setTimeout(() => {
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check in case page is already scrolled
    }, 500); // Start scroll listening early

    return () => {
      clearTimeout(shrinkToOrbTimer);
      clearTimeout(scrollListenerSetupTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [satelliteMode]); // Re-run effect if satelliteMode changes to manage transitions

  // Dynamically build satellite class string based on its current mode
  let satelliteClasses = `${styles.satelliteBase} `;
  let titleIsVisible = false;

  switch (satelliteMode) {
    case 'initialLarge':
      satelliteClasses += styles.satelliteInitialLarge;
      // Title not yet visible
      break;
    case 'orbSizeCenter':
      satelliteClasses += styles.satelliteOrbSizeCenter;
      satelliteClasses += ` ${styles.satelliteWobbleOrb}`; // Wobble for orb
      titleIsVisible = true; // Show title when satellite is orb size in center
      break;
    case 'sideViewFixed':
      satelliteClasses += styles.satelliteSideViewFixed;
      satelliteClasses += ` ${styles.satelliteWobbleSide}`; // Different or same wobble for side
      // Title should be hidden when satellite is in side view
      break;
  }

  return (
    // This container still defines the 100vh space for the initial animation
    <div ref={introContainerRef} className={styles.introContainer}>
      <img
        src={satelliteImage}
        alt="Satellite"
        className={satelliteClasses}
      />

      {/* Title Container - visibility controlled by titleIsVisible */}
      <div className={`${styles.titleContainer} ${titleIsVisible ? styles.titleVisible : styles.titleHidden}`}>
        <span className={`${styles.titlePart} ${styles.titlePart1}`}>Satellite</span>
        <span className={`${styles.titlePart} ${styles.titlePart2}`}>Handshake</span>
        <span className={`${styles.titlePart} ${styles.titlePart3}`}>Simulator</span>
      </div>
    </div>
  );
};

export default IntroAnimationV2;
