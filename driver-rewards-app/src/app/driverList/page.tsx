'use client';

import '../styles/styles.css';
import styles from './driverList.module.css';

import React, { useEffect, useState } from 'react';
import { DynamoDBClient, QueryCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { fetchAuthSession, signOut, signIn, confirmSignIn } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


type Driver = {
    licenseID: string;
    address: string;
    city: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNum: string;
    points: number;
    state: string;
    username: string;
    zipCode: string;
};



type Application = {
    sponsor_id: string;
    user_id: string;
    created_timestamp: string;
    status: string;
    updated_timestamp: string;
    notes: string;
};

export default function DriverList() {
    const router = useRouter();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    //const [error, setError] = useState<string | null>(null);
    const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [sponsorID, setSponsorID] = useState<string | null>(null);


    async function getAuthenticatedClients() {
        const { credentials } = await fetchAuthSession();
        
        const dynamoDBClient = new DynamoDBClient({
          region: 'us-east-2',
          credentials: credentials
        });
      
        const cognitoIdentityServiceProvider = new CognitoIdentityServiceProvider({
          region: 'us-east-2',
          credentials: credentials
        });
      
        return { dynamoDBClient, cognitoIdentityServiceProvider };
      }

    useEffect(() => {
        if (sponsorID) {
            console.log("Calling fetchApplications because sponsorID is set:", sponsorID);
            fetchApplications();
        } else {
            console.log("Sponsor ID is still not set.");
        }
    }, [sponsorID]);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                // Step 1: Fetch the current session to get the logged-in user's username
                const session = await fetchAuthSession();
                const username = session?.tokens?.accessToken?.payload?.username;

                if (!username) {
                    throw new Error("Username not found.");
                }

                // Step 1: Query DynamoDB for the sponsor's company
                const sponsorParams = {
                    TableName: 'Team06-Drivers', // Replace with your actual table name
                    IndexName: 'username-index', // Adjust if your username uses an index
                    KeyConditionExpression: 'username = :usernameVal',
                    ExpressionAttributeValues: {
                        ':usernameVal': { S: String(username) }
                    },
                    ProjectionExpression: 'sponsorCompany',
                };

                const { dynamoDBClient } = await getAuthenticatedClients();
                const sponsorData = await dynamoDBClient.send(new QueryCommand(sponsorParams));
                const sponsorCompany = sponsorData.Items?.[0]?.sponsorCompany?.S;


                if (!sponsorCompany) {
                    throw new Error("Sponsor's company not found.");
                }



                if (sponsorData.Items && sponsorData.Items.length > 0) {
                    const user = sponsorData.Items[0];

                    // Set user points
                    //const points = Number(user.points?.N || 0);
                    //setSponsorName(user.sponsorCompany?.S || '');


                    // Retrieve and set sponsor information
                    const sponsorCompany = user.sponsorCompany?.S;


                    if (sponsorCompany) {
                        const sponsorParams = {
                            TableName: 'Team06-Sponsors',
                            IndexName: 'sponsorNameIndex',
                            KeyConditionExpression: 'SponsorName = :sponsorName',
                            ExpressionAttributeValues: { ':sponsorName': { S: sponsorCompany } },
                        };

                        const sponsorResponse = await dynamoDBClient.send(new QueryCommand(sponsorParams));
                        if (sponsorResponse.Items && sponsorResponse.Items.length > 0) {
                            const sponsor = sponsorResponse.Items[0];
                            const fetchedSponsorID = sponsor.SponsorID?.S || '';
                            setSponsorID(fetchedSponsorID);
                        }
                    }
                } else {
                    console.warn('User data not found in DynamoDB for the provided email.');
                }









                // Step 2: Scan for all drivers in that company by checking each driver's sponsorMap
                const driverParams = {
                    TableName: 'Team06-Drivers',
                    FilterExpression: `attribute_exists(sponsorMap.#sponsorCompany)`,
                    ExpressionAttributeNames: {
                        '#sponsorCompany': sponsorCompany, // Use sponsorCompany as a dynamic key in sponsorMap
                    },
                };

                const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));

                console.log("Raw driver data from ScanCommand:", driverData.Items);

                const driverList = driverData.Items?.map(item => ({
                    licenseID: item.LicenseID?.S || '',
                    address: item.address?.S || '',
                    city: item.city?.S || '',
                    email: item.email?.S || '',
                    firstName: item.firstName?.S || '',
                    lastName: item.lastName?.S || '',
                    phoneNum: item.phoneNum?.S || '',
                    state: item.state?.S || '',
                    username: item.username?.S || '',
                    zipCode: item.zipCode?.S || '',
                    points: parseInt(item.sponsorMap?.M?.[sponsorCompany]?.M?.points?.N || '0'),
                }));


                setDrivers(driverList || []);
                setFilteredDrivers(driverList || []);
            } catch (error) {
                //setError("Failed to fetch drivers.");
                console.error(error);
            }
        };

        fetchDrivers();
    }, []);

    // Filter drivers by search term
    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = drivers.filter(
            driver =>
                driver.firstName.toLowerCase().includes(lowerSearchTerm) ||
                driver.lastName.toLowerCase().includes(lowerSearchTerm)
        );
        setFilteredDrivers(filtered);
    }, [searchTerm, drivers]);


    const fetchApplications = async () => {
        console.log("fetchApplications function called");
        if (!sponsorID) {
            console.error("Sponsor ID is null. Cannot proceed with the query.");
            return;
        }

        try {
            console.log("Fetching applications for Sponsor ID:", sponsorID);

            const params = {
                TableName: 'Team06-DriverApplications',
                KeyConditionExpression: 'sponsor_id = :sponsorID',
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':sponsorID': { S: sponsorID },
                    ':status': { S: 'pending' },
                },
            };

            const { dynamoDBClient } = await getAuthenticatedClients();
            const response = await dynamoDBClient.send(new QueryCommand(params));

            console.log("Query Response:", JSON.stringify(response, null, 2));

            if (response.Items && response.Items.length > 0) {
                const applications = response.Items.map(item => ({
                    sponsor_id: item.sponsor_id.S || '',
                    user_id: item.user_id.S || '',
                    created_timestamp: item.created_timestamp.S || '',
                    status: item.status.S || 'pending',
                    updated_timestamp: item.updated_timestamp.S || '',
                    notes: item.notes.S || '',
                }));
                setApplications(applications);
            } else {
                console.warn("No pending applications found for Sponsor ID:", sponsorID);
                setApplications([]);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
        }
    };



    // Handle the decision to accept or reject an application

    const handleDecision = async (application: Application, decision: 'accepted' | 'rejected') => {
        try {
            const { dynamoDBClient } = await getAuthenticatedClients();
    
            // Update application status in the `Team06-DriverApplications` table
            const updateParams = {
                TableName: 'Team06-DriverApplications',
                Key: {
                    sponsor_id: { S: application.sponsor_id },
                    user_id: { S: application.user_id },
                },
                UpdateExpression: 'SET #status = :status, updated_timestamp = :timestamp',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: {
                    ':status': { S: decision },
                    ':timestamp': { S: new Date().toISOString() },
                },
            };
            await dynamoDBClient.send(new UpdateItemCommand(updateParams));
    
            if (decision === 'accepted') {
                // Step 1: Fetch sponsor name using sponsor_id
                const sponsorNameParams = {
                    TableName: 'Team06-Sponsors',
                    FilterExpression: 'SponsorID = :sponsorID',
                    ExpressionAttributeValues: { ':sponsorID': { S: application.sponsor_id } },
                    ProjectionExpression: 'SponsorName',
                };
    
                const sponsorResponse = await dynamoDBClient.send(new ScanCommand(sponsorNameParams));
                const sponsorName = sponsorResponse.Items?.[0]?.SponsorName?.S;
    
                if (!sponsorName) {
                    console.error('Sponsor name not found for the given SponsorID.');
                    return;
                }
    
                // Step 2: Fetch LicenseID using username (application.user_id)
                const fetchLicenseIDParams = {
                    TableName: 'Team06-Drivers',
                    IndexName: 'username-index', // Adjust this if your username uses a different index
                    KeyConditionExpression: 'username = :username',
                    ExpressionAttributeValues: {
                        ':username': { S: application.user_id },
                    },
                    ProjectionExpression: 'LicenseID',
                };
    
                const licenseResponse = await dynamoDBClient.send(new QueryCommand(fetchLicenseIDParams));
                const licenseID = licenseResponse.Items?.[0]?.LicenseID?.S;
    
                if (!licenseID) {
                    console.error('LicenseID not found for the given username.');
                    return;
                }
    
                // Step 3: Ensure sponsorMap is initialized
                const initializeSponsorMapParams = {
                    TableName: 'Team06-Drivers',
                    Key: { LicenseID: { S: licenseID } },
                    UpdateExpression: 'SET sponsorMap = if_not_exists(sponsorMap, :emptyMap)',
                    ExpressionAttributeValues: {
                        ':emptyMap': { M: {} },
                    },
                };
                await dynamoDBClient.send(new UpdateItemCommand(initializeSponsorMapParams));
    
                // Step 4: Update sponsorMap and sponsorCompany
                const sponsorUpdateParams = {
                    TableName: 'Team06-Drivers',
                    Key: { LicenseID: { S: licenseID } },
                    UpdateExpression: 'SET sponsorMap.#sponsorName = :sponsorData, sponsorCompany = :sponsorCompany',
                    ExpressionAttributeNames: { '#sponsorName': sponsorName },
                    ExpressionAttributeValues: {
                        ':sponsorData': {
                            M: {
                                company: { S: sponsorName },
                                points: { N: '0' },
                            },
                        },
                        ':sponsorCompany': { S: sponsorName },
                    },
                };
    
                const response = await dynamoDBClient.send(new UpdateItemCommand(sponsorUpdateParams));
                console.log('Sponsor map and sponsorCompany update response:', response);
    
                toast.success(`Application accepted for ${application.user_id}.`);
            } else {
                toast.success(`Application rejected for ${application.user_id}.`);
            }
    
            // Refresh applications after decision
            fetchApplications();
        } catch (error) {
            console.error('Error updating application:', error);
        }
    };
    


    const handleAssumeRole = async (driver: Driver) => {
        console.log(`Assuming role for driver: ${driver.username}`);
        alert(`Ready to assume role for: ${driver.firstName} ${driver.lastName}`);

        const { cognitoIdentityServiceProvider } = await getAuthenticatedClients();

        try {
            const response = await cognitoIdentityServiceProvider.adminInitiateAuth({
                UserPoolId: "us-east-2_OgBXsNrwH",
                ClientId: "28ajnq9pd6h5ae07og5fsd4jfm",
                AuthFlow: 'CUSTOM_AUTH',
                AuthParameters: {
                    USERNAME: driver.username,
                },
            }).promise();

            console.log('Custom auth initiated:', response.AuthenticationResult);



            // const authResponse = cognito.adminRespondToAuthChallenge({
            //     Session: response.Session,
            //     UserPoolId: "us-east-2_OgBXsNrwH",
            //     ClientId: "28ajnq9pd6h5ae07og5fsd4jfm",
            //     ChallengeName: response.ChallengeName,
            //     ChallengeResponses: {
            //         secret: "secret",
            //         USERNAME: driver.username,
            //         ANSWER: "bar",
            //         Session: response.Session,
            //     },

            // }).promise();

            // console.log('Custom auth processed:', (await authResponse).AuthenticationResult);

            const challengeResponse = 'secret';
            const username = driver.username;
            await signOut();
            const { nextStep } = await signIn({
                username,
                options: {
                    authFlowType: 'CUSTOM_WITHOUT_SRP'
                }
            });

            if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
                // to send the answer of the custom challenge
                await confirmSignIn({ challengeResponse });
            }
            router.push('/dashboard');
            return response;
        } catch (error) {
            console.error('Error initiating custom auth:', error);
            throw error;
        }
    }
    

    const handleEditUser = (user: Driver) => {
        if (!user.username) {
          console.error('No username provided');
          return;
        }
        router.push(`/adminList/edit?username=${encodeURIComponent(user.username)}`);
      };


    return (
        <div className={styles.background}>

            <header>
                <h1>List of Sponsored Drivers</h1>
                <h2>Click on a driver below to see more information.</h2>
            </header>

            <div className={styles.contentContainer}>
            <ToastContainer />

                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search by name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                {drivers.length > 0 ? (
                    <table className={styles.driverTable}>
                        <thead>
                            <tr>
                                <th>License ID</th>
                                <th>First Name</th>
                                <th>Last Name</th>
                                <th>Email</th>
                                <th>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDrivers.map((driver, index) => (
                                <tr key={index} onClick={() => setSelectedDriver(driver)}>
                                    <td>{driver.licenseID}</td>
                                    <td>{driver.firstName}</td>
                                    <td>{driver.lastName}</td>
                                    <td>{driver.email}</td>
                                    <td>{driver.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No drivers found for this sponsor.</p>
                )}

                {selectedDriver && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h3 className={styles.header3}>Driver Details</h3>
                            <p><strong>License ID:</strong> {selectedDriver.licenseID}</p>
                            <p><strong>First Name:</strong> {selectedDriver.firstName}</p>
                            <p><strong>Last Name:</strong> {selectedDriver.lastName}</p>
                            <p><strong>Email:</strong> {selectedDriver.email}</p>
                            <p><strong>Address:</strong> {selectedDriver.address}</p>
                            <p><strong>City:</strong> {selectedDriver.city}</p>
                            <p><strong>State:</strong> {selectedDriver.state}</p>
                            <p><strong>Zip Code:</strong> {selectedDriver.zipCode}</p>
                            <p><strong>Phone Number:</strong> {selectedDriver.phoneNum}</p>
                            <br />
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => handleAssumeRole(selectedDriver)}
                                >
                                    Assume Role
                                </button>
                                &nbsp;&nbsp;
                                <button
                                className={styles.closeButton}
                                onClick={() => handleEditUser(selectedDriver)}
                                >
                                Edit User
                                </button>
                                &nbsp;&nbsp;
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setSelectedDriver(null)}
                                >
                                    Close
                                </button>
                            </div>
                            <div className={styles.modalActions}>
              <br />

              </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.reviewApplications}>
                <h1>Review Driver Applications</h1>
                {applications.length === 0 ? (
                    <p>No pending applications.</p>
                ) : (
                    <ul>
                        {applications.map((app) => (
                            <li key={app.user_id}>
                                <p><strong>Driver ID:</strong> {app.user_id}</p>
                                <p><strong>Notes:</strong> {app.notes}</p>
                                <button id='appAccept' onClick={() => handleDecision(app, 'accepted')}>Accept</button>
                                <button id='appReject' onClick={() => handleDecision(app, 'rejected')}>Reject</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </div>
    );

}