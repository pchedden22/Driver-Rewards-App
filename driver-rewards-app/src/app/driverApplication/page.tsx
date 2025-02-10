'use client';

import React, { useEffect, useState } from 'react';
import { DynamoDBClient, ScanCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';
import styles from './driverApplication.module.css';

type Sponsor = {
    SponsorID: string;
    SponsorName: string;
};

type Application = {
    sponsor_id: string;
    created_timestamp: string;
    status: string;
    notes: string;
};

export default function DriverApplication() {
    const [sponsorID, setSponsorID] = useState('');
    const [driverID, setDriverID] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);

    async function getAuthenticatedClients() {
        const { credentials } = await fetchAuthSession();
        
        const dynamoDBClient = new DynamoDBClient({
          region: 'us-east-2',
          credentials: credentials
        });
      
        return { dynamoDBClient };
      }

    useEffect(() => {
        const fetchDriverID = async () => {
            const session = await fetchAuthSession();
            setDriverID(session?.tokens?.accessToken?.payload?.username as string || null);
        };

        fetchDriverID();
        fetchAvailableSponsors();
    }, []);

    useEffect(() => {
        if (driverID) fetchOutgoingApplications();
    }, [driverID]);

    const fetchAvailableSponsors = async () => {
        try {
            const params = {
                TableName: 'Team06-Sponsors',
                ProjectionExpression: 'SponsorID, SponsorName',
            };

            const { dynamoDBClient } = await getAuthenticatedClients();
            const response = await dynamoDBClient.send(new ScanCommand(params));

            const sponsorList = response.Items?.map(item => ({
                SponsorID: item.SponsorID.S || '',
                SponsorName: item.SponsorName.S || '',
            })) as Sponsor[];

            setSponsors(sponsorList || []);
        } catch (error) {
            console.error('Error fetching sponsors:', error);
        }
    };

    const fetchOutgoingApplications = async () => {
        if (!driverID) return; // Return early if driverID is null
    
        try {
            const params = {
                TableName: 'Team06-DriverApplications',
                IndexName: 'user_id-index', // Replace with the actual index name for user_id
                KeyConditionExpression: 'user_id = :user_id',
                ExpressionAttributeValues: {
                    ':user_id': { S: driverID },
                },
            };
            const { dynamoDBClient } = await getAuthenticatedClients();
            const response = await dynamoDBClient.send(new QueryCommand(params));
    
            const applicationList = response.Items?.map(item => ({
                sponsor_id: item.sponsor_id.S,
                created_timestamp: item.created_timestamp.S,
                status: item.status.S,
                notes: item.notes.S,
            })) as Application[];
    
            setApplications(applicationList || []);
        } catch (error) {
            console.error('Error fetching applications:', error);
        }
    };

    
    
    
    const handleSubmit = async () => {
        if (!sponsorID || !driverID) {
            alert('Please select a sponsor and ensure you are logged in.');
            return;
        }

        const selectedSponsor = sponsors.find(s => s.SponsorID === sponsorID);
        const sponsorName = selectedSponsor ? selectedSponsor.SponsorName : '';

        const application = {
            sponsor_id: { S: sponsorID },
            user_id: { S: driverID },
            created_timestamp: { S: new Date().toISOString() },
            status: { S: "pending" },
            updated_timestamp: { S: new Date().toISOString() },
            notes: { S: notes },
        };

        const params = {
            TableName: 'Team06-DriverApplications',
            Item: application,
        };

        try {
            const { dynamoDBClient } = await getAuthenticatedClients();
            await dynamoDBClient.send(new PutItemCommand(params));
            alert(`Application submitted to ${sponsorName}!`);
            setSponsorID('');
            setNotes('');
            fetchOutgoingApplications(); // Refresh the outgoing applications
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Failed to submit application.');
        }
    };

    return (
        <div>
            <header className={styles.header}>
                <h1>Driver Points and Purchase History</h1>
                <h2>Apply to sponsors here!</h2>
            </header>
            <div className={styles.contentContainer}>
                <label className={styles.label}>
                    Select Sponsor:
                    <select
                        value={sponsorID}
                        id="sponsorSelect"
                        onChange={(e) => setSponsorID(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">--Select Sponsor--</option>
                        {sponsors.map((sponsor) => (
                            <option key={sponsor.SponsorID} value={sponsor.SponsorID}>
                                {sponsor.SponsorName}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={styles.label}>
                    Notes:
                    <textarea
                        value={notes}
                        id="notes"
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional information here"
                        className={styles.textarea}
                    />
                </label>
                <button onClick={handleSubmit} className={styles.button} id="submitApp">Submit Application</button>
    
                <h2 className={`${styles.title} ${styles.outgoingTitle}`}>Outgoing Applications</h2>
                
                <div className={styles.outgoingApplicationsContainer}>
                    {applications.length > 0 ? (
                        <ul className={styles.applicationList}>
                            {applications.map((app, index) => {
                                const sponsor = sponsors.find(s => s.SponsorID === app.sponsor_id);
                                const sponsorName = sponsor ? sponsor.SponsorName : 'Unknown Sponsor';
    
                                return (
                                    <li key={index} className={styles.applicationItem}>
                                        <p><strong>Sponsor Name:</strong> {sponsorName}</p>
                                        <p><strong>Date Submitted:</strong> {app.created_timestamp}</p>
                                        <p><strong>Status:</strong> {app.status}</p>
                                        <p><strong>Notes:</strong> {app.notes}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className={styles.noApplicationsText}>No outgoing applications.</p>
                    )}
                </div>
            </div>
        </div>
    );
    
}
