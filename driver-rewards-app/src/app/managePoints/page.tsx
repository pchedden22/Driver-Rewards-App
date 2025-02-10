'use client';

import React, { useState } from 'react';
import { useEffect } from 'react';
import '../styles/styles.css'; // Your existing styles
import styles from './managePoints.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';
import { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand, ReturnValue, PutItemCommand, QueryCommand  } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function SponsorManagePoints() {
  const [dln, setDln] = useState(''); // Driver's License Number
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  //const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [user, setUser] = useState<User | null>(null); // Correct typing for user
  const [points, setPoints] = useState(0);
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [ppu, setPPU] = useState('0.1');
  const [exchangeRate, setExchangeRate] = useState(1); // Exchange rate multiplier
  const [pointsAction, setPointsAction] = useState('add'); // Default to 'add'
  const [sponsorID, setSponsorID] = useState('');
  const [sponsorCompany, setSponsorCompany] = useState('');
  //const [username, setUsername] = useState<string>("System");
  //const [sponsorData, setSponsorData] = useState<{ RecurringPayments?: any[] } | null>(null);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);

  
  async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDBClient };
  }

  interface RecurringPayment {
    id: string;
    frequency: string;
    points: number;
    description: string;
}

interface CustomAction {
  id: string;
  description: string;
  points: number;
  actionType: string;
}

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

interface User {
  firstName: string | undefined;
  lastName: string | undefined;
  email: string | undefined;
  phoneNum: string | undefined;
  address: string | undefined;
  city: string | undefined;
  state: string | undefined;
  zipCode: string | undefined;
  points: number;
  licenseID?: string;
}


const mapDriverToUser = (driver: Driver): User => ({
  firstName: driver.firstName,
  lastName: driver.lastName,
  email: driver.email,
  phoneNum: driver.phoneNum,
  address: driver.address,
  city: driver.city,
  state: driver.state,
  zipCode: driver.zipCode,
  points: driver.points,
  licenseID: driver.licenseID
});

