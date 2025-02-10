'use client';

import React, { useState, useEffect } from 'react';
import { DynamoDBClient,  ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import '../styles/styles.css';
import styles from './adminReports.module.css';
import { ToastContainer } from 'react-toastify';
import { fetchAuthSession } from 'aws-amplify/auth';
import PointChangesReport from './reportPointChanges';
import SalesBySponsorSummaryReport from './reportSalesBySponsorSummary';
import SalesBySponsorDetailedReport from './reportSalesBySponsorDetailed';
import SalesByDriverSummaryReport from './reportSalesByDriverSummary';
import SalesByDriverDetailedReport from './reportSalesByDriverDetailed';
import LoginAttemptsReport from './reportLoginAttempts';
import DriverApplicationsReport from './reportDriverApplications';
import PasswordChangesReport from './reportPasswordChanges';

export default function DriverPointTracking() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]); // Store selected driver IDs
  //const [selectAll, setSelectAll] = useState(false); // Track "Select All" state
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); // Date range for filtering
  //const [pointChanges, setPointChanges] = useState<PointChange[]>([]);
  //const [sponsorCompany, setSponsorCompany] = useState<string>(''); // Current sponsor company
  //const [sponsorID, setSponsorID] = useState<string | null>(null);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [userRole, setUserRole] = useState('');
  //const [searchTerm, setSearchTerm] = useState('');

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
    username: string;
    email: string;
    sponsorName: string;
    points: number;
  };

  /*
  type PointChange = {
    driverName: string;
    licenseID: string;
    date: string;
    points: number;
    reason: string;
    username: string;
    transactionType: string;
  };
  */

  const [driverPage, setDriverPage] = useState(1);
  const [driversPerPage] = useState(10); // Set the number of drivers per page

  //const [pointChangePage, setPointChangePage] = useState(1);
  //const [pointChangesPerPage] = useState(10); // Set the number of point changes per page

  const [sponsors, setSponsors] = useState<string[]>([]);
  const [selectedSponsors, setSelectedSponsors] = useState<string[]>([]);

  const [sponsorPage, setSponsorPage] = useState(1); // Current page
  const [sponsorsPerPage] = useState(5); // Number of sponsors per page

  const paginatedSponsors = sponsors.slice(
    (sponsorPage - 1) * sponsorsPerPage,
    sponsorPage * sponsorsPerPage
  );


  



  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const sponsorParams = {
          TableName: 'Team06-Sponsors',
          ProjectionExpression: 'SponsorName',
        };

        const { dynamoDBClient } = await getAuthenticatedClients();
        const sponsorData = await dynamoDBClient.send(new ScanCommand(sponsorParams));

        console.log('Sponsor data received:', sponsorData.Items);

        const sponsorList = sponsorData.Items?.map(item => item.SponsorName?.S || '');
        setSponsors(sponsorList || []);
      } catch (error) {
        console.error('Failed to fetch sponsors:', error);
      }
    };

    fetchSponsors();
  }, []);

  const handleSponsorSelection = (sponsorName: string) => {
    setSelectedSponsors(prev =>
      prev.includes(sponsorName)
        ? prev.filter(name => name !== sponsorName)
        : [...prev, sponsorName]
    );
  };

  const handleSelectAllSponsors = () => {
    const currentPageSponsors = paginatedSponsors;

    const allSelected = currentPageSponsors.every(sponsor => selectedSponsors.includes(sponsor));

    setSelectedSponsors(prev =>
      allSelected
        ? prev.filter(sponsor => !currentPageSponsors.includes(sponsor)) // Deselect all on current page
        : [...new Set([...prev, ...currentPageSponsors])] // Select all on current page
    );
  };



  const paginatedDrivers = filteredDrivers.slice(
    (driverPage - 1) * driversPerPage,
    driverPage * driversPerPage
  );

  /*
  const paginatedPointChanges = pointChanges.slice(
    (pointChangePage - 1) * pointChangesPerPage,
    pointChangePage * pointChangesPerPage
  );

  const handleDriverPageChange = (newPage: number) => {
    setDriverPage(newPage);
  };

  const handlePointChangePageChange = (newPage: number) => {
    setPointChangePage(newPage);
  };
  */

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driverParams = {
          TableName: 'Team06-Drivers',
        };

        const { dynamoDBClient } = await getAuthenticatedClients();
        const driverData = await dynamoDBClient.send(new ScanCommand(driverParams));

        console.log("Raw driver data from ScanCommand:", driverData.Items);

        const driverList = driverData.Items?.flatMap(item => {
          const sponsorMap = item.sponsorMap?.M || {};
        
          if (!Object.keys(sponsorMap).length) {
            console.warn("No sponsors found for driver:", item);
            return [];
          }
        
          return Object.entries(sponsorMap)
            .map(([sponsorName, sponsorDetails]) => {
              try {
                return {
                  licenseID: item.LicenseID?.S || '',
                  firstName: item.firstName?.S || '',
                  lastName: item.lastName?.S || '',
                  username: item.username?.S || '',
                  sponsorName: sponsorName,
                  points: parseInt(sponsorDetails.M?.points?.N || '0', 10),
                };
              } catch (error) {
                console.error("Error processing sponsor entry:", sponsorName, sponsorDetails, error);
                return null; // Null entry on error
              }
            })
            .filter(Boolean); // Remove any null entries
        }) || [];
        
        setDrivers(driverList as Driver[]);

      } catch (error) {
        console.error("Failed to fetch drivers:", error);
      }
    };



    fetchDrivers();
  }, []);


