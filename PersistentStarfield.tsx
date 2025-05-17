import React from 'react';
import styles from './PersistentStarfield.module.css';

const PersistentStarfield: React.FC = () => {
  const numStars = 150; // Adjust for density

  return (
    <div className={styles.starsContainer}>
      {[...Array(numStars)].map((_, i) => {
        const size = Math.random() * 2.5 + 0.8; // Stars between 0.8px and 3.3px
        const angle = Math.random() * 360;
        // Initial radius close to center for outward expansion
        const initialRadiusPercentage = Math.random() * 10; // 0-10% from center

        // Define the style object with custom properties
        const starStyle = {
          '--size': `${size}px`,
          // Start stars near the center (50vw, 50vh) then offset slightly by initialRadius
          '--initial-x-offset': `${initialRadiusPercentage * Math.cos(angle * Math.PI / 180)}vw`,
          '--initial-y-offset': `${initialRadiusPercentage * Math.sin(angle * Math.PI / 180)}vh`,
          // How much they expand/scale outwards
          '--final-scale': `${Math.random() * 4 + 3}`, // Scale factor between 3 and 7
          animationDelay: `${Math.random() * 4}s`, // Random start delay up to 4s
          animationDuration: `${Math.random() * 4 + 4}s`, // Duration 4s to 8s
        } as React.CSSProperties; // Cast to React.CSSProperties to allow custom props

        return (
          <div
            key={`traveling-star-${i}`}
            className={styles.star}
            style={starStyle} // Use the casted style object
          ></div>
        );
      })}
      {/* Optional: Add a few very subtle, large, slow-moving galaxy blurs if desired */}
      <div className={`${styles.distantFeature} ${styles.galaxyBlur1}`}></div>
      <div className={`${styles.distantFeature} ${styles.galaxyBlur2}`}></div>
    </div>
  );
};

export default PersistentStarfield;
