'use client';

import '../styles/styles.css';
import styles from './points.module.css';

import React, { useEffect, useState } from 'react';
import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function DriverList() {
    const [userPoints, setUserPoints] = useState<number | null>(null);
    const [pointsWorth, setPointsWorth] = useState<string>("Loading...");
    //const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
    const [sponsorCompany, setSponsorCompany] = useState<string | null>(null);
    const [pointsPerUnit, setPointsPerUnit] = useState<number>(1);
    const [licenseID, setlicenseID] = useState('');
    const [filteredTransactions, setFilteredTransactions] = useState<FilteredTransaction[]>([]);

    //const [activeSponsor, setActiveSponsor] = useState<string>(""); 
    //const [sponsorList, setSponsorList] = useState<string[]>([]); 
    //const [filterType, setFilterType] = useState<"All" | "Points Added" | "Points Spent">("All");
    const [purchasedItems, setPurchasedItems] = useState<Item[]>([]);


    //interface Transaction {
        //date: string;
       // amount: number;
        //description: string;
       // type: "Points Added" | "Points Spent";
    //}

    interface FilteredTransaction {
        date: string;
        amount: number;
        description: string;
        type: string;
        sponsorCompany: string; // Include sponsorCompany if filtering by sponsor
    }
    
    
    interface Item {
        itemId: string;
        itemName: string;
        price: number;
        redeemedDate: string;
        status: string;
        sponsorCompany: string;
    }

    interface DynamoDBItem {
        M: {
            itemId?: { S?: string };
            itemName?: { S?: string };
            price?: { N?: string };
            redeemedDate?: { S?: string };
            status?: { S?: string };
            sponsorCompany?: { S?: string };
        };
    }
    

    async function getAuthenticatedClients() {
        const { credentials } = await fetchAuthSession();
        
        const dynamoDBClient = new DynamoDBClient({
          region: 'us-east-2',
          credentials: credentials
        });
      
        return { dynamoDBClient };
      }

    useEffect(() => {
        if (licenseID && sponsorCompany) {
            fetchPurchasedItems(licenseID, pointsPerUnit, sponsorCompany);
        }
    }, [licenseID, sponsorCompany, pointsPerUnit]);
    

    useEffect(() => {
        const fetchData = async () => {
            try {
                const session = await fetchAuthSession();
                const username = session?.tokens?.accessToken?.payload?.username;
        
                if (!username) throw new Error("Username not found.");

                // Fetch user's sponsor information dynamically
                const sponsorData = await getUserSponsorData(username.toString());

                // Check if sponsorMap has entries
                if (sponsorData.sponsorMap && Object.keys(sponsorData.sponsorMap).length > 0) {
                    const sponsors = Object.keys(sponsorData.sponsorMap);
                    
                    // Set active sponsor based on sponsorCompany or default to the first sponsor
                    const defaultSponsor = sponsorData.sponsorCompany || sponsors[0];
                    setSponsorCompany(defaultSponsor);
                    //setActiveSponsor(defaultSponsor); // This will be the currently selected sponsor
    
                    // Set user points based on the selected sponsor
                    setUserPoints(sponsorData.sponsorMap[defaultSponsor] || 0);
                } else {
                    console.error("Sponsor map is empty or not found.");
                }
    
                if (sponsorData.licenseID && sponsorCompany) {
                    await fetchTransactions(sponsorData.licenseID, sponsorCompany); // Fetch point transactions
                    await fetchPurchasedItems(sponsorData.licenseID, pointsPerUnit, sponsorCompany); // Fetch purchased items
                }

                await fetchExchangeRates();
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        
        fetchData();
    }, []);

    
    useEffect(() => {
        const fetchPPU = async () => {
            if (!sponsorCompany) return; // Avoid unnecessary fetches
            try {
                const sponsorParams = {
                    TableName: "Team06-Sponsors",
                    IndexName: "sponsorNameIndex",
                    KeyConditionExpression: "SponsorName = :sponsorName",
                    ExpressionAttributeValues: {
                        ":sponsorName": { S: sponsorCompany },
                    },
                    ProjectionExpression: "PointsPerUnit",
                };
                
                const { dynamoDBClient } = await getAuthenticatedClients();
                const sponsorData = await dynamoDBClient.send(new QueryCommand(sponsorParams));
                const updatedPPU = parseFloat(sponsorData.Items?.[0]?.PointsPerUnit?.N || "1");
                console.log("Fetched updated PPU:", updatedPPU);
                setPointsPerUnit(updatedPPU);
    
                setPointsPerUnit(updatedPPU); // Update the state
            } catch (error) {
                console.error("Failed to fetch or update PPU:", error);
            }
        };
    
        fetchPPU();
    }, []);
    
    



    useEffect(() => {
        calculatePointsWorth();
    }, [exchangeRates, selectedCurrency, userPoints]);

    const getUserSponsorData = async (username: string): Promise<{
        sponsorCompany: string | undefined;
        sponsorID: string | undefined;
        points: number | undefined;
        licenseID: string | undefined;
        sponsorMap: Record<string, number> | undefined;
    }> => {
        // Query Team06-Drivers table to get sponsor company, points, and LicenseID
        const params = {
            TableName: 'Team06-Drivers',
            IndexName: 'username-index',
            KeyConditionExpression: 'username = :usernameVal',
            ExpressionAttributeValues: {
                ':usernameVal': { S: username }
            },
            ProjectionExpression: 'sponsorCompany, LicenseID, sponsorMap',
        };

        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new QueryCommand(params));
        const sponsorCompany = data.Items?.[0]?.sponsorCompany?.S;
        //const points = parseInt(data.Items?.[0]?.points?.N || "0");
        const licenseID = data.Items?.[0]?.LicenseID?.S;

        if(licenseID)
        {
            setlicenseID(licenseID.toString());
        }

        // Check and parse sponsorMap
        const sponsorMapRaw = data.Items?.[0]?.sponsorMap?.M;
        const sponsorMap: Record<string, number> = sponsorMapRaw
        ? Object.fromEntries(
            Object.entries(sponsorMapRaw).map(([key, value]) => {
                const pointValue = parseInt(value?.M?.points?.N || "0");
                console.log(`Sponsor: ${key}, Points: ${pointValue}`);
                return [key, pointValue];
            })
        )
        : {};
    console.log("Parsed sponsor map:", sponsorMap);

        if (!sponsorCompany) return { sponsorCompany: undefined, sponsorID: undefined, points: undefined, licenseID: undefined, sponsorMap: undefined };



        // Query Team06-Sponsors table to get SponsorID based on sponsorCompany name
            const sponsorParams = {
                TableName: 'Team06-Sponsors',
                IndexName: 'sponsorNameIndex',
                KeyConditionExpression: 'SponsorName = :sponsorName',
                ExpressionAttributeValues: {
                    ':sponsorName': { S: sponsorCompany },
                },
                ProjectionExpression: 'SponsorID, PointsPerUnit',
            };

            const sponsorData = await dynamoDBClient.send(new QueryCommand(sponsorParams));
            const sponsorID = sponsorData.Items?.[0]?.SponsorID?.S;
            const pointsPerUnit = parseFloat(sponsorData.Items?.[0]?.PointsPerUnit?.N || '1'); // Use '1' as a fallback
            console.log("PPU:",pointsPerUnit);
            setPointsPerUnit(pointsPerUnit);  // Update the state

            return { sponsorCompany, sponsorID, points: undefined, licenseID, sponsorMap };
        };

        useEffect(() => {
            if (licenseID && sponsorCompany) {
                fetchTransactions(licenseID, sponsorCompany);
            }
        }, [licenseID, sponsorCompany]);
        
        const fetchTransactions = async (licenseID: string, sponsorCompany: string) => {
            const params = {
                TableName: 'Team06-PTransactions',
                KeyConditionExpression: 'LicenseID = :licenseID',
                ExpressionAttributeValues: {
                    ':licenseID': { S: licenseID }
                },
                ScanIndexForward: false
            };
            
            const { dynamoDBClient } = await getAuthenticatedClients();
            const data = await dynamoDBClient.send(new QueryCommand(params));
        
            const filteredTransactions = (data.Items || [])
                .map(item => ({
                    date: new Date(parseInt(item.timestamp?.N || "0")).toLocaleDateString(),
                    amount: parseInt(item.amount?.N || "0"),
                    description: item.description?.S || "No description",
                    type: parseInt(item.amount?.N || "0") > 0 ? "Points Added" : "Points Spent",
                    sponsorCompany: item.sponsorCompany?.S || "Unknown Sponsor" // Include sponsorCompany field
                }))
                .filter(transaction => transaction.sponsorCompany === sponsorCompany); // Filter by sponsorCompany
        
            setFilteredTransactions(filteredTransactions);
        };
        

    const fetchPurchasedItems = async (licenseID: string, currentPPU: number, sponsorCompany: string) => {
        const params = {
            TableName: 'Team06-Drivers',
            KeyConditionExpression: 'LicenseID = :licenseID',
            ExpressionAttributeValues: {
                ':licenseID': { S: licenseID },
            },
            ProjectionExpression: '#itm',
            ExpressionAttributeNames: {
                '#itm': 'items', // Alias for the "items" attribute
            },
        };
        
        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new QueryCommand(params));
    
        // Ensure correct typing and fetch only relevant items
        const items = (data.Items?.[0]?.items?.L || []) as DynamoDBItem[];
    
        const filteredItems = items
            .map((item: DynamoDBItem) => ({
                itemId: item.M.itemId?.S || "Unknown ID",
                itemName: item.M.itemName?.S || "Unknown Item",
                price: Math.ceil(parseFloat(item.M.price?.N || "0") * currentPPU),
                redeemedDate: item.M.redeemedDate?.S
                    ? new Date(item.M.redeemedDate.S).toLocaleDateString()
                    : "Invalid Date",
                status: item.M.status?.S || "Purchase success!",
                sponsorCompany: item.M.sponsorCompany?.S || "Unknown Sponsor", // Fetch sponsor info
            }))
            .filter((item) => item.sponsorCompany === sponsorCompany); // Filter by current sponsor
    
        setPurchasedItems(filteredItems);
    };
    
    
    
    
    
    
    
    

    const fetchExchangeRates = async () => {
        try {
            const response = await fetch('https://v6.exchangerate-api.com/v6/518f3466592b811016e4b719/latest/USD');
            const data = await response.json();
            setExchangeRates(data.conversion_rates);
        } catch (err) {
            console.error("Error fetching exchange rates:", err);
        }
    };

    const calculatePointsWorth = () => {
        if (userPoints !== null && pointsPerUnit > 0 && exchangeRates[selectedCurrency]) {
            const pointsInUSD = userPoints / pointsPerUnit;
            const convertedValue = pointsInUSD * exchangeRates[selectedCurrency];
            setPointsWorth(`Your points are worth ${convertedValue.toFixed(2)} ${selectedCurrency}.`);
        }
    };

    const handleRefund = async (itemId: string) => {
        if (!userPoints || !sponsorCompany || !licenseID) {
            console.error("Missing required information for refund.");
            return;
        }
    
        try {
            // Fetch existing items
            const params = {
                TableName: "Team06-Drivers",
                KeyConditionExpression: "LicenseID = :licenseID",
                ExpressionAttributeValues: {
                    ":licenseID": { S: licenseID },
                },
                ProjectionExpression: "#itemsAlias",
                ExpressionAttributeNames: {
                    "#itemsAlias": "items", // Alias for the "items" attribute
                },
            };
            
            const { dynamoDBClient } = await getAuthenticatedClients();
            const data = await dynamoDBClient.send(new QueryCommand(params));
            const currentItems = (data.Items?.[0]?.items?.L || []) as DynamoDBItem[];
    
            const itemToRefund = currentItems.find((item) => item.M?.itemId?.S === itemId);
    
            if (!itemToRefund) {
                console.error("Item not found for refund.");
                return;
            }
    

            const units = Math.ceil(parseFloat(itemToRefund.M?.price?.N || "0"));
const itemPoints = units * pointsPerUnit;



            const updatedItems = currentItems.filter((item) => item.M?.itemId?.S !== itemId);
    
            // Update DynamoDB
            const updateParams = {
                TableName: "Team06-Drivers",
                Key: { LicenseID: { S: licenseID } },
                UpdateExpression: `
                    SET sponsorMap.#sponsor.points = sponsorMap.#sponsor.points + :refundedPoints,
                        #itemsAlias = :updatedItems`,
                ExpressionAttributeNames: {
                    "#sponsor": sponsorCompany,
                    "#itemsAlias": "items", // Use the alias here
                },
                ExpressionAttributeValues: {
                    ":refundedPoints": { N: itemPoints.toString() },
                    ":updatedItems": {
                        L: updatedItems.map(item => ({
                            M: {
                                itemId: { S: item.M.itemId?.S || "Unknown ID" },
                                itemName: { S: item.M.itemName?.S || "Unknown Item" },
                                price: { N: item.M.price?.N || "0" },
                                redeemedDate: { S: item.M.redeemedDate?.S || "Invalid Date" },
                                status: { S: item.M.status?.S || "Purchase success!" },
                            },
                        })),
                    },
                },
            };
    
            await dynamoDBClient.send(new UpdateItemCommand(updateParams));
    
            // Update UI
            setUserPoints((prevPoints) => (prevPoints || 0) + itemPoints);
            setPurchasedItems((prevItems) =>
                prevItems.map((item) =>
                    item.itemId === itemId ? { ...item, status: "Purchase Refunded" } : item
                )
            );

            console.log("Refund Calculation Debug:");
console.log("Price:", itemToRefund.M?.price?.N);
console.log("PPU:", pointsPerUnit);
console.log("Item Points (Ceil):", itemPoints);

    
            alert("Refund processed successfully.");
        } catch (error) {
            console.error("Error processing refund:", error);
            alert("Refund failed. Please try again.");
        }
    };
    
    
      
      
      
      
      

    return (
        <div>
            <header>
                <h1>Driver Points and Purchase History</h1>
                <h2>View your points transactions and purchase history</h2>
            </header>

            <div className={styles.contentContainer}>
                <div className={styles.pointsDisplay}>
                    <h2>Your Points</h2>
                    <section className="points">
                        <h2>{userPoints ? `${userPoints} points` : "Loading..."}</h2>
                    </section>
                </div>

                <div className={styles.currencyConversion}>
                    <h2 className={styles.header3}>Points Value in Real Currency</h2>
                    <p className={styles.blackText}>{pointsWorth}</p>
                    <label htmlFor="currencySelect">Choose Currency:</label>
                    <select
                        id="currencySelect"
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                    >
                        {Object.keys(exchangeRates).map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                        ))}
                    </select>
                </div>



                <div className={styles.contentContainer}>
                    
                    {/* Points Transactions */}
                    <div className={styles.transactionsDisplay}>
                        <h2>Point Transactions</h2>
                        <table className={styles.transactionsTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((filteredTransactions, index) => (
                                        <tr key={index}>
                                            <td>{filteredTransactions.date}</td>
                                            <td>{filteredTransactions.amount} points</td>
                                            <td>{filteredTransactions.description}</td>
                                            <td>{filteredTransactions.type}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4}>No transactions found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <br></br>

                    {/* Purchased Items */}
                    <div className={styles.itemsDisplay}>
                        
                    <h2 className={styles.header2}>Purchase History</h2>
                        <table className={styles.transactionsTable}>
                            <thead>
                                <tr>
                                    <th>Item ID</th>
                                    <th>Item Name</th>
                                    <th>Price</th>
                                    <th>Redeemed Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchasedItems.length > 0 ? (
                                    purchasedItems.map((item, index) => {
                                    const redeemedDate = new Date(item.redeemedDate);
                                    const refundEligible = (new Date().getTime() - redeemedDate.getTime()) / (1000 * 60 * 60 * 24) <= 2;

                                    return (
                                        <tr key={index}>
                                        <td>{item.itemId}</td>
                                        <td>{item.itemName}</td>
                                        <td>{(item.price)} points</td>
                                        <td>{item.redeemedDate}</td>
                                        <td>{item.status}</td>
                                        <td>
                                            {refundEligible && item.status !== "Purchase Refunded" ? (
                                            <button
                                                className={styles.refundButton}
                                                onClick={() => handleRefund(item.itemId)}
                                            >
                                                Refund
                                            </button>
                                            ) : null}
                                        </td>
                                        </tr>
                                    );
                                    })
                                ) : (
                                    <tr>
                                    <td colSpan={6}>No items found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
