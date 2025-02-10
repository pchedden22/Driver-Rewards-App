//page.tsx

'use client';
import React, { useState } from 'react';
import styles from './sponsorprof.module.css';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';

Amplify.configure(awsExports);

async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDBClient };
  }

const storeSponsorInfo = async (sponsorInfo: { name: string; description: string; address: string; contact: string; userID: string }) => {
    const params = {
        TableName: 'SponsorProfiles',
        Item: {
            SponsorID: `sponsor-${Date.now()}`,
            Name: sponsorInfo.name,
            Description: sponsorInfo.description,
            Address: sponsorInfo.address,
            Contact: sponsorInfo.contact,
            UserID: sponsorInfo.userID,
        },
    };

    try {
        const { dynamoDBClient } = await getAuthenticatedClients();
        await dynamoDBClient.send(new PutCommand(params));
        alert('Sponsor information saved successfully!');
    } catch (err) {
        console.error('Error saving to DynamoDB', err);
        alert('There was an error saving the sponsor information. Please try again.');
    }
};

const SponsorProfile: React.FC = () => {
    const [profile, setProfile] = useState({
        name: 'Sponsor Company',
        description: 'Description of the sponsor company',
        address: '1234 Sponsor St, City, State, Zip',
        contact: 'contact@sponsorcompany.com',
        userID: ''
    });
    const [editing, setEditing] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prevProfile => ({ ...prevProfile, [name]: value }));
    };

    const handleEditToggle = () => setEditing(!editing);

    const handleSave = async () => {
        try {
            const session = await fetchAuthSession();
            const userID = session?.tokens?.accessToken?.payload?.username;

            if (!userID) throw new Error('User not authenticated');

            await storeSponsorInfo({ ...profile });
            setEditing(false);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Could not update profile. Please try again.');
        }
    };

    return (
        <div className={styles.profileContainer}>
            <h1 className={styles.profileHeader}>Sponsor Profile</h1>
            <div className={styles.profileCard}>
                <form>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Sponsor Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={profile.name}
                            onChange={handleChange}
                            className={styles.inputField}
                            readOnly={!editing}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={profile.description}
                            onChange={handleChange}
                            className={styles.inputField}
                            readOnly={!editing}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="address">Address</label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={profile.address}
                            onChange={handleChange}
                            className={styles.inputField}
                            readOnly={!editing}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="contact">Contact Email</label>
                        <input
                            type="email"
                            id="contact"
                            name="contact"
                            value={profile.contact}
                            onChange={handleChange}
                            className={styles.inputField}
                            readOnly={!editing}
                        />
                    </div>
                </form>

                <div className={styles.buttonGroup}>
                    {editing ? (
                        <>
                            <button className={styles.saveButton} onClick={handleSave}>
                                Save Changes
                            </button>
                            <button className={styles.cancelButton} onClick={handleEditToggle}>
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button className={styles.editButton} onClick={handleEditToggle}>
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SponsorProfile;