const handleDriverClick = (driver: Driver) => {
  //setSelectedDriver(driver);
  setUser(mapDriverToUser(driver)); // Map driver to user
}


  useEffect(() => {
    const fetchSponsorID = async () => {
      try {
        const session = await fetchAuthSession();
        const username = session?.tokens?.accessToken?.payload?.username;
  
        if (!username || typeof username !== 'string') {
          throw new Error("Username not found or invalid type.");
        }
  
        //setUsername(username); // Store username in state for later use

        // First query to get the sponsorCompany for the user
        const driverParams = {
          TableName: 'Team06-Drivers',
          IndexName: 'username-index',
          KeyConditionExpression: 'username = :usernameVal',
          ExpressionAttributeValues: {
            ':usernameVal': { S: username },
          },
          ProjectionExpression: 'sponsorCompany, LicenseID',
        };
        const { dynamoDBClient } = await getAuthenticatedClients();
        const driverData = await dynamoDBClient.send(new QueryCommand(driverParams));
        const sponsorCompany = driverData.Items?.[0]?.sponsorCompany?.S;
        const dln = driverData.Items?.[0]?.LicenseID?.S;

        console.log("Driver Data:", driverData);
  
        if (!sponsorCompany) {
          console.error('Sponsor company not found for user');
          return;
        }

        setSponsorCompany(sponsorCompany);
        setDln(dln || '');
        console.log('DLN:', dln);
  
        // Second query to get the SponsorID from the Team06-Sponsors table
        const sponsorParams = {
          TableName: 'Team06-Sponsors',
          IndexName: 'sponsorNameIndex', 
          KeyConditionExpression: 'SponsorName = :sponsorName',
          ExpressionAttributeValues: {
            ':sponsorName': { S: sponsorCompany },
          },
          ProjectionExpression: 'SponsorID',
        }
  
        const sponsorData = await dynamoDBClient.send(new QueryCommand(sponsorParams));
        const sponsorID = sponsorData.Items?.[0]?.SponsorID?.S;
  
        if (sponsorID) {
          setSponsorID(sponsorID); // Set the sponsorID dynamically
          await fetchCustomActions(sponsorID, sponsorCompany);
        } else {
          console.error('Sponsor ID not found in Team06-Sponsors');
        }
      } catch (error) {
        console.error('Error fetching sponsor ID:', error);
      }
    };
  
    fetchSponsorID();
  }, []);

  useEffect(() => {
    const fetchRecurringPayments = async () => {
        if (sponsorID && sponsorCompany) {
            try {
                const sponsorParams = {
                    TableName: 'Team06-Sponsors',
                    Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorCompany } },
                    ProjectionExpression: 'RecurringPayments',
                };
                const { dynamoDBClient } = await getAuthenticatedClients();
                const sponsorResponse = await dynamoDBClient.send(new GetItemCommand(sponsorParams));
                const recurringPayments = sponsorResponse.Item?.RecurringPayments?.L || [];
  
                const formattedPayments = recurringPayments.map(payment => ({
                    id: payment.M?.id?.S || '',
                    frequency: payment.M?.frequency?.S || '',
                    points: parseInt(payment.M?.points?.N || '0', 10),
                    description: payment.M?.description?.S || '',
                }));
  
                setRecurringPayments(formattedPayments);  // setRecurringPayments should be your state update function
            } catch (error) {
                console.error('Error fetching recurring payments:', error);
            }
        }
    };
  
    fetchRecurringPayments();
  }, [sponsorID, sponsorCompany]);

  // Fetch drivers based on the sponsor's company
  useEffect(() => {
    const fetchDrivers = async () => {
        try {
            
      const session = await fetchAuthSession();
      const username = session?.tokens?.accessToken?.payload?.username;

      if (!username || typeof username !== 'string') {
        throw new Error("Username not found or invalid type.");
      }

      // First query to get the sponsorCompany for the user
      const tempParam = {
        TableName: 'Team06-Drivers',
        IndexName: 'username-index',
        KeyConditionExpression: 'username = :usernameVal',
        ExpressionAttributeValues: {
          ':usernameVal': { S: username },
        },
        ProjectionExpression: 'sponsorCompany',
      };
      const { dynamoDBClient } = await getAuthenticatedClients();
      const dd = await dynamoDBClient.send(new QueryCommand(tempParam));
      const sponsorCompany = dd.Items?.[0]?.sponsorCompany?.S || '';

            // Fetch all drivers in the company using sponsorMap
            const driverParams = {
                TableName: 'Team06-Drivers',
                FilterExpression: `attribute_exists(sponsorMap.#sponsorCompany)`,
                ExpressionAttributeNames: {
                    '#sponsorCompany': sponsorCompany, // Use sponsorCompany as a dynamic key in sponsorMap
                },
            };

            const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));
            

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
            console.error("Error fetching drivers:", error);
        }
    };

    fetchDrivers();
}, []);

  // Filter drivers based on search term
  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = drivers.filter(
        driver =>
            driver.firstName.toLowerCase().includes(lowerSearchTerm) ||
            driver.lastName.toLowerCase().includes(lowerSearchTerm)
    );
    setFilteredDrivers(filtered);
}, [searchTerm, drivers]);

  

