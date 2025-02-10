'use client';
import React, { useEffect, useState } from 'react';
import styles from './incident.module.css';

const Incidents: React.FC = () => {
    const [historyData, setHistoryData] = useState<{ date: string; description: string }[]>([]);

    // Fetch rewards and recognition history
    const fetchRewardsAndRecognitionHistory = async () => {
        const history = [
            { date: '2024-09-15', description: 'Rewarded for reporting a major incident' },
            { date: '2024-10-02', description: 'Recognized for quick resolution of an urgent case' },
            { date: '2024-10-20', description: 'Earned a reward for exceptional incident management' },
            { date: '2024-11-05', description: 'Awarded a recognition badge for accuracy in reporting' },
        ];
        setHistoryData(history);
    };

    useEffect(() => {
        fetchRewardsAndRecognitionHistory(); // Fetch history for rewards and recognition
    }, []);

    return (
        <div className={styles.incidentsContainer}>


            {/* History of Rewards and Recognition Section */}
            <div className={styles.historySection}>
                <h3>History of Rewards and Recognition</h3>
                <ul className={styles.historyList}>
                    {historyData.length > 0 ? (
                        historyData.map((entry, index) => (
                            <li key={index} className={styles.historyItem}>
                                <span className={styles.historyDate}>{entry.date}</span> &nbsp;&nbsp;
                                <span className={styles.historyDescription}>{entry.description}</span>
                            </li>
                        ))
                    ) : (
                        <p>No history available.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Incidents;
