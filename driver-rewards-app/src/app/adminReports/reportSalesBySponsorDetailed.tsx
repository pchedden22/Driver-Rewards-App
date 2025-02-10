import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type Filters = {
  selectedSponsors: string[];
  dateRange: { start: string; end: string };
};

type SaleDetail = {
  userName: string;
  sponsorName: string;
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

const SalesBySponsorDetailedReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [salesDetails, setSalesDetails] = useState<SaleDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesDetails = async () => {
      if (!filters.dateRange.start || !filters.dateRange.end) {
        setError('Please provide a valid date range.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { selectedSponsors, dateRange } = filters;
        const startDate = new Date(dateRange.start).toISOString();
        const endDate = new Date(dateRange.end).toISOString();

        const { dynamoDBClient } = await getAuthenticatedClients();

        // Fetch all drivers
        const params = {
          TableName: 'Team06-Drivers', // Replace with your actual table name
        };

        const response = await dynamoDBClient.send(new ScanCommand(params));
        const drivers = response.Items || [];

        // Process drivers and extract sales
        const details: SaleDetail[] = [];

        drivers.forEach((driver) => {
          const sponsorMap = driver.sponsorMap?.M || {};
          const items = driver.items?.L || [];
          const userName = `${driver.firstName?.S || ''} ${driver.lastName?.S || ''}`.trim();

          // Check if any sponsor in sponsorMap matches the selected sponsors
          const matchedSponsors = Object.keys(sponsorMap).filter((sponsor) =>
            selectedSponsors.includes(sponsor)
          );

          if (matchedSponsors.length > 0) {
            // Process sales items
            items.forEach((item) => {
              const redeemedDate = item.M?.redeemedDate?.S || '';
              const price = parseFloat(item.M?.price?.N || '0');
              const itemName = item.M?.itemName?.S || '';

              if (redeemedDate >= startDate && redeemedDate <= endDate) {
                matchedSponsors.forEach((sponsor) => {
                  details.push({
                    userName,
                    sponsorName: sponsor,
                    itemName,
                    price,
                    redeemedDate: new Date(redeemedDate).toLocaleString(),
                  });
                });
              }
            });
          }
        });

        setSalesDetails(details);
      } catch (err) {
        console.error('Error fetching sales details:', err);
        setError('Failed to fetch sales data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesDetails();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['User Name', 'Sponsor Name', 'Item Name', 'Price', 'Redeemed Date'];
    const rows = salesDetails.map((detail) => [
      detail.userName,
      detail.sponsorName,
      detail.itemName,
      detail.price.toFixed(2),
      detail.redeemedDate,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_detailed_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.reportContainer}>
      <h3>Sales by Sponsor (Detailed)</h3>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Sponsor Name</th>
                <th>Item Name</th>
                <th>Price</th>
                <th>Redeemed Date</th>
              </tr>
            </thead>
            <tbody>
              {salesDetails.map((detail, index) => (
                <tr key={index}>
                  <td>{detail.userName}</td>
                  <td>{detail.sponsorName}</td>
                  <td>{detail.itemName}</td>
                  <td>${detail.price.toFixed(2)}</td>
                  <td>{detail.redeemedDate}</td>
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

export default SalesBySponsorDetailedReport;
