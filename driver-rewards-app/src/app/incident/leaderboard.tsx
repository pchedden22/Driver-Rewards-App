'use client';
import React, { useEffect, useState } from 'react';
import styles from './leaderboard.module.css';

// Define the User type
interface User {
    id: string;
    name: string;
    rank: number;
    points: number;
    achievements: string[];
    rewards: number;
    drivingMetrics: number;
}

// Define the prop types, including the onBackToReports function
interface LeaderboardProps {
    onBackToReports: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBackToReports }) => {
    const [leaderboardData, setLeaderboardData] = useState<User[]>([]);
    const [currentUserRank, setCurrentUserRank] = useState<User | null>(null);
    const [optOutPreferences, setOptOutPreferences] = useState({
        achievements: false,
        rewards: false,
        drivingMetrics: false,
    });

    // Fetch leaderboard data and current user rank on component mount
    useEffect(() => {
        fetchLeaderboardData();
        fetchCurrentUserRank();
    }, []);

    // Mock function to fetch leaderboard data
    const fetchLeaderboardData = async () => {
        const data: User[] = [
            { id: '1', name: 'Alice', rank: 1, points: 1200, achievements: ['Top Scorer'], rewards: 5, drivingMetrics: 95 },
            { id: '2', name: 'Bob', rank: 2, points: 1150, achievements: ['Consistent Performer'], rewards: 3, drivingMetrics: 90 },
            { id: '3', name: 'Charlie', rank: 3, points: 1100, achievements: ['Fast Learner'], rewards: 2, drivingMetrics: 88 },
            { id: '4', name: 'Dave', rank: 4, points: 1050, achievements: ['Reliable'], rewards: 1, drivingMetrics: 85 },
        ];
        setLeaderboardData(data);
    };

    // Mock function to fetch the current user's rank
    const fetchCurrentUserRank = async () => {
        const userRank: User = { id: '5', name: 'You', rank: 5, points: 1000, achievements: ['On the Rise'], rewards: 2, drivingMetrics: 80 };
        setCurrentUserRank(userRank);
    };

    // Handle opt-out changes
    const handleOptOutChange = (type: keyof typeof optOutPreferences) => {
        setOptOutPreferences((prevPreferences) => ({
            ...prevPreferences,
            [type]: !prevPreferences[type],
        }));
    };

    return (
        <div className={styles.leaderboardContainer}>
            <h2>Leaderboard</h2>
            {/* Opt-out preferences section */}
            <div className={styles.optOutSection}>
                <label>
                    <input
                        type="checkbox"
                        checked={optOutPreferences.achievements}
                        onChange={() => handleOptOutChange('achievements')}
                    />
                    Opt-out of Achievements Leaderboard
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={optOutPreferences.rewards}
                        onChange={() => handleOptOutChange('rewards')}
                    />
                    Opt-out of Rewards Leaderboard
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={optOutPreferences.drivingMetrics}
                        onChange={() => handleOptOutChange('drivingMetrics')}
                    />
                    Opt-out of Driving Metrics Leaderboard
                </label>
            </div>

            <div className={styles.leaderboards}>
                {/* Achievements Leaderboard */}
                {!optOutPreferences.achievements && (
                    <div className={styles.leaderboard}>
                        <h3>Achievements</h3>
                        <ul className={styles.leaderboardList}>
                            {leaderboardData.map(user => (
                                <li key={user.id} className={styles.leaderboardItem}>
                                    <span className={styles.rank}>#{user.rank}</span>
                                    <span className={styles.name}>{user.name}</span>
                                    <div className={styles.achievements}>
                                        {user.achievements.map((ach, index) => (
                                            <span key={index} className={styles.badge}>{ach}</span>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Rewards Leaderboard */}
                {!optOutPreferences.rewards && (
                    <div className={styles.leaderboard}>
                        <h3>Rewards</h3>
                        <ul className={styles.leaderboardList}>
                            {leaderboardData.map(user => (
                                <li key={user.id} className={styles.leaderboardItem}>
                                    <span className={styles.rank}>#{user.rank}</span>
                                    <span className={styles.name}>{user.name}</span>
                                    <span className={styles.points}>{user.rewards} rewards</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Driving Metrics Leaderboard */}
                {!optOutPreferences.drivingMetrics && (
                    <div className={styles.leaderboard}>
                        <h3>Driving Metrics</h3>
                        <ul className={styles.leaderboardList}>
                            {leaderboardData.map(user => (
                                <li key={user.id} className={styles.leaderboardItem}>
                                    <span className={styles.rank}>#{user.rank}</span>
                                    <span className={styles.name}>{user.name}</span>
                                    <span className={styles.points}>{user.drivingMetrics}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Display current user's rank and achievements */}
            {currentUserRank && (
                <div className={styles.userRanking}>
                    <h3>Your Rank: #{currentUserRank.rank}</h3>
                    <p>Points: {currentUserRank.points} pts</p>
                    <button onClick={() => alert(`Your rank is: ${currentUserRank.rank}`)}>
                        View My Ranking
                    </button>
                    <h3>Your Achievements</h3>
                    <ul>
                        {currentUserRank.achievements.map((ach, index) => (
                            <li key={index}>{ach}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Back to Reports Button */}
            <div className={styles.backButtonContainer}>
                <button className={styles.backButton} onClick={onBackToReports}>Back to Reports</button>
            </div>
        </div>
    );
};

export default Leaderboard;
