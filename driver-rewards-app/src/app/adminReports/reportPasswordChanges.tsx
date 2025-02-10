import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type PasswordChange = {
  username: string;
  timestamp: string;
  action: string;
};

type Filters = {
  selectedDrivers: string[]; // List of usernames
  dateRange: { start: string; end: string }; // Date range for filtering
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const PasswordChangesReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [passwordChanges, setPasswordChanges] = useState<PasswordChange[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const fetchPasswordChanges = async () => {
      console.log('Fetching password changes...');
      setLoading(true);

      try {
        if (!filters.dateRange.start || !filters.dateRange.end) {
          console.error('Date range is incomplete.');
          setPasswordChanges([]);
          setLoading(false);
          return;
        }

        const startTimestamp = new Date(filters.dateRange.start).toISOString();
        const endTimestamp = new Date(filters.dateRange.end).toISOString();

        console.log('Filter criteria:', {
          selectedUsers: filters.selectedDrivers,
          dateRange: filters.dateRange,
        });

        const { dynamoDBClient } = await getAuthenticatedClients();

        // Step 1: Fetch all drivers to map licenseID to username
        const driverParams = {
          TableName: 'Team06-Drivers',
          ProjectionExpression: 'LicenseID, username',
        };

        console.log('Fetching driver mappings...');
        const driverScanResults = await dynamoDBClient.send(new ScanCommand(driverParams));
        const licenseToUsernameMap = new Map<string, string>();

        driverScanResults.Items?.forEach((item) => {
          const licenseID = item.LicenseID?.S || '';
          const username = item.username?.S || '';
          if (licenseID && username) {
            licenseToUsernameMap.set(licenseID, username);
          }
        });

        console.log('LicenseID-to-Username map:', licenseToUsernameMap);

        // Step 2: Convert selectedUsers (licenseIDs) to usernames
        const selectedUsernames = filters.selectedDrivers
          .map((licenseID) => licenseToUsernameMap.get(licenseID))
          .filter(Boolean); // Remove undefined entries

        console.log('Converted selectedUsers to usernames:', selectedUsernames);

        // Step 3: Fetch password changes from the PasswordChanges table
        const scanParams = {
          TableName: 'Team06-PasswordChanges',
        };

        console.log('Scanning PasswordChanges table...');
        const scanResults = await dynamoDBClient.send(new ScanCommand(scanParams));

        console.log('Raw scan data:', scanResults);

        // Ensure there are items in the scan
        if (!scanResults.Items || scanResults.Items.length === 0) {
          console.warn('No items found in the PasswordChanges table.');
          setPasswordChanges([]);
          setLoading(false);
          return;
        }

        // Step 4: Filter the results locally by `username` and date range
        const filteredResults = scanResults.Items?.filter((item) => {
          const username = item.username?.S || '';
          const timestamp = item.timestamp?.S || '';

          const isUserMatch = selectedUsernames.includes(username);
          const isDateMatch = timestamp >= startTimestamp && timestamp <= endTimestamp;

          console.log(
            `Filtering item: username=${username}, timestamp=${timestamp}, isUserMatch=${isUserMatch}, isDateMatch=${isDateMatch}`
          );

          return isUserMatch && isDateMatch;
        }).map((item) => ({
          username: item.username?.S || 'Unknown',
          action: item.action?.S || 'Unknown',
          timestamp: item.timestamp?.S || 'Unknown',
        }));

        console.log('Filtered password changes:', filteredResults);
        setPasswordChanges(filteredResults || []);
      } catch (error) {
        console.error('Error fetching password changes:', error);
        setPasswordChanges([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPasswordChanges();
  }, [filters]);
  
  
  

  const downloadCSV = () => {
    const headers = ['Username', 'Timestamp', 'Action'];
    const rows = passwordChanges.map(change => [
      change.username,
      new Date(change.timestamp).toLocaleString(),
      change.action,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'password_changes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.reportContainer}>
      <h3>Password Changes Report</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {passwordChanges.map((change, index) => (
                <tr key={index}>
                  <td>{change.username}</td>
                  <td>{new Date(change.timestamp).toLocaleString()}</td>
                  <td>{change.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={downloadCSV} className={styles.downloadButton}>
            Download CSV
          </button>
        </>
      )}
    </div>
  );
};

export default PasswordChangesReport;
