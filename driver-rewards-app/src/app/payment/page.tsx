// payment/page.tsx

'use client';
import React, { useState, useEffect } from 'react';
import styles from './payment.module.css';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';

// Initialize DynamoDB client
async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDBClient };
  }

// Function to fetch billing information
const fetchBillingInfo = async (sponsorID: string) => {
    const params = {
        TableName: 'SponsorBilling',
        Key: { SponsorID: sponsorID }
    };

    try {
        const { dynamoDBClient } = await getAuthenticatedClients();
        const { Item } = await dynamoDBClient.send(new GetCommand(params));
        return Item;
    } catch (error) {
        console.error('Error fetching billing information:', error);
        return null;
    }
};

const PaymentPage: React.FC = () => {
    const [paymentInfo, setPaymentInfo] = useState({
        amountDue: 100, // Sample amount due
        dueDate: '2024-12-01',
        lastPaid: '2024-10-01',
        paymentStatus: 'Pending'
    });
    const [billingInfo, setBillingInfo] = useState<{
        cardHolderName: string;
        cardNumber: string;
        expiryDate: string;
        billingAddress: string;
    } | null>(null);
    const router = useRouter();

    // Fetch billing info when component mounts
    useEffect(() => {
        const sponsorID = 'example-sponsor-id'; // Replace with actual sponsor ID
        fetchBillingInfo(sponsorID).then(data => {
            if (data) {
                setBillingInfo({
                    cardHolderName: data.cardHolderName,
                    cardNumber: data.cardNumber.replace(/\d(?=\d{4})/g, "*"), // Mask card number
                    expiryDate: data.expiryDate,
                    billingAddress: data.billingAddress,
                });
            }
        });
    }, []);

    const processPayment = async () => {
        // Placeholder for actual payment processing logic
        alert('Processing payment...');

        // Simulate successful payment processing
        setTimeout(() => {
            setPaymentInfo(prev => ({
                ...prev,
                lastPaid: new Date().toISOString().split('T')[0], // Update last paid date
                paymentStatus: 'Paid'
            }));
            alert('Payment successful!');
        }, 1000);
    };

    const handleBillingRedirect = () => {
        router.push('/billing');  // Redirect to billing page for updating information
    };

    return (
        <div className={styles.paymentContainer}>
            <div className={styles.paymentCard}>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Amount Due:</span>
                    <span className={styles.value}>${paymentInfo.amountDue.toFixed(2)}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Due Date:</span>
                    <span className={styles.value}>{paymentInfo.dueDate}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Last Paid:</span>
                    <span className={styles.value}>{paymentInfo.lastPaid}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Payment Status:</span>
                    <span className={styles.value}>{paymentInfo.paymentStatus}</span>
                </div>

                {/* Display Billing Info */}
                {billingInfo && (
                    <>
                        <h2 className={styles.subHeader}>Billing Information</h2>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Card Holder:</span>
                            <span className={styles.value}>{billingInfo.cardHolderName}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Card Number:</span>
                            <span className={styles.value}>{billingInfo.cardNumber}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Expiry Date:</span>
                            <span className={styles.value}>{billingInfo.expiryDate}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Billing Address:</span>
                            <span className={styles.value}>{billingInfo.billingAddress}</span>
                        </div>
                    </>
                )}

                <div className={styles.buttonGroup}>
                    <button className={styles.payButton} onClick={processPayment}>Process Payment</button> &nbsp;
                    <button className={styles.updateButton} onClick={handleBillingRedirect}>Update Billing Info</button>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
