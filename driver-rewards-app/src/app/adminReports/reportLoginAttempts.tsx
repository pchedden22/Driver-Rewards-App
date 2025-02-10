import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type LoginAttempt = {
  attemptID: string;
  username: string;
  success: boolean;
  timestamp: string;
};

type Filters = {
  selectedDrivers: string[]; // List of drivers' license IDs
  dateRange: { start: string; end: string };
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const LoginAttemptsReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLoginAttempts = async () => {
      setLoading(true);

      try {
        const { selectedDrivers, dateRange } = filters;

        if (!selectedDrivers.length || !dateRange.start || !dateRange.end) {
          console.warn('Incomplete filters: Ensure drivers and date range are selected.');
          setLoading(false);
          return;
        }

        const startTimestamp = new Date(dateRange.start).toISOString();
        const endTimestamp = new Date(dateRange.end).toISOString();

        console.log('Fetching usernames for selected drivers:', selectedDrivers);

        const { dynamoDBClient } = await getAuthenticatedClients();

        // Step 1: Fetch usernames for the selected drivers' license IDs
        const driverParams = {
          TableName: 'Team06-Drivers',
          ProjectionExpression: 'LicenseID, username',
        };

        const driverResponse = await dynamoDBClient.send(new ScanCommand(driverParams));
        const driverMap = driverResponse.Items?.reduce((map, item) => {
          const licenseID = item.LicenseID?.S || '';
          const username = item.username?.S || '';
          if (licenseID && username) {
            map[licenseID] = username;
          }
          return map;
        }, {} as Record<string, string>);

        console.log('Driver map:', driverMap);

        if(!driverMap)
        {
          return;
        }

        const usernames = selectedDrivers
          .map((licenseID) => driverMap[licenseID])
          .filter((username) => !!username);

        if (!usernames.length) {
          console.warn('No usernames found for the selected drivers.');
          setLoginAttempts([]);
          setLoading(false);
          return;
        }

        console.log('Usernames to filter by:', usernames);

        // Step 2: Fetch all login attempts
        const params = {
          TableName: 'Team06-LoginAttempts',
        };

        console.log('Fetching all login attempts with params:', params);
        const response = await dynamoDBClient.send(new ScanCommand(params));
        console.log('Raw Login Attempts Data:', response.Items);

        const allLoginData = response.Items?.map((item) => ({
          attemptID: item.AttemptID?.S || 'Unknown',
          username: item.username?.S || 'Unknown',
          success: item.success?.BOOL || false,
          timestamp: item.timestamp?.S || '',
        }));

        console.log('All Login Attempts:', allLoginData);

        // Step 3: Filter locally by usernames and date range
        const filteredLoginData = allLoginData?.filter(
          (attempt) =>
            usernames.includes(attempt.username) &&
            attempt.timestamp >= startTimestamp &&
            attempt.timestamp <= endTimestamp
        );

        console.log('Filtered Login Attempts:', filteredLoginData);
        setLoginAttempts(filteredLoginData || []);
      } catch (error) {
        console.error('Error fetching login attempts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLoginAttempts();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['Attempt ID', 'Username', 'Success', 'Timestamp'];
    const rows = loginAttempts.map((attempt) => [
      attempt.attemptID,
      attempt.username,
      attempt.success ? 'Success' : 'Failed',
      attempt.timestamp,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'login_attempts_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.reportContainer}>
      <h3>Login Attempts Report</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Attempt ID</th>
                <th>Username</th>
                <th>Success</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loginAttempts.map((attempt, index) => (
                <tr key={index}>
                  <td>{attempt.attemptID}</td>
                  <td>{attempt.username}</td>
                  <td>{attempt.success ? 'Success' : 'Failed'}</td>
                  <td>{new Date(attempt.timestamp).toLocaleString()}</td>
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

export default LoginAttemptsReport;
