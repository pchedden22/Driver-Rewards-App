'use client';
import '@/app/globals.css';
import styles from './billing.module.css';
import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { fetchAuthSession } from 'aws-amplify/auth';  // Adjusted import

Amplify.configure(awsExports);

async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDBClient };
  }


const storeBillingInfo = async (billingInfo: { name: string; cardNumber: string; expiryDate: string; cvc: string; billingAddress: string; userID: string }) => {
    const params = {
        TableName: 'Team06-Billing',
        Item: {
            BillingID: `billing-${Date.now()}`,
            Name: billingInfo.name,
            CardNumber: billingInfo.cardNumber,
            ExpiryDate: billingInfo.expiryDate,
            CVC: billingInfo.cvc,
            BillingAddress: billingInfo.billingAddress,
            UserID: billingInfo.userID,  // Add the userID to the DynamoDB entry
        },
    };

    try {
        const { dynamoDBClient } = await getAuthenticatedClients();
        await dynamoDBClient.send(new PutCommand(params));
        alert('Billing information submitted successfully!');
    } catch (err) {
        console.error('Error', err);
        alert('There was an error submitting your billing information. Please try again.');
    }
};
console.log("Test")
const Billing: React.FC = () => {
    const [submittedInfo, setSubmittedInfo] = useState<null | { name: string; cardNumber: string; expiryDate: string; cvc: string; billingAddress: string; userID: string }>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const form = event.target as HTMLFormElement;
        const billingInfo = {
            name: (form.elements.namedItem('name') as HTMLInputElement).value,
            cardNumber: (form.elements.namedItem('card-number') as HTMLInputElement).value,
            expiryDate: (form.elements.namedItem('expiry-date') as HTMLInputElement).value,
            cvc: (form.elements.namedItem('cvc') as HTMLInputElement).value,
            billingAddress: (form.elements.namedItem('billing-address') as HTMLInputElement).value,
            userID: "", // Placeholder for user ID that will be fetched from session
        };

        try {
            // Fetch user session to get the username (userID)
            const session = await fetchAuthSession();
            const tokenPayload = session?.tokens?.accessToken?.payload;
            console.log("Token Payload:", tokenPayload);
            const userID = tokenPayload?.username as string; // Assumes 'username' holds the unique identifier

            if (!userID) {
                throw new Error("User not authenticated");
            }

            billingInfo.userID = userID;
            console.log(userID);
            // Store billing info in DynamoDB with userID
            await storeBillingInfo(billingInfo);
            
            // Update state to display the submitted info
            setSubmittedInfo(billingInfo);
        } catch (error) {
            console.error('Error fetching user session:', error);
            alert('Could not retrieve user session. Please log in again.');
        }
    };

    return (
        <div>
            <header>
                <h1>User Billing</h1>
                <p>Manage your billing information here!</p>
            </header>

            <div className={styles.mainBackground}>
            <div className={styles.contentContainer}>
                <div className={styles.billingForm}>
                    <h2 className={styles.header3}>Billing Information</h2>
                    <form id="billingForm" onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Name on Card</label>
                            <input type="text" id="name" name="name" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="card-number">Card Number</label>
                            <input type="text" id="card-number" name="card-number" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="expiry-date">Expiry Date</label>
                            <input type="text" id="expiry-date" name="expiry-date" placeholder="MM/YY" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="cvc">CVC</label>
                            <input type="text" id="cvc" name="cvc" required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="billing-address">Billing Address</label>
                            <input type="text" id="billing-address" name="billing-address" required />
                        </div>
                        <button type="submit" className={styles.button}>Submit</button>
                    </form>

                    {/* Display submitted information */}
                    {submittedInfo && (
                        <div className={styles.submittedInfo}>
                            <h3 className={styles.header3}>Submitted Billing Information</h3>
                            <ul>
                                <li><strong>Name:</strong> {submittedInfo.name}</li>
                                <li><strong>Card Number:</strong> {submittedInfo.cardNumber}</li>
                                <li><strong>Expiry Date:</strong> {submittedInfo.expiryDate}</li>
                                <li><strong>CVC:</strong> {submittedInfo.cvc}</li>
                                <li><strong>Billing Address:</strong> {submittedInfo.billingAddress}</li>
                                <li><strong>User ID:</strong> {submittedInfo.userID}</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

        </div>
        </div>
        
    );
};

export default Billing;
