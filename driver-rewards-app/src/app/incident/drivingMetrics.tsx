// drivingMetrics.tsx
import React from 'react';
import styles from './incident.module.css';

interface Metric {
    name: string;
    value: number;
    max: number;
}

interface DrivingMetricsProps {
    metrics: Metric[];
}

const DrivingMetrics: React.FC<DrivingMetricsProps> = ({ metrics }) => (
    <div className={styles.drivingMetricsSection}> {/* Use updated class */}
        <h3>Driving Metrics</h3>
        {metrics.map((metric, index) => (
            <div key={index} className={styles.metric}> {/* Add the 'metric' class */}
                <label>{metric.name}</label>
                <progress value={metric.value} max={metric.max} className={styles.progressBar}/> {/* Add progress bar styling */}
                <span>
                    {metric.value}/{metric.max}
                </span>
            </div>
        ))}
    </div>
);

export default DrivingMetrics;