/*
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
  */

  const handleDriverSelection = (licenseID: string) => {
    setSelectedDrivers(prev =>
      prev.includes(licenseID)
        ? prev.filter(id => id !== licenseID) // Remove if already selected
        : [...prev, licenseID] // Add if not already selected
    );
  };


  const handleSelectAll = () => {
    const currentPageDriverIDs = paginatedDrivers.map(driver => driver.licenseID);

    // Check if all drivers on the current page are already selected
    const allSelected = currentPageDriverIDs.every(id => selectedDrivers.includes(id));

    setSelectedDrivers(prev =>
      allSelected
        ? prev.filter(id => !currentPageDriverIDs.includes(id)) // Deselect all on current page
        : [...new Set([...prev, ...currentPageDriverIDs])] // Select all on current page
    );
  };

  useEffect(() => {
    if (selectedSponsors.length === 0) {
      setFilteredDrivers([]); // Clear the driver table if no sponsors are selected
      return;
    }

    const filtered = drivers.filter(driver => selectedSponsors.includes(driver.sponsorName));
    setFilteredDrivers(filtered);

    // Ensure selected drivers are valid after filtering
    setSelectedDrivers(prev =>
      prev.filter(licenseID => filtered.some(driver => driver.licenseID === licenseID))
    );
  }, [selectedSponsors, drivers]);


  // Run fetchUserDataAndSponsorPoints on page load
