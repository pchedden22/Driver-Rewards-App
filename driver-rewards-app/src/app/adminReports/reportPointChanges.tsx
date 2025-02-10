import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type PointChange = {
  driverName: string;
  licenseID: string;
  date: string;
  points: number;
  reason: string;
  username: string;
  transactionType: string;
};

type Filters = {
  selectedSponsors: string[];
  selectedDrivers: string[];
  dateRange: { start: string; end: string };
};

async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();

    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });

    return { dynamoDBClient };
  }

const PointChangesReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [pointChanges, setPointChanges] = useState<PointChange[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPointChanges = async () => {
        console.log('Fetching point changes...');
        setLoading(true);
      
        try {
          if (!filters.selectedDrivers.length || !filters.dateRange.start || !filters.dateRange.end) {
            console.error('Filters are incomplete.');
            return;
          }
      
          const startTimestamp = new Date(filters.dateRange.start).getTime();
          const endTimestamp = new Date(filters.dateRange.end).getTime();
      
          const licenseConditions = filters.selectedDrivers
            .map((_, i) => `LicenseID = :id${i}`)
            .join(' OR ');
      
          const filterExpression = `(${licenseConditions}) AND #timestamp BETWEEN :start AND :end`;
      
          /* eslint-disable @typescript-eslint/ban-ts-comment */
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const expressionAttributeValues: Record<string, any> = {
            ':start': { N: startTimestamp.toString() },
            ':end': { N: endTimestamp.toString() },
          };
      
          filters.selectedDrivers.forEach((id, index) => {
            expressionAttributeValues[`:id${index}`] = { S: id };
          });
      
          const transactionParams = {
            TableName: 'Team06-PTransactions',
            FilterExpression: filterExpression,
            ExpressionAttributeNames: { '#timestamp': 'timestamp' },
            ExpressionAttributeValues: expressionAttributeValues,
            ProjectionExpression: 'LicenseID, #timestamp, amount, description, transactionType, username',
          };
          
      
          const { dynamoDBClient } = await getAuthenticatedClients();
          const transactionData = await dynamoDBClient.send(new ScanCommand(transactionParams));
          const transactions = transactionData.Items?.map(item => ({
            licenseID: item.LicenseID?.S || '',
            date: new Date(parseInt(item.timestamp?.N || '0', 10)).toLocaleString(),
            points: parseInt(item.amount?.N || '0', 10),
            reason: item.description?.S || '',
            transactionType: item.transactionType?.S || '',
            username: item.username?.S || 'System',
          }));
      
          const driverParams = {
            TableName: 'Team06-Drivers',
            ProjectionExpression: 'LicenseID, firstName, lastName',
          };
      
          const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));
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
      
          const changes = transactions?.map(transaction => ({
            ...transaction,
            driverName: `${driverMap[transaction.licenseID]?.firstName || 'Unknown'} ${driverMap[transaction.licenseID]?.lastName || ''}`,
          }));
          
      
          setPointChanges(changes || []);
          console.log('Point changes:', changes);
        } catch (error) {
          console.error('Error fetching point changes:', error);
        } finally {
          setLoading(false);
        }
      };
      
    fetchPointChanges();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['Date', 'Driver Name', 'License ID', 'Points', 'Reason', 'Modified By'];
    const rows = pointChanges.map(change => [
      change.date,
      change.driverName,
      change.licenseID,
      change.points,
      change.reason,
      change.username,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'point_changes_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.pointChangesContainer}>
      <h3>Point Changes Report</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver Name</th>
                <th>License ID</th>
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
                  <td>{change.licenseID}</td>
                  <td>{change.points}</td>
                  <td>{change.reason}</td>
                  <td>{change.username}</td>
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

export default PointChangesReport;
