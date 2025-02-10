'use client';
import '@/app/globals.css';
import '../styles/styles.css';
import styles from './incident.module.css';
import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import IncidentChart from './chart';
import Leaderboard from './leaderboard';
import History from './history';

Amplify.configure(awsExports);

// const dynamoDBClient = new DynamoDBClient({
//     region: 'us-east-2',
// });

// Data types
type IncidentType = {
    IncidentID: { S: string };
    DriverName: { S: string };
    IncidentDate: { S: string };
    IncidentType: { S: string };
    Description: { S: string };
    Status: { S: string };
    ReportedBy: { S: string };
};

type MetricType = {
    name: string;
    value: number;
};

// Sample Data
const hardcodedIncidents: IncidentType[] = [
    { IncidentID: { S: '1' }, DriverName: { S: 'John Doe' }, IncidentDate: { S: '2024-11-12' }, IncidentType: { S: 'Collision' }, Description: { S: 'Minor fender bender' }, Status: { S: 'Resolved' }, ReportedBy: { S: 'Admin' } },
    { IncidentID: { S: '2' }, DriverName: { S: 'Jane Smith' }, IncidentDate: { S: '2024-11-10' }, IncidentType: { S: 'Speeding' }, Description: { S: 'Exceeded speed limit' }, Status: { S: 'Under Review' }, ReportedBy: { S: 'Admin' } },
];

export default function Incident() {
    const [incidents, setIncidents] = useState<IncidentType[]>([]);
    const [metrics, /*setMetrics*/] = useState<MetricType[]>([{ name: "Speeding Events", value: 5 }, { name: "Safe Drives", value: 20 }]);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedActivity, setSelectedActivity] = useState<string>('');
    const [viewLeaderboard, setViewLeaderboard] = useState<boolean>(false);

    useEffect(() => {
        setIncidents(hardcodedIncidents);
    }, []);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'startDate') setStartDate(value);
        if (name === 'endDate') setEndDate(value);
    };

    const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedActivity(e.target.value);

    const filteredIncidents = incidents.filter(incident => {
        const matchesDateRange = (!startDate || incident.IncidentDate.S >= startDate) && (!endDate || incident.IncidentDate.S <= endDate);
        const matchesActivity = !selectedActivity || incident.IncidentType.S === selectedActivity;
        return matchesDateRange && matchesActivity;
    });

    const incidentSummary = {
        total: incidents.length,
        resolved: incidents.filter(incident => incident.Status.S === 'Resolved').length,
        underReview: incidents.filter(incident => incident.Status.S === 'Under Review').length,
    };

    const activityOptions = ['All', 'Collision', 'Speeding'];

    return (
        <div className={styles.contentContainer}>
            {viewLeaderboard ? (
                <Leaderboard onBackToReports={() => setViewLeaderboard(false)} />
            ) : (
                <>
                    {/* Incident Summary Section */}
                    <div className={styles.summarySection}>
                        <h3>Incident Summary</h3>
                        <div className={styles.summaryStats}>
                            <p>Total Incidents: {incidentSummary.total}</p>
                            <p>Resolved: {incidentSummary.resolved}</p>
                            <p>Under Review: {incidentSummary.underReview}</p>
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className={styles.filterSection}>
                        <h3>Filter Incidents</h3>
                        <label>
                            Start Date:&nbsp; &nbsp;
                            <input type="date" name="startDate" value={startDate} onChange={handleDateChange} />
                        </label>
                        <br/>
                        <label>
                            End Date:&nbsp; &nbsp;&nbsp; 
                            <input type="date" name="endDate" value={endDate} onChange={handleDateChange} />
                        </label>
                        <br/>
                        <label>
                            Activity:&nbsp; &nbsp; &nbsp; &nbsp; 
                            <select value={selectedActivity} onChange={handleActivityChange}>
                                {activityOptions.map((activity, index) => (
                                    <option key={index} value={activity === 'All' ? '' : activity}>
                                        {activity}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Graph Section */}
                    <div className={styles.graphSection}>
                        <h3>Incident Trends</h3>
                        <IncidentChart incidents={filteredIncidents} />
                    </div>

                    {/* Driving Metrics Section */}
                    <div className={styles.metricsSection}>
                        <h3>Driving Metrics</h3>
                        <ul>
                            {metrics.map((metric, index) => (
                                <li key={index}>{metric.name}: {metric.value}</li>
                            ))}
                        </ul>
                    </div>

                    {/* History Section */}
                    <div className={styles.historySection}>
                        <h3>Rewards and Recognition History</h3>
                        <History />
                    </div>

                    {/* Data Table Section */}
                    <div className={styles.tableSection}>
                        <h3>Incident Data</h3>
                        <table className={styles.incidentTable}>
                            <thead>
                                <tr>
                                    <th>ID</th><th>Driver</th><th>Date</th><th>Type</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIncidents.map((incident, index) => (
                                    <tr key={index}>
                                        <td>{incident.IncidentID.S}</td>
                                        <td>{incident.DriverName.S}</td>
                                        <td>{incident.IncidentDate.S}</td>
                                        <td>{incident.IncidentType.S}</td>
                                        <td>{incident.Status.S}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.buttonSection}>
                        <button onClick={() => setViewLeaderboard(true)}>View Leaderboard</button>
                    </div>
                </>
            )}
        </div>
    );
}
