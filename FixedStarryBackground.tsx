import React from 'react';
import styles from './FixedStarryBackground.module.css';

const FixedStarryBackground: React.FC = () => {
  const numStars = 200; // Number of stars for the fixed background

  return (
    <div className={styles.starsContainer}>
      {/* Render stars */}
      {[...Array(numStars)].map((_, i) => {
        const size = Math.random() * 2.5 + 0.5; // Star size: 0.5px to 3px
        // @ts-ignore: CSS custom properties for inline style
        const starStyle: React.CSSProperties = {
          top: `${Math.random() * 100}%`, // Random vertical position
          left: `${Math.random() * 100}%`, // Random horizontal position
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${Math.random() * 10}s`, // Random start for twinkle
          animationDuration: `${Math.random() * 10 + 5}s`, // Twinkle duration: 5s to 15s
        };
        return (
          <div
            key={`fixed-star-${i}`}
            className={styles.star}
            style={starStyle}
          ></div>
        );
      })}
      {/* Render distant features like galaxies and nebulae */}
      <div className={`${styles.distantFeature} ${styles.galaxy1}`}></div>
      <div className={`${styles.distantFeature} ${styles.galaxy2}`}></div>
      <div className={`${styles.distantFeature} ${styles.nebula1}`}></div>
    </div>
  );
};

export default FixedStarryBackground;
