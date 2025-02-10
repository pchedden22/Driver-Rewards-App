import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type Filters = {
  selectedSponsors: string[];
  dateRange: { start: string; end: string };
};

type SalesSummary = {
  sponsorName: string;
  totalSales: number;
  totalTransactions: number;
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const SalesBySponsorSummaryReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesSummary = async () => {
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
        const summary: Record<string, SalesSummary> = {};

        drivers.forEach((driver) => {
          const sponsorMap = driver.sponsorMap?.M || {};
          const items = driver.items?.L || [];

          // Check if any sponsor in sponsorMap matches the selected sponsors
          const matchedSponsors = Object.keys(sponsorMap).filter((sponsor) =>
            selectedSponsors.includes(sponsor)
          );

          if (matchedSponsors.length > 0) {
            // Process sales items
            items.forEach((item) => {
              const redeemedDate = item.M?.redeemedDate?.S || '';
              const price = parseFloat(item.M?.price?.N || '0');

              if (redeemedDate >= startDate && redeemedDate <= endDate) {
                matchedSponsors.forEach((sponsor) => {
                  if (!summary[sponsor]) {
                    summary[sponsor] = {
                      sponsorName: sponsor,
                      totalSales: 0,
                      totalTransactions: 0,
                    };
                  }

                  summary[sponsor].totalSales += price;
                  summary[sponsor].totalTransactions += 1;
                });
              }
            });
          }
        });

        setSalesSummary(Object.values(summary));
      } catch (err) {
        console.error('Error fetching sales summary:', err);
        setError('Failed to fetch sales data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSalesSummary();
  }, [filters]);

  const downloadCSV = () => {
    const headers = ['Sponsor Name', 'Total Sales', 'Total Transactions'];
    const rows = salesSummary.map((summary) => [
      summary.sponsorName,
      summary.totalSales.toFixed(2),
      summary.totalTransactions,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_summary_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.reportContainer}>
      <h3>Sales by Sponsor (Summary)</h3>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sponsor Name</th>
                <th>Total Sales</th>
                <th>Total Transactions</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary.map((summary, index) => (
                <tr key={index}>
                  <td>{summary.sponsorName}</td>
                  <td>${summary.totalSales.toFixed(2)}</td>
                  <td>{summary.totalTransactions}</td>
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

export default SalesBySponsorSummaryReport;
