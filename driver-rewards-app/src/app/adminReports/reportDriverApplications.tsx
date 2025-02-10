import React, { useState, useEffect } from 'react';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import styles from './adminReports.module.css';
import { fetchAuthSession } from 'aws-amplify/auth';

type DriverApplication = {
  sponsorID: string;
  userID: string;
  createdTimestamp: string;
  notes: string;
  reason: string;
  status: string;
  updatedTimestamp: string;
};

type Filters = {
  selectedSponsors: string[]; // List of sponsor names
  dateRange: { start: string; end: string }; // Date range for filtering by `updated_timestamp`
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();

  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials,
  });

  return { dynamoDBClient };
}

const DriverApplicationsReport: React.FC<{ filters: Filters }> = ({ filters }) => {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
  
      try {
        const { selectedSponsors, dateRange } = filters;
  
        if (!selectedSponsors.length || !dateRange.start || !dateRange.end) {
          console.warn('Incomplete filters: Ensure sponsors and date range are selected.');
          setApplications([]);
          setLoading(false);
          return;
        }
  
        console.log('Selected Sponsors:', selectedSponsors);
  
        const { dynamoDBClient } = await getAuthenticatedClients();
  
        // Step 1: Fetch all sponsors and map SponsorName to SponsorID
        const sponsorResponse = await dynamoDBClient.send(
          new ScanCommand({
            TableName: 'Team06-Sponsors',
            ProjectionExpression: 'SponsorID, SponsorName',
          })
        );
        console.log('All Sponsors:', sponsorResponse.Items);
  
        const sponsorMap = sponsorResponse.Items
  ? sponsorResponse.Items.reduce((map, item) => {
      const sponsorName = item.SponsorName?.S || '';
      const sponsorID = item.SponsorID?.S || '';
      if (sponsorName && sponsorID) {
        map[sponsorID] = sponsorName; // Key: SponsorID, Value: SponsorName
      }
      return map;
    }, {} as Record<string, string>)
  : {}; // Ensure sponsorMap is always an object, even if Items is undefined.
  
        console.log('Sponsor Map (ID to Name):', sponsorMap);
  
        // Step 2: Fetch all applications
        const applicationsResponse = await dynamoDBClient.send(
          new ScanCommand({
            TableName: 'Team06-DriverApplications',
          })
        );
  
        console.log('Raw Applications Data:', applicationsResponse.Items);
  
        // Step 3: Filter applications locally
        const startTimestamp = new Date(dateRange.start).toISOString();
        const endTimestamp = new Date(dateRange.end).toISOString();
  
        const filteredApplications = applicationsResponse.Items?.filter((item) => {
          const sponsorID = item.sponsor_id?.S || '';
          const updatedTimestamp = item.updated_timestamp?.S || '';

          if(!sponsorMap)
            {
              return;
            }
  
          const sponsorName = sponsorMap[sponsorID];
          const withinDateRange =
            updatedTimestamp >= startTimestamp && updatedTimestamp <= endTimestamp;
  
          return selectedSponsors.includes(sponsorName) && withinDateRange;
        }).map((item) => ({
          sponsorID: item.sponsor_id?.S || 'Unknown',
          userID: item.user_id?.S || 'Unknown',
          createdTimestamp: item.created_timestamp?.S || '',
          notes: item.notes?.S || '',
          reason: item.reason?.S || '',
          status: item.status?.S || '',
          updatedTimestamp: item.updated_timestamp?.S || '',
          sponsorName: sponsorMap[item.sponsor_id?.S || 'Unknown'] || 'Unknown',
        }));
  
        console.log('Filtered Applications:', filteredApplications);
        setApplications(filteredApplications || []);
      } catch (error) {
        console.error('Error fetching driver applications:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchApplications();
  }, [filters]);
  
  

  const downloadCSV = () => {
    const headers = [
      'Sponsor ID',
      'User ID',
      'Created Timestamp',
      'Notes',
      'Reason',
      'Status',
      'Updated Timestamp',
    ];
    const rows = applications.map((app) => [
      app.sponsorID,
      app.userID,
      app.createdTimestamp,
      app.notes,
      app.reason,
      app.status,
      app.updatedTimestamp,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'driver_applications_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.reportContainer}>
      <h3>Driver Applications Report</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sponsor ID</th>
                <th>User ID</th>
                <th>Created Timestamp</th>
                <th>Notes</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Updated Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <tr key={index}>
                  <td>{app.sponsorID}</td>
                  <td>{app.userID}</td>
                  <td>{new Date(app.createdTimestamp).toLocaleString()}</td>
                  <td>{app.notes}</td>
                  <td>{app.reason}</td>
                  <td>{app.status}</td>
                  <td>{new Date(app.updatedTimestamp).toLocaleString()}</td>
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

export default DriverApplicationsReport;
