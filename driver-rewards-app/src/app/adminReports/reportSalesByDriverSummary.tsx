import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

/*
type Driver = {
  licenseID: string;
  firstName: string;
  lastName: string;
  email: string;
  items: Array<{
    itemId: string;
    itemName: string;
    price: number;
    redeemedDate: string;
  }>;
};
*/

type Filters = {
  selectedDrivers: string[]; // List of LicenseIDs.
  dateRange: { start: string; end: string };
};

type SalesSummary = {
  licenseID: string;
  driverName: string;
  totalSales: number;
  totalItems: number;
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const SalesByDriverSummary: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSalesSummary = async () => {
      console.log('Fetching sales summary...');
      setLoading(true);

      try {
        if (!filters.dateRange.start || !filters.dateRange.end) {
          console.error('Date range is incomplete.');
          setSalesSummary([]); // Clear any previous data.
          setLoading(false);
          return;
        }

        const startTimestamp = new Date(filters.dateRange.start).getTime();
        const endTimestamp = new Date(filters.dateRange.end).getTime();

        console.log('Filter criteria:', {
          selectedDrivers: filters.selectedDrivers,
          dateRange: filters.dateRange,
        });

        // Fetch drivers with sales data from DynamoDB
        const driverParams = {
          TableName: 'Team06-Drivers',
          ProjectionExpression: 'LicenseID, firstName, lastName, #items',
          ExpressionAttributeNames: {
            '#items': 'items', // Handle reserved keyword `items`
          },
        };

        const { dynamoDBClient } = await getAuthenticatedClients();
        const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));

        console.log('Raw driver data received:', driverData.Items);

        // Transform the DynamoDB data
        const drivers = driverData.Items?.map(item => ({
          licenseID: item.LicenseID?.S || '',
          firstName: item.firstName?.S || '',
          lastName: item.lastName?.S || '',
          email: item.email?.S || '',
          items: item.items?.L?.map(i => ({
            itemId: i.M?.itemId?.S || '',
            itemName: i.M?.itemName?.S || '',
            price: parseFloat(i.M?.price?.N || '0'),
            redeemedDate: i.M?.redeemedDate?.S || '',
          })) || [], // Default to an empty array if `items` is missing
        })) || [];
        

        console.log('Transformed driver data:', drivers);

        // Filter drivers based on selectedDrivers
        const filteredDrivers = drivers.filter(driver =>
          filters.selectedDrivers.includes(driver.licenseID)
        );

        console.log('Filtered drivers:', filteredDrivers);

        // Calculate sales summary for each driver
        const summary = filteredDrivers.map(driver => {
          const salesWithinRange = driver.items.filter(item => {
            const redeemedDate = new Date(item.redeemedDate).getTime();
            return redeemedDate >= startTimestamp && redeemedDate <= endTimestamp;
          });

          const totalSales = salesWithinRange.reduce((sum, item) => sum + item.price, 0);
          const totalItems = salesWithinRange.length;

          return {
            licenseID: driver.licenseID,
            driverName: `${driver.firstName} ${driver.lastName}`,
            totalSales,
            totalItems,
          };
        });

        console.log('Sales summary:', summary);
        setSalesSummary(summary);
      } catch (error) {
        console.error('Error fetching sales summary:', error);
        setSalesSummary([]); // Clear data on error.
      } finally {
        setLoading(false);
      }
    };

    fetchSalesSummary();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['Driver Name', 'License ID', 'Total Sales', 'Total Items'];
    const rows = salesSummary.map(summary => [
      summary.driverName,
      summary.licenseID,
      summary.totalSales.toFixed(2),
      summary.totalItems,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_by_driver_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.salesSummaryContainer}>
      <h3>Sales By Driver Summary</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License ID</th>
                <th>Total Sales</th>
                <th>Total Items</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary.map((summary, index) => (
                <tr key={index}>
                  <td>{summary.driverName}</td>
                  <td>{summary.licenseID}</td>
                  <td>${summary.totalSales.toFixed(2)}</td>
                  <td>{summary.totalItems}</td>
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

export default SalesByDriverSummary;
