'use client';

import React, { useState, useEffect } from 'react';
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import '../styles/styles.css';
import styles from './reports.module.css';
import { ToastContainer } from 'react-toastify';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function DriverPointTracking() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]); // Store selected driver IDs
  const [selectAll, setSelectAll] = useState(false); // Track "Select All" state
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); // Date range for filtering
  const [pointChanges, setPointChanges] = useState<PointChange[]>([]);
  //const [sponsorCompany, setSponsorCompany] = useState<string>(''); // Current sponsor company
  //const [sponsorID, setSponsorID] = useState<string | null>(null);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Create a DynamoDB client instance
  async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();

    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });

    return { dynamoDBClient };
  }

  type Driver = {
    licenseID: string;
    firstName: string;
    lastName: string;
    email: string;
    points: number;
  };

  type PointChange = {
    driverName: string;
    licenseID: string;
    date: string;
    points: number;
    reason: string;
    username: string;
    transactionType: string;
  };






  // Fetch current sponsor company on load
  useEffect(() => {
    const fetchSponsorCompany = async () => {
      try {
        const session = await fetchAuthSession(); // Example: Replace with your session retrieval logic
        const username = session?.tokens?.accessToken?.payload?.username;

        if (!username || typeof username !== 'string') {
          throw new Error('Username must be a string.');
        }


        const params = {
          TableName: 'Team06-Drivers',
          IndexName: 'username-index', // Ensure this index exists and is correctly configured
          KeyConditionExpression: 'username = :usernameVal', // Specify the condition for the partition key
          ExpressionAttributeValues: {
            ':usernameVal': { S: username }, // Use the username as the partition key value
          },
          ProjectionExpression: 'sponsorCompany', // Retrieve only the necessary fields
        };

        const { dynamoDBClient } = await getAuthenticatedClients();
        const driverData = await dynamoDBClient.send(new QueryCommand(params));


        const sponsorCompanyName = driverData.Items?.[0]?.sponsorCompany?.S;

        if (sponsorCompanyName) {
          //setSponsorCompany(sponsorCompanyName);
        } else {
          console.error('Sponsor company not found for the current user.');
        }
      } catch (error) {
        console.error('Error fetching sponsor company:', error);
      }
    };

    fetchSponsorCompany();
  }, []);

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
              //const sponsor = sponsorResponse.Items[0];
              //const fetchedSponsorID = sponsor.SponsorID?.S || '';
              //setSponsorID(fetchedSponsorID);
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

  const handleDriverSelection = (licenseID: string) => {
    setSelectedDrivers(prev =>
      prev.includes(licenseID)
        ? prev.filter(id => id !== licenseID)
        : [...prev, licenseID]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(drivers.map(driver => driver.licenseID));
    }
    setSelectAll(!selectAll);
  };

  const fetchPointChanges = async () => {
    console.log('Button clicked, fetching point changes...');

    try {
      if (selectedDrivers.length === 0) {
        alert('Please select at least one driver.');
        return;
      }

      const startTimestamp = new Date(dateRange.start).getTime();
      const endTimestamp = new Date(dateRange.end).getTime();

      // Dynamically build the OR condition for LicenseID
      const licenseConditions = selectedDrivers
        .map((_, i) => `LicenseID = :id${i}`)
        .join(' OR ');

      const filterExpression = `(${licenseConditions}) AND #timestamp BETWEEN :start AND :end`;

      /* eslint-disable @typescript-eslint/ban-ts-comment */
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const expressionAttributeValues: Record<string, any> = {
        ':start': { N: startTimestamp.toString() },
        ':end': { N: endTimestamp.toString() },
      };

      // Add LicenseID values dynamically
      selectedDrivers.forEach((id, index) => {
        expressionAttributeValues[`:id${index}`] = { S: id };
      });

      const transactionParams = {
        TableName: 'Team06-PTransactions',
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
        },
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: 'LicenseID, #timestamp, amount, description, transactionType, username', // Include username
      };


      console.log('Querying DynamoDB for transactions with params:', JSON.stringify(transactionParams, null, 2));
      const { dynamoDBClient } = await getAuthenticatedClients();
      // Fetch transaction data
      const transactionData = await dynamoDBClient.send(new ScanCommand(transactionParams));
      console.log('Transaction data received:', JSON.stringify(transactionData.Items, null, 2));

      // Map transaction data
      const transactions = transactionData.Items?.map(item => ({
        licenseID: item.LicenseID?.S || '',
        date: new Date(parseInt(item.timestamp?.N || '0', 10)).toLocaleString(),
        points: parseInt(item.amount?.N || '0', 10),
        reason: item.description?.S || '',
        transactionType: item.transactionType?.S || '',
        username: item.username?.S || 'System', // Fallback to "System" if username is missing
      }));


      // Step 2: Fetch driver data
      const driverParams = {
        TableName: 'Team06-Drivers',
        ProjectionExpression: 'LicenseID, firstName, lastName',
      };

      console.log('Querying DynamoDB for drivers with params:', JSON.stringify(driverParams, null, 2));

      const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));
      console.log('Driver data received:', JSON.stringify(driverData.Items, null, 2));

      // Build a map of LicenseID to driver names
      const driverMap: Record<string, { firstName: string; lastName: string }> = {};
      driverData.Items?.forEach(item => {
        const licenseID = item.LicenseID?.S || '';
        if (licenseID) {
          driverMap[licenseID] = {
            firstName: item.firstName?.S || '',
            lastName: item.lastName?.S || '',
          };
        }
      });

      console.log('Driver map:', driverMap);

      // Step 3: Map driver names to transactions
      const changes = transactions?.map(transaction => ({
        ...transaction,
        driverName: `${driverMap[transaction.licenseID]?.firstName || ''} ${driverMap[transaction.licenseID]?.lastName || ''}`,
      }));

      setPointChanges(changes || []);
      console.log('Point changes set:', changes);
    } catch (error) {
      console.error('Error fetching point changes:', error);
      alert('An error occurred while fetching point changes. Check the console for details.');
    }
  };


  const downloadCSV = () => {
    // Convert `pointChanges` into a CSV string
    const headers = ['Date', 'Driver Name', 'Points', 'Reason', 'Modified By']; // Define your headers
    const rows = pointChanges.map(change => [
      change.date,
      change.driverName,
      change.points,
      change.reason,
      change.username,
    ]);

    const csvContent = [
      headers.join(','), // Join headers with commas
      ...rows.map(row => row.join(',')), // Join each row with commas
    ].join('\n'); // Join all rows with newlines

    // Create a blob and a downloadable link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'report.csv'); // Set the downloaded file name
    document.body.appendChild(link);
    link.click(); // Trigger the download
    document.body.removeChild(link); // Clean up
  };





  return (
    <div className={styles.mainBackground}>
      <ToastContainer />
      <header>
        <h1>Driver Point Tracking</h1>
      </header>

      <div className={styles.background}>
        {/* Driver Selection */}
        <section>
          <h3 className={styles.h3}>Select Drivers</h3>

          <input
            type="text"
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <br />
          <label>
            <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
            &nbsp;&nbsp;Select All
          </label>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Select</th>
                <th>License ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver/*, index*/) => (
                <tr key={driver.licenseID}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(driver.licenseID)}
                      onChange={() => handleDriverSelection(driver.licenseID)}
                    />
                  </td>
                  <td>{driver.licenseID}</td>
                  <td>{driver.firstName}</td>
                  <td>{driver.lastName}</td>
                  <td>{driver.email}</td>
                  <td>{driver.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Date Range Filter */}
        <section>
          <h3 className={styles.h3}>Select Date Range</h3>
          <label>
            Start Date:
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className={`${styles.searchInput} ${styles.dateInput}`}
            />
          </label>
          <label>
            End Date:
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className={`${styles.searchInput} ${styles.dateInput}`}
            />
          </label>
          <button onClick={fetchPointChanges} className={styles.button}>
            Fetch Point Changes
          </button>
        </section>

        <br />
        <br />

        {/* Display Point Changes */}
        <section>
          <h3 className={styles.h3}>Point Changes</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver Name</th>
                <th>Points</th>
                <th>Reason</th>
                <th>Modified By</th>
              </tr>
            </thead>
            <tbody>
              {pointChanges.map((change, index) => (
                <tr key={index}>
                  <td>{change.date}</td>
                  <td>{change.driverName}</td>
                  <td>{change.points}</td>
                  <td>{change.reason}</td>
                  <td>{change.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <button onClick={downloadCSV} className={styles.CSVbutton}>
          Download as CSV
        </button>

      </div>
    </div>

  );
}
