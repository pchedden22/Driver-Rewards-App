// IncidentChart.tsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface IncidentType {
    IncidentID: { S: string };
    DriverName: { S: string };
    IncidentDate: { S: string };
    IncidentType: { S: string };
    Description: { S: string };
    Status: { S: string };
    ReportedBy: { S: string };
}

interface IncidentChartProps {
    incidents?: IncidentType[]; // Make incidents optional to avoid errors if undefined
}

const IncidentChart: React.FC<IncidentChartProps> = ({ incidents = [] }) => {
    // Initialize incidentCounts to prevent errors even if incidents is empty
    const incidentCounts = incidents.reduce((acc: Record<string, number>, incident) => {
        const type = incident.IncidentType.S;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    const data = {
        labels: Object.keys(incidentCounts),
        datasets: [
            {
                label: 'Number of Incidents',
                data: Object.values(incidentCounts),
                backgroundColor: 'rgba(255, 165, 0, 0.6)', // Optional: Adjust color as needed
            },
        ],
    };

    return (
        <div>
            <h2>Incident Types</h2>
            <Bar data={data} />
        </div>
    );
};

export default IncidentChart;
