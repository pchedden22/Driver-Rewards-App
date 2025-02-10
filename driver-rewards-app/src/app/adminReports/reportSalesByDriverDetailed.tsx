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

type DetailedItem = {
  driverName: string;
  licenseID: string;
  itemName: string;
  price: number;
  redeemedDate: string;
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const SalesByDriverDetailed: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [detailedItems, setDetailedItems] = useState<DetailedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetailedReport = async () => {
      console.log('Fetching detailed sales report...');
      setLoading(true);

      try {
        if (!filters.dateRange.start || !filters.dateRange.end) {
          console.error('Date range is incomplete.');
          setDetailedItems([]); // Clear any previous data.
          setLoading(false);
          return;
        }

        const startTimestamp = new Date(filters.dateRange.start).getTime();
        const endTimestamp = new Date(filters.dateRange.end).getTime();

        console.log('Filter criteria:', {
          selectedDrivers: filters.selectedDrivers,
          dateRange: filters.dateRange,
        });

        // Fetch all drivers from DynamoDB
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

        if (filteredDrivers.length === 0) {
          console.warn('No drivers matched the selected drivers.');
        }

        console.log('Filtered drivers:', filteredDrivers);

        // Collect all items purchased by the filtered drivers
        const detailedSales = filteredDrivers.flatMap(driver =>
          driver.items
            .filter(item => {
              const redeemedDate = new Date(item.redeemedDate).getTime();
              return redeemedDate >= startTimestamp && redeemedDate <= endTimestamp;
            })
            .map(item => ({
              driverName: `${driver.firstName} ${driver.lastName}`,
              licenseID: driver.licenseID,
              itemName: item.itemName,
              price: item.price,
              redeemedDate: new Date(item.redeemedDate).toLocaleString(),
            }))
        );

        if (detailedSales.length === 0) {
          console.warn('No sales matched the selected filters.');
        }

        console.log('Detailed sales report:', detailedSales);
        setDetailedItems(detailedSales);
      } catch (error) {
        console.error('Error fetching detailed sales report:', error);
        setDetailedItems([]); // Clear data on error.
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedReport();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['Driver Name', 'License ID', 'Item Name', 'Price', 'Redeemed Date'];
    const rows = detailedItems.map(item => [
      item.driverName,
      item.licenseID,
      item.itemName,
      item.price.toFixed(2),
      item.redeemedDate,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_by_driver_detailed.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.salesDetailedContainer}>
      <h3>Sales By Driver Detailed</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License ID</th>
                <th>Item Name</th>
                <th>Price</th>
                <th>Redeemed Date</th>
              </tr>
            </thead>
            <tbody>
              {detailedItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.driverName}</td>
                  <td>{item.licenseID}</td>
                  <td>{item.itemName}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.redeemedDate}</td>
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

export default SalesByDriverDetailed;
