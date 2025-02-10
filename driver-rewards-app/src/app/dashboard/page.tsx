'use client';
import '@/app/globals.css';
import styles from './dashboard.module.css';

import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
Amplify.configure(awsExports);

export default function Dashboard() {
    const [userPoints, setUserPoints] = useState<number | null>(null); 
    //const [sponsorName, setSponsorName] = useState<string | null>(null);
    // Create DynamoDB client instance
    async function getAuthenticatedClients() {
        const { credentials } = await fetchAuthSession();
        
        const dynamoDBClient = new DynamoDBClient({
          region: 'us-east-2',
          credentials: credentials
        });
      
        return { dynamoDBClient };
      }

    const fetchUserPoints = async () => {
        try {
            const { dynamoDBClient } = await getAuthenticatedClients();
            const session = await fetchAuthSession();
            const username = session?.tokens?.accessToken?.payload?.username as string;
    
            const userParams = {
                TableName: 'Team06-Drivers',
                IndexName: 'username-index', // Use the GSI on the username attribute
                KeyConditionExpression: 'username = :username',
                ExpressionAttributeValues: { ':username': { S: username } },
                ProjectionExpression: 'sponsorCompany, sponsorMap'
            };
    
            const userResponse = await dynamoDBClient.send(new QueryCommand(userParams));
    
            if (userResponse.Items && userResponse.Items.length > 0) {
                const sponsorCompany = userResponse.Items[0].sponsorCompany?.S;
                //setSponsorName(sponsorCompany || null);
    
                // Retrieve points for the sponsor from sponsorMap
                if (sponsorCompany && userResponse.Items[0].sponsorMap?.M?.[sponsorCompany]?.M?.points?.N) {
                    const points = parseInt(userResponse.Items[0].sponsorMap.M[sponsorCompany].M.points.N, 10);
                    setUserPoints(points);
                } else {
                    setUserPoints(0); // Default if no points are found
                }
            }
        } catch (error) {
            console.error("Error fetching user points:", error);
        }
    };

    useEffect(() => {
        fetchUserPoints();
    }, []);

    function ProfileInfoContent() {
        const [logged_in, set_logged_in] = useState(false);
        const [user_name, set_user_name] = useState("undefined")
        const [user_email, set_user_email] = useState("undefined")
        const [user_birthdate, set_user_birthdate] = useState("undefined")

        useEffect(() => {
            // Define an inner async function
            const fetchData = async () => {
                try {
                    // Your asynchronous code here
                    console.log("Fetching Auth Session")
                    // const session = await fetchAuthSession();
                    const attributes = await fetchUserAttributes();

                    set_user_name(attributes.name ?? "undefined")
                    set_user_email(attributes.email ?? "undefined")
                    set_user_birthdate(attributes.birthdate ?? "undefined")
                    set_logged_in(true)
                } catch (error) {
                    console.error('Failed to fetch data', error, "\nAssumed User not logged in");
                }
            };
            fetchData()
                .catch(console.error);

        }, []);

        if (logged_in) {
            return (
                <section className={styles.profile_info}>
                    <h2 className={styles.header3}>Profile Information</h2>
                    <p><strong>Name:</strong> {user_name}</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Birthdate:</strong> {user_birthdate}</p>
                </section>
            )
        } else {
            return (
                <section className={styles.profile_info}>

                </section>
            )
        }
    }

    return (
        <div>
            <header className={styles.dashboard_header}>
                <h1>Welcome to Your Dashboard</h1>
                <p>Track your rewards and profile information here.</p>
            </header>

            <div className={styles.content_container}>

                <aside className={[styles.sidebar, styles.left_sidebar].join(" ")}>
                    <h3 className={styles.header3}>Quick Links</h3>
                    <ul>
                        <li><Link href="/rewards">Rewards Catalog</Link></li>
                        <li><a href="#">FAQ</a></li>
                        <li><a href="#">Special Offers</a></li>
                        <li><a href="/support">Contact Support</a></li>
                    </ul>
                </aside>

                <div className={styles.main_content}>
                    <ProfileInfoContent />

                    <section className={styles.points}>
                        <h2>You have {userPoints} points</h2>
                    </section>


                    <section className={styles.news_feed}>
                        <h2 className={styles.header3}>News Feed</h2>
                        <ul>
                            <li>
                                <h3 >New Rewards Added!</h3>
                                <p>We&apos;ve added new rewards to the catalog, including charities and music. Check them out in the <a href="/rewards">Rewards Catalog</a>!</p>
                                <span className={styles.news_date}>October 20, 2024</span>
                            </li>
                            <li>
                                <h3>Earn Double Points This Weekend!</h3>
                                <p>Earn twice the points on all activities this weekend! Don&apos;t miss out on this limited-time offer.</p>
                                <span className={styles.news_date}>October 18, 2024</span>
                            </li>
                            <li>
                                <h3>Introducing Monthly Challenges</h3>
                                <p>Take on our new monthly challenges to earn extra points and win exclusive rewards. Complete the first challenge by the end of October!</p>
                                <span className={styles.news_date}>October 15, 2024</span>
                            </li>
                            <li>
                                <h3>Referral Bonus</h3>
                                <p>Invite friends to join the rewards program and earn bonus points for each referral!</p>
                                <span className={styles.news_date}>October 10, 2024</span>
                            </li>
                        </ul>
                    </section>

                </div>

                <aside className={[styles.sidebar, styles.right_sidebar].join(" ")}>
                    <h3 className={styles.header3}>Special Offer</h3>
                    <p>Earn double points this weekend! Shop now and maximize your rewards.</p>
                    <a href="#" className={styles.promo_button}>Shop Now</a>
                </aside>

            </div>

        </div>
    );
}