const handleTransactionLog = async (
  licenseID: string,
  pointsChange: number,
  description: string,
  transactionType: string,
  username: string = "System"
) => {
  try {
    // Check if the `username` attribute exists in the table
    const getParams = {
      TableName: "Team06-PTransactions",
      Key: { LicenseID: { S: licenseID }, TransactionID: { S: uuidv4() } }, // Provide appropriate keys
    };
    const { dynamoDBClient } = await getAuthenticatedClients();
    const existingTransaction = await dynamoDBClient.send(new GetItemCommand(getParams));
    const existingUsername = existingTransaction?.Item?.username?.S;

    // If `username` does not exist, add it during the transaction log
    const transactionParams = {
      TableName: "Team06-PTransactions",
      Item: {
        TransactionID: { S: uuidv4() },
        LicenseID: { S: licenseID },
        amount: { N: pointsChange.toString() },
        description: { S: description },
        timestamp: { N: Date.now().toString() },
        transactionType: { S: transactionType },
        sponsorCompany: { S: sponsorCompany },
        username: { S: existingUsername || username }, // Use existing `username` or the provided one
      },
    };

    await dynamoDBClient.send(new PutItemCommand(transactionParams));
    console.log(`Transaction logged for LicenseID: ${licenseID} by ${username}`);
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
};



  const [newAction, setNewAction] = useState({
    description: '',
    points: 0,
    actionType: 'add', // Default to 'add'
  });
  
  
  const [customActions, setCustomActions] = useState<{ id: string; description: string; points: number; actionType: string;}[]>([]);

  

  // Hardcoded exchange rates
  const exchangeRates: { [key: string]: number } = {
    USD: 1,     // 1 USD = 1 USD
    EUR: 0.85,  // 1 USD = 0.85 EUR
    GBP: 0.75,  // 1 USD = 0.75 GBP
    CAD: 1.25,  // 1 USD = 1.25 CAD
  };


  
  

  const handleUpdatePoints = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (user) {
      const { dynamoDBClient } = await getAuthenticatedClients();
  
      // Fetch username from session
      const session = await fetchAuthSession();
      const username = session?.tokens?.accessToken?.payload?.username || "Unknown User";
  
      // Determine final points based on selected action
      let updatedPoints = user.points;
      if (pointsAction === "add") {
        updatedPoints += points;
      } else if (pointsAction === "subtract") {
        updatedPoints -= points;
      }
  
      const pointsChange = pointsAction === "add" ? points : -points;
  
      // Determine transaction type based on action
      const transactionType = pointsAction === "add" ? "added" : "deducted";
  
      const params = {
        TableName: "Team06-Drivers",
        Key: { LicenseID: { S: dln } },
        UpdateExpression: "SET sponsorMap.#sponsorID.points = :newPoints",
        ExpressionAttributeNames: {
          "#sponsorID": sponsorCompany,
        },
        ExpressionAttributeValues: {
          ":newPoints": { N: updatedPoints.toString() },
        },
        ReturnValues: ReturnValue.UPDATED_NEW,
      };
  
      try {
        await dynamoDBClient.send(new UpdateItemCommand(params));
        toast.success(
          `Updated points for ${user.firstName} ${user.lastName} to ${updatedPoints}`
        );
        setUser({ ...user, points: updatedPoints }); // Update the local state with new points
  
        // Log the transaction
        await handleTransactionLog(
          dln,
          pointsChange,
          description || "Manual points update",
          transactionType,
          username.toString() // Pass the logged-in username
        );
      } catch (error) {
        console.error("Error updating points:", error);
        alert("Failed to update points.");
      }
    } else {
      alert("No user selected");
    }
  };
  


  

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCurrency = e.target.value;
    setCurrency(selectedCurrency);
    setExchangeRate(exchangeRates[selectedCurrency]); // Update exchange rate based on selected currency
  };

  const handleSetCurrencyAndPPU = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    const adjustedPPU = parseInt(ppu) * exchangeRate; // Adjust PPU based on exchange rate
    alert(`Currency set to ${currency}. Adjusted PointsPerUnit: ${adjustedPPU}`);
  
    const { dynamoDBClient } = await getAuthenticatedClients();
  
    // SponsorID that you know or get from the form/user input

  
    const updateCurrParams = {
      TableName: 'Team06-Sponsors',
      Key: {
        SponsorID: { S: sponsorID },  // Partition Key
        SponsorName: { S: 'Amazoom' }        // Sort Key
      },
      UpdateExpression: 'SET PointsPerUnit = :adjustedPPU, Currency = :currency',
      ExpressionAttributeValues: {
        ':adjustedPPU': { N: adjustedPPU.toString() },  // PointsPerUnit as a number
        ':currency': { S: currency },  // Currency as a string
      },
      ReturnValues: ReturnValue.UPDATED_NEW,
    };
  
    try {
      const updateResult = await dynamoDBClient.send(new UpdateItemCommand(updateCurrParams) || '');
      console.log('DynamoDB update successful: ', updateResult);
      alert('Points per unit and currency updated successfully');
    } catch (error) {
      console.error('Error updating PointsPerUnit and currency:', error);
      alert('Failed to update Points per Unit and currency.');
    }
  };
  
  
  

  const handleQuickAction = async (pointsChange: number, description: string) => {
    if (user) {
      try {
        const { dynamoDBClient } = await getAuthenticatedClients();

        const newPoints = user.points + pointsChange;

        const params = {
          TableName: 'Team06-Drivers',
          Key: { LicenseID: { S: dln } }, // Searching by LicenseID
          UpdateExpression: "SET sponsorMap.#sponsorID.points = :newPoints",
          ExpressionAttributeNames: {
              "#sponsorID": sponsorCompany, // Dynamic attribute name for sponsor company
          },
          ExpressionAttributeValues: {
              ":newPoints": { N: newPoints.toString() },
          },
          ReturnValues: ReturnValue.UPDATED_NEW,
      };

        await dynamoDBClient.send(new UpdateItemCommand(params));
        toast.success(`${description}: Updated points for ${user.firstName} ${user.lastName} to ${newPoints}`);
        setUser({ ...user, points: newPoints });

        // Log the transaction with appropriate type
        const transactionType = pointsChange > 0 ? "added" : "deducted";
        const finalPointsChange = transactionType === "deducted" ? -Math.abs(pointsChange) : Math.abs(pointsChange);


        await handleTransactionLog(dln, finalPointsChange, description, transactionType);

      } catch (error) {
        console.error('Error applying quick action:', error);
        alert('Failed to apply quick action.');
      }
    } else {
      alert('No user selected');
    }
  };
  
  const handleAddCustomAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    // Generate a unique ID for the custom action
    const newCustomAction = {
      id: uuidv4(),
      description: newAction.description,
      points: newAction.points,
      actionType: newAction.actionType,
    };
  
    // DynamoDB Client configuration
    const { dynamoDBClient } = await getAuthenticatedClients();
  
    // Ensure SponsorID is valid

  
    // Fetch existing CustomActions field from DynamoDB (if it exists)
    const getParams = {
      TableName: 'Team06-Sponsors',
      Key: {
        SponsorID: { S: sponsorID },  // Partition Key
        SponsorName: { S: sponsorCompany }        // Sort Key
      },
      ProjectionExpression: 'CustomActions',
    };

    
    
  
    try {
      const data = await dynamoDBClient.send(new GetItemCommand(getParams) || '');
  

      const customActionsList: CustomAction[] = (data.Item?.CustomActions?.L || []).map((item) => {
        // Check if item has the expected structure with the `M` property and necessary sub-properties
        if (
          item &&
          typeof item === 'object' &&
          'M' in item &&
          item.M &&
          item.M.id?.S &&
          item.M.description?.S &&
          item.M.points?.N &&
          item.M.actionType?.S
        ) {
          return {
            id: item.M.id.S,
            description: item.M.description.S,
            points: parseInt(item.M.points.N, 10),
            actionType: item.M.actionType.S,
          };
        }
        return null; // Return null if the item structure does not match
      }).filter((item): item is CustomAction => item !== null); // Filter out null values

  
      // Add the new custom action to the list
      customActionsList.push(newCustomAction);
  
      // Update DynamoDB with the new list of CustomActions
      const updateParams = {
        TableName: 'Team06-Sponsors',
        Key: {
          SponsorID: {S: sponsorID },  // Partition Key
          SponsorName: {S: sponsorCompany }        // Sort Key
        },
        UpdateExpression: 'SET CustomActions = :newCustomActions',
        ExpressionAttributeValues: {
          ':newCustomActions': {
            L: customActionsList.map((action) => ({
              M: {
                id: { S: action.id },  // Ensure each action has a valid UUID
                description: { S: action.description },  // Ensure descriptions are strings
                points: { N: action.points.toString() },  // Ensure points are numbers
                actionType: { S: action.actionType },  // Ensure actionType is a string
              },
            })),
          },
        },
        ReturnValues: ReturnValue.UPDATED_NEW,  // This should be fine
      };
      
      try {
        const result = await dynamoDBClient.send(new UpdateItemCommand(updateParams));
        console.log('DynamoDB update successful: ', result);
        // Update state after successful response
      } catch (error) {
        console.error('Error adding custom action: ', error);
        alert('Failed to add custom action.');
      }
      
  
      const result = await dynamoDBClient.send(new UpdateItemCommand(updateParams));
      console.log('DynamoDB update successful: ', result);
  
      setCustomActions(customActionsList); // Update local state
      setNewAction({ description: '', points: 0, actionType: 'add' }); // Clear form fields
      toast.success('Custom Action Added');
    } catch (error) {
      console.error('Error adding custom action: ', error);
      alert('Failed to add custom action.');
    }
  };
  
  const fetchCustomActions = async (sponsorID: string, sponsorCompany: string) => {
    const { dynamoDBClient } = await getAuthenticatedClients();
  
    const getParams = {
      TableName: 'Team06-Sponsors',
      Key: {
        SponsorID: { S: sponsorID },
        SponsorName: { S: sponsorCompany },
      },
      ProjectionExpression: 'CustomActions',
    };
  
    try {
      const data = await dynamoDBClient.send(new GetItemCommand(getParams));

      console.log("CustomActions Fetch Result:", data); // Log the result
      let customActionsList: CustomAction[] = [];

      
  
        if (data.Item && data.Item.CustomActions && data.Item.CustomActions.L) {
          // Parse the custom actions with safety checks
          customActionsList = data.Item.CustomActions.L.map((item) => {
            if (
              item &&
              typeof item === 'object' &&
              'M' in item &&
              item.M &&
              item.M.id?.S &&
              item.M.description?.S &&
              item.M.points?.N &&
              item.M.actionType?.S
            ) {
              return {
                id: item.M.id.S,
                description: item.M.description.S,
                points: parseInt(item.M.points.N, 10),
                actionType: item.M.actionType.S,
              };
            }
            return null; // Return null if the structure doesn't match
          }).filter((item): item is CustomAction => item !== null); // Filter out any null values
        }
      
  
        // Set state to display the buttons
        setCustomActions(customActionsList);
    }
    catch (error) {
      console.error('Error fetching custom actions:', error);
    }
  };
  


  const handleCustomActionClick = async (pointsChange: number, description: string, actionType: string) => {
    if (user) {
      try {
        const { dynamoDBClient } = await getAuthenticatedClients();
  
        // Determine if points should be added or subtracted based on actionType
        let updatedPoints = user.points;
        if (actionType === 'add') {
          updatedPoints += pointsChange;  // Add points
        } else if (actionType === 'subtract') {
          updatedPoints -= pointsChange;  // Subtract points
        } else {
          console.error(`Invalid actionType: ${actionType}`);
          alert('Invalid action type');
          return;  // Exit if action type is invalid
        }

        const params = {
          TableName: 'Team06-Drivers',
          Key: { LicenseID: { S: dln } }, // Searching by LicenseID
          UpdateExpression: "SET sponsorMap.#sponsorID.points = :newPoints",
          ExpressionAttributeNames: {
              "#sponsorID": sponsorCompany, // Dynamic attribute name for sponsor company
          },
          ExpressionAttributeValues: {
              ":newPoints": { N: updatedPoints.toString() },
          },
          ReturnValues: ReturnValue.UPDATED_NEW,
      };
  
        await dynamoDBClient.send(new UpdateItemCommand(params));
        toast.success(`${description}: Updated points for ${user.firstName} ${user.lastName} to ${updatedPoints}`);
        setUser({ ...user, points: updatedPoints }); // Update local state with new points

        // Log the transaction
        const transactionType = actionType === 'add' ? 'added' : 'deducted';

        // Determine the final points change value
        const finalPointsChange = transactionType === "deducted" ? -Math.abs(pointsChange) : Math.abs(pointsChange);

        await handleTransactionLog(dln, finalPointsChange, description, transactionType);

      } catch (error) {
        console.error('Error applying custom action:', error);
        alert('Failed to apply custom action.');
      }
    } else {
      alert('No user selected');
    }
  };
  
  

    
  // Adding a new state for recurring payments
