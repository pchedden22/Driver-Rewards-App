'use client';

import React, { useState, useEffect } from 'react';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';
import styles from './support.module.css';

type SupportRequest = {
    id: string;
    user_id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    createdAt: string;
};

export default function Support() {
    const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
    const [newSupportRequest, setNewSupportRequest] = useState({
        title: '',
        description: '',
        category: '',
    });
    const [driverID, setDriverID] = useState<string | null>(null);

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
            const username = session?.tokens?.accessToken?.payload?.username;
                        
            setDriverID(typeof username === 'string' ? username : null);
        };

        fetchDriverID();
        fetchSupportRequests();
    }, []);

    useEffect(() => {
        if (driverID) fetchSupportRequests();
    }, [driverID]);

    const fetchSupportRequests = async () => {
        if (!driverID) return; // Return early if driverID is null

        try {
            const params = {
                TableName: 'SupportRequests',
                IndexName: 'user_id-index', // Replace with the actual index name for user_id if necessary
                KeyConditionExpression: 'user_id = :user_id',
                ExpressionAttributeValues: {
                    ':user_id': { S: driverID },
                },
            };

            const { dynamoDBClient } = await getAuthenticatedClients();
            const response = await dynamoDBClient.send(new QueryCommand(params));

            // Extract the data correctly by accessing the 'S' property
            const supportList = response.Items?.map(item => ({
                id: item.id.S || '',
                user_id: item.user_id.S || '',
                title: item.title.S || '',
                description: item.description.S || '',
                category: item.category.S || '',
                status: item.status.S || '',
                createdAt: item.createdAt.S || '',
            })) as SupportRequest[];

            setSupportRequests(supportList || []);
        } catch (error) {
            console.error('Error fetching support requests:', error);
        }
    };

    const handleSubmit = async () => {
        if (!newSupportRequest.title || !newSupportRequest.description) {
            alert('Please fill out all fields.');
            return;
        }

        if (!driverID) {
            alert('Please ensure you are logged in.');
            return;
        }

        const supportRequest = {
            id: { S: new Date().toISOString() }, // Unique ID generated based on timestamp
            user_id: { S: driverID },
            title: { S: newSupportRequest.title },
            description: { S: newSupportRequest.description },
            category: { S: newSupportRequest.category },
            status: { S: 'open' },
            createdAt: { S: new Date().toISOString() },
        };

        const params = {
            TableName: 'SupportRequests',
            Item: supportRequest,
        };

        try {
            const { dynamoDBClient } = await getAuthenticatedClients();
            await dynamoDBClient.send(new PutItemCommand(params));
            alert('Support request submitted!');
            setNewSupportRequest({ title: '', description: '', category: '' });
            fetchSupportRequests(); // Refresh the support requests
        } catch (error) {
            console.error('Error submitting support request:', error);
            alert('Failed to submit support request.');
        }
    };

    return (
        <div>
            <header className={styles.header}>
                <h1>Support Page</h1>
                <h2>Submit a support request here!</h2>
            </header>
            <div className={styles.contentContainer}>
                <label className={styles.label}>
                    Title:
                    <input
                        type="text"
                        value={newSupportRequest.title}
                        onChange={(e) => setNewSupportRequest({ ...newSupportRequest, title: e.target.value })}
                        placeholder="Enter request title"
                        className={styles.input}
                    />
                </label>
                <label className={styles.label}>
                    Description:
                    <textarea
                        value={newSupportRequest.description}
                        onChange={(e) => setNewSupportRequest({ ...newSupportRequest, description: e.target.value })}
                        placeholder="Describe your issue"
                        className={styles.textarea}
                    />
                </label>
                <label className={styles.label}>
                    Category:
                    <select
                        value={newSupportRequest.category}
                        onChange={(e) => setNewSupportRequest({ ...newSupportRequest, category: e.target.value })}
                        className={styles.select}
                    >
                        <option value="">--Select Category--</option>
                        <option value="Technical">Technical</option>
                        <option value="Billing">Billing</option>
                        <option value="Account">Account</option>
                        {/* Add more categories as needed */}
                    </select>
                </label>
                <button onClick={handleSubmit} className={styles.button}>Submit Request</button>

                <h2 className={`${styles.title} ${styles.supportTitle}`}>My Support Requests</h2>

                <div className={styles.supportRequestsContainer}>
                    {supportRequests.length > 0 ? (
                        <ul className={styles.supportRequestList}>
                            {supportRequests.map((request, index) => (
                                <li key={index} className={styles.supportRequestItem}>
                                    <p><strong>Title:</strong> {request.title}</p>
                                    <p><strong>Status:</strong> {request.status}</p>
                                    <p><strong>Category:</strong> {request.category}</p>
                                    <p><strong>Description:</strong> {request.description}</p>
                                    <p><strong>Submitted on:</strong> {request.createdAt}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.noSupportRequestsText}>No support requests submitted.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
