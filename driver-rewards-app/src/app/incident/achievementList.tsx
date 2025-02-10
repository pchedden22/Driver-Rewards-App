// achievementList.tsx
import React from 'react';
import styles from './incident.module.css';

interface Achievement {
    id: number;
    title: string;
    date: string;
}

interface AchievementListProps {
    achievements: Achievement[];
}

const AchievementList: React.FC<AchievementListProps> = ({ achievements }) => (
    <div className={styles.achievementsSection}> {/* Use updated class */}
        <h3>Achievements</h3>
        <ul className={styles.achievementList}>
            {achievements.map(achievement => (
                <li key={achievement.id} className={styles.achievement}> {/* Add the 'achievement' class */}
                    <strong>{achievement.title}</strong> - {achievement.date}
                </li>
            ))}
        </ul>
    </div>
);

export default AchievementList;