const [recurringPayment, setRecurringPayment] = useState({
  frequency: 'weekly', // Default frequency
  points: 0,
  description: '',
});

// Define a type for the fields in recurringPayment
type RecurringPaymentField = 'frequency' | 'points' | 'description';

// Function to handle recurring payment changes
const handleRecurringPaymentChange = (field: RecurringPaymentField, value: string | number) => {
  setRecurringPayment(prev => ({ ...prev, [field]: value }));
};

// Function to handle PPU input change with explicit typing for `e`
const handlePPUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  if (!isNaN(Number(value)) || value === "") {
    setPPU(value);
  }
};


// Function to add a new recurring payment to DynamoDB
const addRecurringPayment = async () => {
  if (!sponsorID) {
      alert("Sponsor ID not found. Please try again.");
      return;
  }

  try {
    const { dynamoDBClient } = await getAuthenticatedClients();
      // Fetch existing RecurringPayments
      const sponsorParams = {
          TableName: 'Team06-Sponsors',
          Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorCompany } },
          ProjectionExpression: 'RecurringPayments',
      };
      const sponsorResponse = await dynamoDBClient.send(new GetItemCommand(sponsorParams));
      
      // Existing recurring payments, if any
      const existingPayments = sponsorResponse.Item?.RecurringPayments?.L || [];

      // Append new recurring payment
      const newRecurringPayment = {
          M: {
              id: { S: uuidv4() },
              frequency: { S: recurringPayment.frequency },
              points: { N: recurringPayment.points.toString() },
              description: { S: recurringPayment.description },
          },
      };

      const recurringPaymentsList = [...existingPayments, newRecurringPayment];

      // Update RecurringPayments in DynamoDB
      const updateParams = {
          TableName: 'Team06-Sponsors',
          Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorCompany } },
          UpdateExpression: 'SET RecurringPayments = :recurringPayments',
          ExpressionAttributeValues: {
              ':recurringPayments': { L: recurringPaymentsList },
          },
      };

      await dynamoDBClient.send(new UpdateItemCommand(updateParams));
      toast.success('Recurring payment added successfully!');
      setRecurringPayment({ frequency: 'weekly', points: 0, description: '' });
  } catch (error) {
      console.error("Error adding recurring payment:", error);
  }
};


