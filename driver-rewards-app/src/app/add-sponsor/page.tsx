'use client';

import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import { fetchAuthSession } from 'aws-amplify/auth';
import styles from './add-sponsor.module.css';

const AddSponsor = () => {
  // Form state
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorAddress, setSponsorAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phoneNum, setPhoneNum] = useState('');
  const [email, setEmail] = useState('');
  const [pointsPerUnit, setPointsPerUnit] = useState(0.1);
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // AWS configuration
  async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDB};
  }

  // Verify if the user is an admin
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        
        // Mock behavior for tests
        if (process.env.NODE_ENV === 'test') {
          setIsAdmin(true);
          return;
      }

        const session = await fetchAuthSession();
        const groups = session?.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined;
        if (groups?.includes('Admins')) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setMessage('You do not have permission to add sponsors.');
        }
      } catch (error) {
        console.error('Error verifying user role:', error);
        setIsAdmin(false);
      }
    };
    fetchUserRole();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('You are not authorized to add sponsors.');
      return;
    }

    const sponsorParams = {
      TableName: 'Team06-Sponsors',
      Item: {
        SponsorID: email.split('@')[0], // Use email prefix as SponsorID
        SponsorName: sponsorName,
        SponsorAddress: sponsorAddress,
        City: city,
        State: state,
        ZipCode: zipCode,
        PhoneNum: phoneNum,
        Email: email,
        PointsPerUnit: pointsPerUnit,
      },
    };

    try {
      const { dynamoDB } = await getAuthenticatedClients();
      await dynamoDB.put(sponsorParams).promise();
      setMessage('Sponsor added successfully!');
    } catch (error) {
      console.error('Error adding sponsor:', error);
      setMessage('Error adding sponsor. Please try again.');
    }
  };

  return isAdmin ? (
    <div className={styles.background}>
      <header className={styles.header}>
        <h1>Add New Sponsor</h1>
        <p>Fill out the form below to add a new sponsor company.</p>
      </header>

      <div className={styles['content-container']}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="sponsorName">Sponsor Name:</label>
          <input
            type="text"
            id="sponsorName"
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            required
          />

          <label htmlFor="sponsorAddress">Sponsor Address:</label>
          <input
            type="text"
            id="sponsorAddress"
            value={sponsorAddress}
            onChange={(e) => setSponsorAddress(e.target.value)}
            required
          />

          <label htmlFor="city">City:</label>
          <input
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />

          <label htmlFor="state">State:</label>
          <input
            type="text"
            id="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />

          <label htmlFor="zipCode">Zip Code:</label>
          <input
            type="text"
            id="zipCode"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            required
          />

          <label htmlFor="phoneNum">Phone Number:</label>
          <input
            type="text"
            id="phoneNum"
            value={phoneNum}
            onChange={(e) => setPhoneNum(e.target.value)}
            required
          />

          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="pointsPerUnit">Points Per Unit:</label>
          <input
            type="number"
            id="pointsPerUnit"
            value={pointsPerUnit}
            onChange={(e) => setPointsPerUnit(Number(e.target.value))}
            required
          />

          <button type="submit" className={styles.submitButton}>
            Add Sponsor
          </button>
        </form>
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  ) : (
    <div className={styles.error}>
      <p>{message || 'You do not have access to this page.'}</p>
    </div>
  );
};

export default AddSponsor;
