'use client';
import styles from './profile-setup.module.css';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import AWS from 'aws-sdk';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';

Amplify.configure(awsExports);

async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDB };
  }

export default function ProfileSetup() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        licenseNumber: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
    });
    const [error, setError] = useState('');

    const createUserInDB = async () => {
        try {
            const { dynamoDB } = await getAuthenticatedClients();
            const attributes = await fetchUserAttributes();
            const { tokens } = await fetchAuthSession();
            if (!tokens) throw new Error("User Not Logged In");

            const username = tokens.accessToken.payload["username"];
            const email = attributes?.email ?? '';

            if (!username || !email) {
                throw new Error("Username or email not found in user attributes");
            }

            const params = {
                TableName: 'Team06-Drivers',
                Item: {
                    LicenseID: formData.licenseNumber,
                    username: username,
                    email: email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phoneNum: formData.phoneNumber,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    role: 'Drivers',
                    points: 0,
                    sponsorMap: {}
                }
            };

            await dynamoDB.put(params).promise();
            return true;
        } catch (error) {
            console.error("Error creating user in DynamoDB:", error);
            return false;
        }
    };

    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const hasEmptyFields = Object.values(formData).some(value => !value.trim());
        if (hasEmptyFields) {
            setError('All fields are required');
            return;
        }

        try {
            const success = await createUserInDB();
            if (success) {
                setShowConfirmation(true);
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
                router.push('/dashboard');
            } else {
                setError('Failed to create user profile. Please try again.');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
            console.error(error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Complete Your Profile</h1>
                <p>Please fill out all required information below.</p>
            </header>

            <div className={styles.profileEdit}>

                <form className={styles.profileEditForm} onSubmit={handleSubmit}>
                    <label htmlFor="licenseNumber">Driver&apos;s License Number:</label>
                    <input
                        type="text"
                        id="licenseNumber"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="firstName">First Name:</label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="lastName">Last Name:</label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="phoneNumber">Phone Number:</label>
                    <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="address">Address:</label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="city">City:</label>
                    <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="state">State:</label>
                    <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                    />

                    <label htmlFor="zipCode">Zip Code:</label>
                    <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                    />

                    {error && (
                        <div className="text-red-500 text-sm mb-4">{error}</div>
                    )}

                    <button type="submit" className={styles.saveButton}>
                        Complete Profile
                    </button>

                    {showConfirmation && (
                        <div className={styles.confirmation}>Profile created successfully! Redirecting...</div>
                    )}
                </form>
            </div>
        </div>
    );
}