// Function to apply recurring payments to the specified driver immediately
const applyRecurringPayments = async (licenseID: string) => {
  try {
    const { dynamoDBClient } = await getAuthenticatedClients();
    const sponsorParams = {
      TableName: "Team06-Sponsors",
      Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorCompany } },
      ProjectionExpression: "RecurringPayments",
    };
    const sponsorResponse = await dynamoDBClient.send(new GetItemCommand(sponsorParams));

    const recurringPayments = sponsorResponse.Item?.RecurringPayments?.L;

    if (!recurringPayments || recurringPayments.length === 0) {
      console.log("No recurring payments found for this sponsor.");
      alert("No recurring payments available to apply.");
      return;
    }

    console.log("Applying Recurring Payments:", recurringPayments);

    for (const payment of recurringPayments) {
      if (payment?.M?.points?.N && payment?.M?.description?.S) {
        const points = parseInt(payment.M.points.N, 10);
        const description = payment.M.description.S;

        const updateParams = {
          TableName: "Team06-Drivers",
          Key: { LicenseID: { S: licenseID } },
          UpdateExpression: `SET sponsorMap.#sponsorName.points = sponsorMap.#sponsorName.points + :points`,
          ExpressionAttributeNames: { "#sponsorName": sponsorCompany },
          ExpressionAttributeValues: {
            ":points": { N: points.toString() },
          },
        };

        await dynamoDBClient.send(new UpdateItemCommand(updateParams));

        // Log the transaction with "System" as the username
        await handleTransactionLog(licenseID, points, description, "recurring", "System");
        console.log(`Applied ${points} points for: ${description}`);
      } else {
        console.warn("Incomplete payment details found, skipping:", payment);
      }
    }

    alert("Recurring payments applied successfully!");
  } catch (error) {
    console.error("Error applying recurring payments:", error);
  }
};



