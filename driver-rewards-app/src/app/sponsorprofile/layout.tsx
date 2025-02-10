import React from 'react';
import styles from './sponsorprof.module.css';

export default function SponsorProfileLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Sponsor Dashboard</h1>
            </header>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
