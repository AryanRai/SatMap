import React, { useState, useEffect, useRef, ReactNode } from 'react';
import styles from './ParallaxEarthSection.module.css';

// Ensure 'assests' spelling is correct for your folder structure
import earthImage from '../../assests/earth.png';

interface ParallaxEarthSectionProps {
  children: ReactNode;
  scrollSpeedFactor?: number; 
}

const ParallaxEarthSection: React.FC<ParallaxEarthSectionProps> = ({ 
  children, 
  scrollSpeedFactor = 0.25 
}) => {
  const [earthYTransform, setEarthYTransform] = useState(0);
  const earthContainerRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    const initialOffset = window.innerHeight * 0.75; // Earth starts further down (75% of viewport height below its natural top)
    setEarthYTransform(initialOffset);

    const handleScroll = () => {
      const windowScrollY = window.scrollY;
      // Earth moves up as user scrolls down.
      // The movement starts relative to the overall page scroll.
      let newTransformY = initialOffset - (windowScrollY * scrollSpeedFactor);
      setEarthYTransform(newTransformY);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); 

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollSpeedFactor]);

  return (
    <section className={styles.parallaxSection}>
      <div 
        ref={earthContainerRef}
        className={styles.earthImageContainer}
        style={{
          // translate(-50%, Y) to keep it horizontally centered while moving vertically
          transform: `translate(-50%, ${earthYTransform}px)`, 
        }}
      >
        <img src={earthImage} alt="Earth" className={styles.earthImage} />
      </div>
      <div className={styles.contentOverlay}>
        {children}
      </div>
    </section>
  );
};

export default ParallaxEarthSection;
