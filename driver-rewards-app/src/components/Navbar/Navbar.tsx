'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import '@aws-amplify/ui-react/styles.css';
import "@/app/globals.css";
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { Menu, MenuItem, Avatar, SelectField } from '@aws-amplify/ui-react';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
Amplify.configure(awsExports);

import { fetchUserAttributes } from 'aws-amplify/auth';

const Navbar = () => {
  const pathname = usePathname();
  //const router = useRouter();
  const [logged_in, set_logged_in] = useState(false);
  const [user_name, set_user_name] = useState("undefined");
  const [user_type, set_user_type] = useState("undefined");

  const [avatar_url, set_avatar_url] = useState("NoUser.png");
  const [driverID, setDriverID] = useState<string | null>(null);
  const [sponsorList, setSponsorList] = useState<string[]>([]); // Add state for sponsor list
  const [activeSponsor, setActiveSponsor] = useState<string | null>(null); // Active sponsor state
  const [showNotification, setShowNotification] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  const WARNING_LIMIT = 29 * 60 * 1000;


  useEffect(() => {
    const fetchData = async () => {
      try {
        const attributes = await fetchUserAttributes();
        const { tokens } = await fetchAuthSession();
        if (tokens == null) { throw "User Not Logged In" }
        
        // Identify user's group
        const groups = ("" + tokens.accessToken.payload["cognito:groups"]);
        
        if (groups.includes("Drivers")) {
          set_user_type("Driver");

          const session = await fetchAuthSession();
          const tokenPayload = session?.tokens?.accessToken?.payload;
          const username = tokenPayload?.username as string;

          const driverID = await fetchLicenseID(username);
          if (!driverID) {
            console.error("Driver LicenseID not found for username:", username);
            return;
          }

          setDriverID(driverID);
          
          // Fetch sponsor list for drivers only
          const driverSponsors = await fetchDriverSponsors(driverID || ''); // Fetch based on user ID
          setSponsorList(driverSponsors);

              
          const defaultSponsor = await fetchDefaultSponsor(driverID);
          setActiveSponsor(defaultSponsor);
        } else if (groups.includes("Sponsors")) {
          set_user_type("Sponsor");
        } else if (groups.includes("Admins")) {
          set_user_type("Admin");
        }
        
        set_user_name(attributes.name ?? "undefined");
        set_avatar_url(attributes.picture ?? "NoUser.png");
        set_logged_in(true);
        console.log(user_type);
      } catch (error) {
        console.error('Failed to fetch data', error, "\nAssumed User not logged in");
      }
    };
    
    fetchData().catch(console.error);

    const resetInactivityTimer = () => {
      if (logged_in) {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

        warningTimerRef.current = setTimeout(() => {
          alert("You will be signed out in one minute due to inactivity.");
        }, WARNING_LIMIT);

        inactivityTimerRef.current = setTimeout(() => {
          handleSignOut();
        }, INACTIVITY_LIMIT);
      }
    };

    const activityListener = () => {
      if (logged_in) {
        console.log("Activity detected, resetting inactivity timer.");
        resetInactivityTimer();
      }
    };

    if (logged_in) {
      window.addEventListener('mousemove', activityListener);
      window.addEventListener('keydown', activityListener);
      window.addEventListener('scroll', activityListener);
      window.addEventListener('click', activityListener);

      resetInactivityTimer();
    }

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      window.removeEventListener('mousemove', activityListener);
      window.removeEventListener('keydown', activityListener);
      window.removeEventListener('scroll', activityListener);
      window.removeEventListener('click', activityListener);
    }

  }, [logged_in]);

   // Trigger fetchData when navigating to /dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      fetchData(); // Re-fetch data when navigating to /dashboard
    }
  }, [pathname]); // Listen for changes in pathname
  

  async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
    
    const dynamoDBClient = new DynamoDBClient({
      region: 'us-east-2',
      credentials: credentials
    });
  
    return { dynamoDBClient };
  }

  const fetchData = async () => {
    try {

      //setLoading(true); // Start loading

      // Attempt to fetch the session to check if the user is authenticated
      const session = await fetchAuthSession();
      if (!session || !session.tokens) {
          throw new Error("User not authenticated");
      }

      set_logged_in(true);
      //setLoading(false); // End loading if user is logged in

      const tokens = session.tokens;

      
      const attributes = await fetchUserAttributes();
      //const { tokens } = await fetchAuthSession();
      if (tokens == null) { throw "User Not Logged In" }
      
      // Identify user's group
      const groups = ("" + tokens.accessToken.payload["cognito:groups"]);
      
      if (groups.includes("Drivers")) {
        set_user_type("Driver");

        const session = await fetchAuthSession();
        const tokenPayload = session?.tokens?.accessToken?.payload;
        const username = tokenPayload?.username as string;

        const driverID = await fetchLicenseID(username);
        if (!driverID) {
          console.error("Driver LicenseID not found for username:", username);
          return;
        }

        setDriverID(driverID);
        
        // Fetch sponsor list for drivers only
        const driverSponsors = await fetchDriverSponsors(driverID || ''); // Fetch based on user ID
        setSponsorList(driverSponsors);

            
        const defaultSponsor = await fetchDefaultSponsor(driverID);
        setActiveSponsor(defaultSponsor);
      } else if (groups.includes("Sponsors")) {
        set_user_type("Sponsor");
      } else if (groups.includes("Admins")) {
        set_user_type("Admin");
      }
      
      set_user_name(attributes.name ?? "undefined");
      set_avatar_url(attributes.picture ?? "NoUser.png");
      set_logged_in(true);
      console.log(user_type);
    } catch (error) {
      console.error('Failed to fetch data', error, "\nAssumed User not logged in");
    }
  };

  const fetchDefaultSponsor = async (driverID: string): Promise<string> => {
    try {
      const params = {
        TableName: 'Team06-Drivers',
        Key: {
          "LicenseID": { S: driverID },
        },
        ProjectionExpression: 'sponsorCompany',
      };
      const { dynamoDBClient } = await getAuthenticatedClients();
      const data = await dynamoDBClient.send(new GetItemCommand(params));
      const sponsorCompany = data.Item?.sponsorCompany?.S || '';
      console.log("Default sponsor:", sponsorCompany);
      return sponsorCompany;
    } catch (error) {
      console.error("Error fetching default sponsor:", error);
      return '';
    }
  };
  

  const fetchLicenseID = async (username: string): Promise<string | null> => {
    try {
      const params = {
        TableName: 'Team06-Drivers', // Replace with your table name
        IndexName: 'username-index', // Replace with the actual index name for username if it exists
        KeyConditionExpression: 'username = :usernameVal',
        ExpressionAttributeValues: {
          ':usernameVal': { S: username },
        },
        ProjectionExpression: 'LicenseID',
      };
      const { dynamoDBClient } = await getAuthenticatedClients();
      const data = await dynamoDBClient.send(new QueryCommand(params));
  
      // Assuming the username is unique and only returns one item
      const licenseID = data.Items?.[0]?.LicenseID?.S || null;
      console.log("Retrieved LicenseID:", licenseID);
      return licenseID;
    } catch (error) {
      console.error("Error fetching LicenseID by username:", error);
      return null;
    }
  };

  // Fetch sponsor list for driver
  const fetchDriverSponsors = async (driverID: string): Promise<string[]> => {
    try {
      const params = {
        TableName: 'Team06-Drivers', // Replace with your table name
        Key: {
          "LicenseID": { S: driverID },
        },
        ProjectionExpression: 'sponsorMap',
      };
      const { dynamoDBClient } = await getAuthenticatedClients();

      const data = await dynamoDBClient.send(new GetItemCommand(params));
      const sponsorMap = data.Item?.sponsorMap?.M;
  
      // Extract sponsor names from the sponsorMap keys
      const sponsors = sponsorMap ? Object.keys(sponsorMap) : [];
      console.log("Sponsor list:", sponsors);
      return sponsors;
    } catch (error) {
      console.error("Error fetching sponsor list:", error);
      return [];
    }
  };
  
  
  
  const handleSponsorChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSponsor = e.target.value;
    setActiveSponsor(selectedSponsor);
  
    // Ensure that driverID (LicenseID) is not null
    if (!driverID) {
      console.error("Driver ID is null. Cannot update sponsor.");
      return;
    }
  
    try {
      // Retrieve sponsor-specific data (like points) for the selected sponsor
      const params = {
        TableName: 'Team06-Drivers',
        Key: {
          "LicenseID": { S: driverID },
        },
        ProjectionExpression: `sponsorMap.${selectedSponsor}.points`,
      };
      const { dynamoDBClient } = await getAuthenticatedClients();
      const data = await dynamoDBClient.send(new GetItemCommand(params));
      const sponsorPoints = data.Item?.sponsorMap?.M?.[selectedSponsor]?.M?.points?.N;
  
      console.log(`Sponsor ${selectedSponsor} has points: ${sponsorPoints}`);
  
      // Optional: Update the `sponsorCompany` field if required
      const updateParams = {
        TableName: 'Team06-Drivers',
        Key: {
          "LicenseID": { S: driverID },
        },
        UpdateExpression: 'SET sponsorCompany = :newSponsor',
        ExpressionAttributeValues: {
          ':newSponsor': { S: selectedSponsor },
        },
      };
      await dynamoDBClient.send(new UpdateItemCommand(updateParams));
      console.log(`Updated sponsorCompany to ${selectedSponsor}`);
      setShowNotification(true);
    } catch (error) {
      console.error("Error updating sponsorCompany or fetching points:", error);
    }
  };
  
  

  async function handleSignOut() {
    await signOut();
    window.location.href = '/login';
  }

  function NavbarLogin() {
    const router = useRouter();
    if (logged_in) {
      return (
        <Menu
          trigger={
            <div className={styles.nav_user_info}>
              <div className='display: inline-block margin-right:5px'> &#x25BC; Welcome, {user_name.split(/(\s+)/)[0]}!&nbsp;</div>
              <Avatar className='display: inline-block' src={avatar_url} />
            </div>
          }
          className="nav_user_menu_content" triggerClassName="nav_user_menu"
        >
          <MenuItem onClick={() => router.push("edit")}>Profile</MenuItem>
          <MenuItem onClick={() => router.push("preferences")}>Settings & Preferences</MenuItem>
          <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>


          
        </Menu>

      );
    } else {
      console.log("NOT LOGGED!");
      return (
        <div>
          <Link href="/login"></Link>
        </div>
      );
    }
  }

  function NavbarOptions() {
    
    if (user_type === "Driver") {
      return (
        <nav>
          <div className={styles.navbar}>
          <ul className={styles.nav_center}>
            <li className={pathname === "/dashboard" ? styles.active : ''}>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li className={pathname === "/points" ? styles.active : ''}>
              <Link href="/points">Points</Link>
            </li>
            <li className={pathname === "/rewards" ? styles.active : ''}>
              <Link href="/rewards">Rewards</Link>
            </li>
            <li className={pathname === "/incident" ? styles.active : ''}>
              <Link href="/incident">Incidents</Link>
            </li>
            <li className={pathname === "/driverApplication" ? styles.active : ''}>
              <Link href="/driverApplication">Apply</Link>
            </li>
            <li className={pathname === "/about" ? styles.active : ''}>
              <Link href="/about">About Us</Link>
            </li>
          </ul>
  

          
          {/* Notification modal */}
          {showNotification && (
            <div className={styles.notificationModal}>
              <div className={styles.notificationContent}>
                <p>Your sponsor has been changed!</p>
                <button
                  className={styles.notificationContentButton}
                  onClick={() => {
                    setShowNotification(false);
                    window.location.reload();
                  }}
                >
                  Okay
                </button>
              </div>
            </div>
          )}
          </div>
        </nav>
      );
    }
  
    else if (user_type == "Sponsor") {
      return (
        <nav>
          <ul className={styles.nav_center}>
            <li className={pathname === "/dashboard" ? styles.active : ''}>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li className={pathname === "/managePoints" ? styles.active : ''}>
              <Link href="/managePoints">Manage Points</Link>
            </li>
            <li className={pathname === "/addUser" ? styles.active : ''}>
              <Link href="/add-user">Add Users</Link>
            </li>
            <li className={pathname === "/driverList" ? styles.active : ''}>
              <Link href="/driverList">Manage Drivers</Link>
            </li>
            <li className={pathname === "/billing" ? styles.active : ''}>
              <Link href="/billing">Billing</Link>
            </li>
            <li className={pathname === "/payment" ? styles.active : ''}>
              <Link href="/payment">Payment</Link>
            </li>
            <li className={pathname === "/adminReports" ? styles.active : ''}>
              <Link href="/adminReports">Reports</Link>
            </li>
            <li className={pathname === "/about" ? styles.active : ''}>
              <Link href="/about">About Us</Link>
            </li>
          </ul>


        </nav>
      )
    }
    else if (user_type == "Admin") {
      return (
        <nav>
          <ul className={styles.nav_center}>
            <li className={pathname === "/dashboard" ? styles.active : ''}>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li className={pathname === "/add-user" ? styles.active : ''}>
              <Link href="/add-user">Add Users</Link>
            </li>
            <li className={pathname === "/add-sponsor" ? styles.active : ''}>
              <Link href="/add-sponsor">Add Sponsors</Link>
            </li>
            <li className={pathname === "/adminList" ? styles.active : ''}>
              <Link href="/adminList">Manage Users</Link>
            </li>
            <li className={pathname === "/adminReports" ? styles.active : ''}>
              <Link href="/adminReports">Reports</Link>
            </li>
            <li className={pathname === "/about" ? styles.active : ''}>
              <Link href="/about">About Us</Link>
            </li>
          </ul>
        </nav>
      )
    }
    else {
      return (
        <nav>
          <ul className={styles.nav_center}>
            <li className={pathname === "/dashboard" ? styles.active : ''}>
              <Link href="/sponsors">Sponsors</Link>
            </li>
            <li className={pathname === "/about" ? styles.active : ''}>
              <Link href="/about">About Us</Link>
            </li>
            <li className={pathname === "/login" ? styles.active : ''}>
            <Link href="/login">Login</Link>
            </li>
          </ul>
        </nav>
      )
    }
  }


  return (
    <div className={styles.navbar}>
      {/* Logo Section */}
      <a href="/dashboard" className={styles.icon_home}>
        <img
          alt="Logo"
          src="TruckIcon.png"
          width={40}
          height={40}
          className={styles.truck_icon}
        />
        <h2 style={{ display: 'inline-block' }}>Driver Rewards App</h2>
      </a>
      
      {/* Centered Navigation Links */}
      <div className={styles.nav_center}>
        <NavbarOptions />
      </div>



     {/* Right Side: Sponsor Dropdown and User Menu */}
     <div className={styles.navbarRight}>
      {user_type === "Driver" && (
        <div className={styles.sponsorSelect}>
          <SelectField
            label="Select Sponsor"
            value={activeSponsor || ""}
            onChange={handleSponsorChange}
            className={styles.sponsorDropdown}
          >
            {sponsorList.map((sponsor) => (
              <option key={sponsor} value={sponsor}>
                {sponsor}
              </option>
            ))}
          </SelectField>
        </div>
      )}
      <NavbarLogin />
    </div>

    </div>
  );
};

export default Navbar;
