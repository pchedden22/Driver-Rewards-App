"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxOpacity = 0.7;
      const scrollPosition = window.scrollY;
      const calculatedOpacity = Math.min(scrollPosition / window.innerHeight, maxOpacity);
      setOverlayOpacity(calculatedOpacity);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`${styles.parallaxBackground} bg-background text-foreground font-sans`}>
      <div
        className={styles.overlay}
        style={{ opacity: overlayOpacity }}
      />

      <section className={`${styles.hero}`}>
        <div className={styles.heroContent}>
          <h1 className="text-4xl font-bold mb-4">Empower Your Drivers, Reward Excellence</h1>
          <p className="text-lg mb-6">Incentivize safe driving and improve performance with our driver rewards program.</p>
          <Link href="/login" passHref>
            <button className={styles.ctaButton}>Get Started</button>
          </Link>
        </div>
      </section>


      <section className={`${styles.transparentSection} py-16`}>
        <div className={styles.container}>
          <h2 className="text-3xl font-semibold mb-8 text-foreground-link text-center">How It Works</h2>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto justify-items-center">
            <div className={styles.card}>
              <div className={styles.firstContent}>
                <span>Earn Points</span>
              </div>
              <div className={styles.secondContent}>
                <span>Drivers earn points for safe driving and can redeem them anytime.</span>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.firstContent}>
                <span>Track Performance</span>
              </div>
              <div className={styles.secondContent}>
                <span>Sponsors monitor driving habits and reward improvement over time.</span>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.firstContent}>
                <span>Redeem Rewards</span>
              </div>
              <div className={styles.secondContent}>
                <span>Use points to access exclusive rewards from a curated catalog.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Left-aligned Transparent Section */}
        <section className={`${styles.transparentSection} py-16`}>
          <div className="max-w-4xl mx-auto flex items-center justify-center">
            <div className="w-1/2">
              <h2 className="text-3xl font-semibold mb-4">Drive Safely, Earn Rewards</h2>
              <p>Our rewards program is designed to encourage safe driving habits. Earn points for every safe mile!</p>
            </div>
            <img src="/steeringWheel.png" alt="Drive Safely" className={styles.iconLeft} />
          </div>
        </section>

        {/* Right-aligned Transparent Section */}
        <section className={`${styles.transparentSection} py-16`}>
          <div className="max-w-4xl mx-auto flex items-center justify-center">
            <img src="/prize.png" alt="Exclusive Rewards" className={styles.iconRight} />
            <div className="w-1/2 text-right">
              <h2 className="text-3xl font-semibold mb-4">Exclusive Rewards</h2>
              <p>Use your points to redeem rewards from our extensive catalog, updated regularly to keep you motivated.</p>
            </div>
          </div>
        </section>


      <section className={`${styles.transparentSection} py-16`}>
        <div className="bg-theme-purple text-center text-header-text">
          <h2 className="text-3xl font-semibold mb-4">Ready to Reward Your Drivers?</h2>
          <button className={styles.ctaButton}>Contact Us Today</button>
        </div>
      </section>
    </div>
  );
}