const deleteRecurringPayment = async (paymentId: string) => {
  const updatedPayments = recurringPayments.filter(payment => payment.id !== paymentId);
  
  const updateParams = {
      TableName: 'Team06-Sponsors',
      Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorCompany } },
      UpdateExpression: 'SET RecurringPayments = :updatedPayments',
      ExpressionAttributeValues: {
          ':updatedPayments': {
              L: updatedPayments.map(payment => ({
                  M: {
                      id: { S: payment.id },
                      frequency: { S: payment.frequency },
                      points: { N: payment.points.toString() },
                      description: { S: payment.description },
                  }
              }))
          }
      }
  };

  try {
    const { dynamoDBClient } = await getAuthenticatedClients();
      await dynamoDBClient.send(new UpdateItemCommand(updateParams));
      toast.success('Recurring payment deleted successfully.');
      setRecurringPayments(updatedPayments); // Update local state
  } catch (error) {
      console.error("Error deleting recurring payment:", error);
  }
};




  

  return (
    <div>
      <ToastContainer />
      <header>
        <h1>Sponsor - Manage User Points</h1>
        <p>Search for a user by name to view and update their points.</p>
      </header>

      <div className={styles.mainBackground}>


        {/*Finding and displaying driver's information.*/}
        <div className={styles.section}>
        <div className={styles.container}>

            {/* Search Input */}
            <input
                type="text"
                id='nameSearch'
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
            />

            {/* Display Driver List */}
            {filteredDrivers.length > 0 ? (
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
                            <tr key={index} onClick={() =>{ handleDriverClick(driver); setDln(driver.licenseID);}}>
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
                <p>No drivers found.</p>
            )}

        </div>

          {/* User Information and Points Update */}
          {user && (
            <div id="userInfo">
              <h3 className={styles.header3}>User Information</h3>
              <p><strong>Full Name:</strong> {user.firstName} {user.lastName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Phone Number:</strong> {user.phoneNum}</p>
              <p><strong>Address:</strong> {user.address}, {user.city}, {user.state} {user.zipCode}</p>
              <p><strong>Current Points:</strong> {user.points} points</p>

              {/* Add/Subtract Points Form */}
              <h3 className={styles.header3}><br />Update User Points</h3>
              <form onSubmit={handleUpdatePoints}>

                <label>Action:</label><br />
                {/* Radio buttons for selecting Add or Subtract */}
                <label>
                  <input 
                    type="radio" 
                    name="actionType" 
                    value="add" 
                    checked={pointsAction === 'add'} 
                    onChange={() => setPointsAction('add')} 
                  /> 
                  Add Points
                </label>
                &nbsp;&nbsp;&nbsp;
                <label>
                  <input 
                    type="radio" 
                    name="actionType" 
                    value="subtract" 
                    checked={pointsAction === 'subtract'} 
                    onChange={() => setPointsAction('subtract')} 
                  /> 
                  Subtract Points
                </label><br /><br />

                <label htmlFor="points">Points:</label><br />
                <input 
                    type="number" // Only allow numbers
                    id="points"
                    className={styles.blackText}
                    value={points || ''} // Prevent initial '0'
                    onChange={(e) => setPoints(parseInt(e.target.value, 10))} // Ensure it's a valid number
                    required
                /><br /><br />
                
                <label htmlFor="description">Description (optional):</label><br />
                <textarea 
                    id="description" 
                    value={description}
                    className={styles.blackText}
                    onChange={(e) => setDescription(e.target.value)}
                ></textarea><br /><br />
                <button id='submitManualPoints' className={styles.button} type="submit">Update Points</button>
              </form>
            </div>
          )}
        </div>


        {/*Quick Actions*/}
        <div className={styles.section}>
          <h2 className={styles.header3}>Quick Actions</h2>

          <div className={styles.buttonsContainer}>
            <button className={styles.button} onClick={() => handleQuickAction(500, 'Safe Driving Bonus') }>Safe Driving Bonus (+500)</button>
            <button className={styles.button} onClick={() => handleQuickAction(-200, 'Late Payment Penalty')}>Late Payment Penalty (-200)</button>
          </div>

          <h3 className={styles.header3}><br />Available Custom Actions</h3>
          <div className={styles.buttonsContainer}>
            {customActions.length > 0 ? (
              customActions.map((action) => (
                <button
                  key={action.id}
                  id='custAction'
                  className={styles.button}
                  onClick={() => handleCustomActionClick(action.points, action.description, action.actionType)}
                >
                  {action.description} ({action.actionType === 'add' ? '+' : '-'}{action.points} points)
                </button>
              ))
            ) : (<p>No custom actions available at this time.</p>)
            }
          </div>

        </div>

        {/* Add custom actions.*/}
        <div className={styles.section}>
          <h2 className={styles.header3}>Add Custom Quick Action</h2>
          <form onSubmit={handleAddCustomAction}>
            <label htmlFor="actionDescription">Action Description:</label><br />

            <input 
            type="text"
            id="actionDescription"
            className={styles.dropdown}
            value={newAction.description}
            onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
            required
            /><br /><br />

            <label htmlFor="points">Points:</label><br />
            <input 
            type="number"
            id="actionPoints"
            className={styles.dropdown}
            value={newAction.points || ''} // Prevent the display of initial '0'
            onChange={(e) => setNewAction({ ...newAction, points: parseInt(e.target.value) })} // Directly update points as a number
            required
            /><br /><br />

            <label>Action Type:</label><br />
            <label>
              <input
                type="radio"
                name="actionType"
                value="add"
                checked={newAction.actionType === 'add'}
                onChange={() => setNewAction({ ...newAction, actionType: 'add' })}
              />
              Add Points
            </label><br />
            <label>
              <input
                type="radio"
                name="actionType"
                value="subtract"
                checked={newAction.actionType === 'subtract'}
                onChange={() => setNewAction({ ...newAction, actionType: 'subtract' })}
              />
              Subtract Points
            </label><br /><br />
            <button id='custActionSubmit' type="submit" className={styles.button}>Add Custom Action</button>
          </form>
        </div>


        {/* Currency and Points-per-Unit Form */}
        <div className={styles.section}>

          <h2 className={styles.header3}>Set Currency and Points-per-Unit</h2>

          <form onSubmit={handleSetCurrencyAndPPU}>
            <label htmlFor="currency">Select Currency:</label><br />
            <select
              id="currency"
              value={currency}
              onChange={handleCurrencyChange}
              className={styles.dropdown}
              required
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select><br /><br />

            <label htmlFor="ppu">Points Per Unit (PPU):</label><br />
            <input
              type="text" // Use "text" type to prevent automatic numeric behavior
              id="ppu"
              value={ppu}
              onChange={handlePPUChange}
              className={styles.dropdown}
              placeholder="Enter PPU" // Optional placeholder
              required
            /><br /><br />
            <button className={styles.button} type="submit">Set Currency & PPU</button>
          </form>
        </div>

        {/* Recurring Payments Section */}
        <div className={styles.section}>
                    <h2 className={styles.header3}>Set Up Recurring Payments</h2>

                    <form onSubmit={(e) => { e.preventDefault(); addRecurringPayment(); }}>
                        <label htmlFor="frequency">Frequency:</label><br />
                        <select
                            id="frequency"
                            value={recurringPayment.frequency}
                            className={styles.dropdown}
                            onChange={(e) => handleRecurringPaymentChange('frequency', e.target.value)}
                            required
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select><br /><br />

                        <label htmlFor="recPoints">Points:</label><br />
                        <input
                            type="number"
                            id="recPoints"
                            className={styles.dropdown}
                            value={recurringPayment.points || ''}
                            onChange={(e) => handleRecurringPaymentChange('points', parseInt(e.target.value, 10))}
                            required
                        /><br /><br />

                        <label htmlFor="recDescription">Description:</label><br />
                        <textarea
                            id="recDescription"
                            className={styles.dropdown}
                            value={recurringPayment.description}
                            onChange={(e) => handleRecurringPaymentChange('description', e.target.value)}
                            required
                        ></textarea><br /><br />

                        <button id='recSubmit' className={styles.button} type="submit">Add Recurring Payment</button>
                    </form>
                </div>
            

            <div className={styles.section}>
            <h2 className={styles.header3}>Recurring Payments</h2>

            {recurringPayments.length > 0 ? (
                recurringPayments.map(payment => (
                    <div key={payment.id} className={styles.recurringPayment}>
                        <p><strong>Description:</strong> {payment.description}</p>
                        <p><strong>Points:</strong> {payment.points}</p>
                        <p><strong>Frequency:</strong> {payment.frequency}</p>
                        <button id='deleteRec'onClick={() => deleteRecurringPayment(payment.id)}>Delete</button>
                    </div>
                ))
            ) : (
                <p>No recurring payments set.</p>
            )}
                <br />
                {/* Apply Recurring Payments Button */}
                <button className={styles.button} onClick={() => applyRecurringPayments(dln || '')}>
                    Apply Recurring Payments
                </button>
        </div>
        </div>
    </div>
  );
  
}