useEffect(() => {
  const fetchData = async () => {
    try {
      await fetchUserDataAndSponsorPoints();
    } catch (error) {
      console.error("Error fetching user data and sponsor points:", error);
    }
  };

  fetchData(); // Call the wrapped function
}, []); // Empty dependencies array ensures this runs only once

    // Fetch user points and sponsor's point conversion from DynamoDB
    const fetchUserDataAndSponsorPoints = async () => {
      try {
        const session = await fetchAuthSession();
        console.log("Session:", session); // Log the entire session
      } catch (error) {
        console.error("Error fetching session:", error);
      }
      

      try {
        // Fetch the user's email from the session
        const session = await fetchAuthSession();
  
        // Log token payload to identify the email claim
        const tokenPayload = session?.tokens?.accessToken?.payload;
        console.log("Token Payload:", tokenPayload); // This will display the available claims in the console
    
        try {
          const session = await fetchAuthSession();
          const tokenPayload = session?.tokens?.accessToken?.payload;
          const username = tokenPayload?.username as string;
          const groups = tokenPayload?.['cognito:groups'] || []; // Check user groups
    
          if (groups.toString().includes('Admins')) {
            setUserRole('Admin');
          }
      
          // Check if user is a Sponsor
          else if (groups.toString().includes('Sponsors')) {
            setUserRole('Sponsor');
          }

          console.log(userRole);

          if (groups.toString().includes('Sponsors')) {
            // Query DynamoDB to fetch sponsor company using username as GSI
            const dynamoDBClient = new DynamoDBClient({
              region: 'us-east-2',
              credentials: session.credentials, // Use session credentials
            });
      
            const params = {
              TableName: 'Team06-Drivers', // Replace with your actual table name
              IndexName: 'username-index', // Replace with your actual GSI name
              KeyConditionExpression: 'username = :username',
              ExpressionAttributeValues: {
                ':username': { S: username },
              },
            };

            try {
              const command = new QueryCommand(params);
              const response = await dynamoDBClient.send(command);
      
              if (response.Items && response.Items.length > 0) {
                const sponsorCompany = response.Items[0].sponsorCompany?.S; // Adjust field name as per your table schema
                console.log("Sponsor Company:", sponsorCompany);

                if(!sponsorCompany)
                {
                  console.log("Not found!");
                 return; 
                }
      
                // Set the sponsor company in the state if needed
                setSelectedSponsors([sponsorCompany?.toString()]);
                setSponsors([sponsorCompany]);
              } else {
                console.log("No sponsor company found for username:", username);
              }
            } catch (error) {
              console.log("Error querying DynamoDB for sponsor company:", error);
            }
          }
      

        } catch (error) {
          console.log('Error fetching data:', error);
        }
    }
    catch (error) {
      console.log('Error fetching data:', error);
    }
  }

  const AVAILABLE_REPORTS = [
    { key: 'sales_by_sponsor_summary', label: 'Sales by Sponsor (Summary)' },
    { key: 'sales_by_sponsor_detailed', label: 'Sales by Sponsor (Detailed)' },
    { key: 'sales_by_driver_summary', label: 'Sales by Driver (Summary)' },
    { key: 'sales_by_driver_detailed', label: 'Sales by Driver (Detailed)' },
    { key: 'driver_applications', label: 'Driver Applications' },
    { key: 'point_changes', label: 'Point Changes' },
    { key: 'password_changes', label: 'Password Changes' },
    { key: 'login_attempts', label: 'Login Attempts' },
  ];

  
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportComponent, setReportComponent] = useState<React.ReactNode>(null);

  const handleFetchReport = () => {
    if (!selectedReport) {
      alert('Please select a report!');
      return;
    }
    console.log('Fetching report:', selectedReport);
    // Additional logic for fetching/displaying the selected report can go here.

    switch (selectedReport) {
      case "point_changes":
        setReportComponent(<PointChangesReport filters={{selectedDrivers, selectedSponsors, dateRange}} />);
        return ;
      case "sales_by_sponsor_summary":
        setReportComponent(<SalesBySponsorSummaryReport filters={{selectedSponsors, dateRange}} />);
        return ;
      case "sales_by_sponsor_detailed":
        setReportComponent(<SalesBySponsorDetailedReport filters={{selectedSponsors, dateRange}} />);
        return ;
        case "sales_by_driver_summary":
        setReportComponent(<SalesByDriverSummaryReport filters={{selectedDrivers, dateRange}} />);
        return ;
      case "sales_by_driver_detailed":
        setReportComponent(<SalesByDriverDetailedReport filters={{selectedDrivers, dateRange}} />);
        return ;
      case "login_attempts":
        setReportComponent(<LoginAttemptsReport filters={{selectedDrivers, dateRange}} />);
        return ;
      case "driver_applications":
        setReportComponent(<DriverApplicationsReport filters={{selectedSponsors, dateRange}} />);
        return ;
        case "password_changes":
        setReportComponent(<PasswordChangesReport filters={{selectedDrivers, dateRange}} />);
        return ;
    }
    
  };


  return (
    <div className={styles.mainBackground}>
      <ToastContainer />
      <header>
        <h1>Admin Reports and Audit Logs</h1>
      </header>

      <div className={styles.background}>
        <section>
          <h3 className={styles.h3}>Filter by Sponsor</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={paginatedSponsors.every(sponsor => selectedSponsors.includes(sponsor))}
                    onChange={handleSelectAllSponsors}
                  />
                </th>
                <th>Sponsor Name</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSponsors.map((sponsor, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSponsors.includes(sponsor)}
                      onChange={() => handleSponsorSelection(sponsor)}
                    />
                  </td>
                  <td>{sponsor}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <button
              disabled={sponsorPage === 1}
              onClick={() => setSponsorPage(sponsorPage - 1)}
            >
              Previous
            </button>
            <span>Page {sponsorPage}</span>
            <button
              disabled={sponsorPage * sponsorsPerPage >= sponsors.length}
              onClick={() => setSponsorPage(sponsorPage + 1)}
            >
              Next
            </button>
          </div>
        </section>


        {/* Driver Selection */}
        <section>
          <h3 className={styles.h3}>Filter by Driver</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={paginatedDrivers.every(driver => selectedDrivers.includes(driver.licenseID))}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>License ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Username</th>
                <th>Sponsor Name</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDrivers.map((driver, index) => (
                <tr key={`${driver.licenseID}-${driver.sponsorName}-${index}`}>
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
                  <td>{driver.username}</td>
                  <td>{driver.sponsorName}</td>
                  <td>{driver.points}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <button
              disabled={driverPage === 1}
              onClick={() => setDriverPage(driverPage - 1)}
            >
              Previous
            </button>
            <span>Page {driverPage}</span>
            <button
              disabled={driverPage * driversPerPage >= filteredDrivers.length}
              onClick={() => setDriverPage(driverPage + 1)}
            >
              Next
            </button>
          </div>
        </section>


        {/* Date Range Filter */}
        <section>
          <h3 className={styles.h3}>Filter by Date</h3>
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

        </section>

        <br />
        <br />

        <section>
          <h3 className={styles.h3}>Select a Report</h3>
          <div className={styles.reportSelection}>
            <select
              onChange={e => setSelectedReport(e.target.value)}
              value={selectedReport || ''}
              className={styles.dropdown}
            >
              <option value="" disabled>
                Choose a report
              </option>
              {AVAILABLE_REPORTS.map(report => (
                <option key={report.key} value={report.key}>
                  {report.label}
                </option>
              ))}
            </select>
            &nbsp;&nbsp;&nbsp;
            <button onClick={handleFetchReport} className={styles.button}>
              Fetch Report
            </button>
          </div>
        </section>

        {/* Display the Selected Report */}
        <section>
          {reportComponent ? (
            <div className={styles.reportContainer}>{reportComponent}</div>
          ) : (
            <p>Please select and fetch a report to display.</p>
          )}
        </section>

      </div>
    </div>

  );
}
