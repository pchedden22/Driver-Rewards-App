'use client';

import React, { useState, useEffect } from 'react';
import AWS from 'aws-sdk';
import styles from './adminList.module.css';
import { useRouter } from 'next/navigation';
//import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { signOut, signIn, confirmSignIn, fetchAuthSession } from 'aws-amplify/auth';

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();
  
  const dynamoDB = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2',
    credentials: credentials
  });

  const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
    region: 'us-east-2',
    credentials: credentials
  });

  return { dynamoDB, cognitoIdentityServiceProvider };
}

interface User {
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  LicenseID: string;
  sponsorMap?: { company: string; points: number }[];
  items?: { itemId: string; itemName: string; price: number; redeemedDate: string }[];
}

interface SponsorCompany {
  sponsorID: string;
  sponsorName: string;
}


const AdminPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [companyFilter, setCompanyFilter] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [sponsorCompanies, setSponsorCompanies] = useState<SponsorCompany[]>([]);
  const [removedUsers, setRemovedUsers] = useState<User[]>([]);
  const [removedCompanies, setRemovedCompanies] = useState<SponsorCompany[]>([]);


  // Fetch users from DynamoDB
  useEffect(() => {


    //JUST TO PREVENT ERRORS TEMPORARILY
    console.log(sponsorCompanies);

    const fetchData = async () => {
      setLoading(true);

      try {
        const { dynamoDB } = await getAuthenticatedClients();
        const params = {
          TableName: 'Team06-Drivers', // Replace with your table name
        };

        const result = await dynamoDB.scan(params).promise();

        /* eslint-disable @typescript-eslint/ban-ts-comment */
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const fetchedUsers = result.Items?.map((item: any) => {
          const sponsorMap = item.sponsorMap ? Object.entries(item.sponsorMap).map(([company, details]: [string, any]) => ({ company, points: details.points, })) : []; // Extract sponsor keys if available
          return {
            username: item.username,
            email: item.email,
            role: item.role,
            city: item.city,
            emergencyName: item.emergencyName,
            emergencyPhone: item.emergencyPhone,
            emergencyRelationship: item.emergencyRelationship,
            firstName: item.firstName,
            lastName: item.lastName,
            phoneNum: item.phoneNum,
            profilePictureurl: item.profilePictureurl,
            sponsorCompany: item.sponsorCompany,
            state: item.state,
            vehiclePlate: item.vehiclePlate,
            vehicleType: item.vehicleType,
            zipCode: item.zipCode,
            LicenseID: item.LicenseID,
            cdlImageUrl: item.cdlImageUrl,
            driverLicenseImageUrl: item.driverLicenseImageUrl,
            items: item.items ?? [],
            sponsorMap: Array.isArray(sponsorMap) && sponsorMap.length > 0 ? sponsorMap : null,
          };
        }) as User[];



        setUsers(fetchedUsers);


        // Fetch sponsor companies
        const sponsorParams = { TableName: 'Team06-Sponsors' };
        const sponsorResult = await dynamoDB.scan(sponsorParams).promise();

        const fetchedCompanies = sponsorResult.Items?.map((item: any) => ({
          sponsorID: item.SponsorID,
          sponsorName: item.SponsorName,
        })) as SponsorCompany[];

        setSponsorCompanies(fetchedCompanies);

        // Fetch removed users
        const removedUserParams = { TableName: 'Team06-RemovedDrivers' };
        const removedUserResult = await dynamoDB.scan(removedUserParams).promise();

        const fetchedRemovedUsers = removedUserResult.Items?.map((item: any) => ({
          username: item.username,
          email: item.email,
          role: item.role,
          city: item.city,
          emergencyName: item.emergencyName,
          emergencyPhone: item.emergencyPhone,
          emergencyRelationship: item.emergencyRelationship,
          firstName: item.firstName,
          lastName: item.lastName,
          phoneNum: item.phoneNum,
          profilePictureurl: item.profilePictureurl,
          sponsorCompany: item.sponsorCompany,
          state: item.state,
          vehiclePlate: item.vehiclePlate,
          vehicleType: item.vehicleType,
          zipCode: item.zipCode,
          LicenseID: item.LicenseID,
          cdlImageUrl: item.cdlImageUrl,
          driverLicenseImageUrl: item.driverLicenseImageUrl,
          items: item.items ?? [],
          sponsorMap: item.sponsorMap ? Object.entries(item.sponsorMap).map(([company, details]: [string, any]) => ({ company, points: details.points, })) : [],
        })) as User[];

        setRemovedUsers(fetchedRemovedUsers);

        // Fetch removed sponsor companies
        const removedCompanyParams = { TableName: 'Team06-RemovedSponsors' };
        const removedCompanyResult = await dynamoDB.scan(removedCompanyParams).promise();

        const fetchedRemovedCompanies = removedCompanyResult.Items?.map((item: any) => ({
          sponsorID: item.SponsorID,
          sponsorName: item.SponsorName,
        })) as SponsorCompany[];

        setRemovedCompanies(fetchedRemovedCompanies);
      } catch (error) {
        console.error('Error fetching data from DynamoDB:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters when searchTerm, selectedRole, or companyFilter changes
  useEffect(() => {
    setFilteredUsers(
      users.filter((user) => {
        // Exclude users without sponsorMap
        if (!user.sponsorMap || !Array.isArray(user.sponsorMap)) {
          console.warn(`User ${user.username} is missing a valid sponsorMap.`);
          return false;
        }


        const matchesRole =
          selectedRole === 'All' || user.role === selectedRole;

        const matchesSearchTerm =
          user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false; // Ensure it defaults to `false` if both are undefined


        const matchesCompany =
          !companyFilter ||
          user.sponsorMap?.some((entry: { company: string; points: number }) =>
            entry.company.toLowerCase().startsWith(companyFilter.toLowerCase())
          );

        return matchesRole && matchesSearchTerm && matchesCompany;
      })
    );
  }, [searchTerm, selectedRole, companyFilter, users]);



  const handleAssumeRole = async (driver: User) => {
    console.log(`Assuming role for driver: ${driver.username}`);
    alert(`Ready to assume role for: ${driver.firstName} ${driver.lastName}`);

    const { cognitoIdentityServiceProvider } = await getAuthenticatedClients();

    try {
      const response = await cognitoIdentityServiceProvider.adminInitiateAuth({
        UserPoolId: "us-east-2_OgBXsNrwH",
        ClientId: "28ajnq9pd6h5ae07og5fsd4jfm",
        AuthFlow: 'CUSTOM_AUTH',
        AuthParameters: {
          USERNAME: driver.username,
        },
      }).promise();

      console.log('Custom auth initiated:', response.AuthenticationResult);



      // const authResponse = cognito.adminRespondToAuthChallenge({
      //     Session: response.Session,
      //     UserPoolId: "us-east-2_OgBXsNrwH",
      //     ClientId: "28ajnq9pd6h5ae07og5fsd4jfm",
      //     ChallengeName: response.ChallengeName,
      //     ChallengeResponses: {
      //         secret: "secret",
      //         USERNAME: driver.username,
      //         ANSWER: "bar",
      //         Session: response.Session,
      //     },

      // }).promise();

      // console.log('Custom auth processed:', (await authResponse).AuthenticationResult);

      const challengeResponse = 'secret';
      const username = driver.username;
      await signOut();
      const { nextStep } = await signIn({
        username,
        options: {
          authFlowType: 'CUSTOM_WITHOUT_SRP'
        }
      });

      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
        // to send the answer of the custom challenge
        await confirmSignIn({ challengeResponse });
      }

      router.push('/dashboard');
      return response;
    } catch (error) {
      console.error('Error initiating custom auth:', error);
      throw error;
    }
  }

  const handleEditUser = (user: User) => {
    if (!user.username) {
      console.error('No username provided');
      return;
    }
    router.push(`/adminList/edit?username=${encodeURIComponent(user.username)}`);
  };

  const handleDisableUser = async (user: User) => {
    if (!user.username) {
      console.error('No username provided');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to disable user: ${user.firstName} ${user.lastName}?`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const { cognitoIdentityServiceProvider } = await getAuthenticatedClients();
      const params = {
        UserPoolId: 'us-east-2_OgBXsNrwH',
        Username: user.username
      };

      await cognitoIdentityServiceProvider.adminDisableUser(params).promise();

      // Close the modal
      setSelectedUser(null);

      // Show success message
      alert(`User ${user.firstName} ${user.lastName} has been disabled successfully`);

    } catch (error) {
      console.error('Error disabling user:', error);
      alert('Failed to disable user. Please try again.');
    }

    try {
      const { dynamoDB } = await getAuthenticatedClients();
      const sourceTable = 'Team06-Drivers';
      const targetTable = 'Team06-RemovedDrivers';

      // Fetch the full user item from DynamoDB to ensure all properties are captured
      const getParams = {
        TableName: sourceTable,
        Key: { LicenseID: user.LicenseID },
      };
      const { Item: fullUser } = await dynamoDB.get(getParams).promise();

      if (!fullUser) {
        alert('User not found in the source table.');
        return;
      }

      // Add the user to the removed table
      const putParams = {
        TableName: targetTable,
        Item: { ...fullUser, removedAt: new Date().toISOString() }, // Add a timestamp
      };
      await dynamoDB.put(putParams).promise();

      // Delete the user from the active table
      const deleteParams = {
        TableName: sourceTable,
        Key: { LicenseID: user.LicenseID },
      };
      await dynamoDB.delete(deleteParams).promise();

      alert(`${user.role} ${user.firstName} ${user.lastName} removed successfully.`);
      setUsers((prev) => prev.filter((u) => u.username !== user.username));
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user. Please try again.');
    }


  };



  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { dynamoDB } = await getAuthenticatedClients();
        // Fetch active sponsors
        const sponsorParams = { TableName: 'Team06-Sponsors' };
        const sponsorResult = await dynamoDB.scan(sponsorParams).promise();
  
        const activeSponsors = sponsorResult.Items?.map((item: any) => ({
          sponsorID: item.SponsorID,
          sponsorName: item.SponsorName,
        })) as SponsorCompany[];
        setSponsorCompanies(activeSponsors);
  
        // Fetch removed sponsors
        const removedSponsorParams = { TableName: 'Team06-RemovedSponsors' };
        const removedSponsorResult = await dynamoDB.scan(removedSponsorParams).promise();
  
        const removedSponsors = removedSponsorResult.Items?.map((item: any) => ({
          sponsorID: item.SponsorID,
          sponsorName: item.SponsorName,
        })) as SponsorCompany[];
        setRemovedCompanies(removedSponsors);
      } catch (error) {
        console.error('Error fetching sponsor data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  


  const reinstateUser = async (user: User) => {
    try {
      const confirmReinstate = window.confirm(
        `Are you sure you want to reinstate ${user.role}: ${user.firstName} ${user.lastName}?`
      );

      if (!confirmReinstate) return;

      const sourceTable = 'Team06-RemovedDrivers';
      const targetTable = 'Team06-Drivers';

      // Reenable the user's Cognito account
      try {
        const { cognitoIdentityServiceProvider } = await getAuthenticatedClients();
        const params = {
          UserPoolId: 'us-east-2_OgBXsNrwH',
          Username: user.username
        };
        
        await cognitoIdentityServiceProvider.adminEnableUser(params).promise();
        console.log(`User ${user.username} reenabled in Cognito.`);
      } catch (cognitoError) {
        console.error("Error reenabling user in Cognito:", cognitoError);
        throw new Error("Failed to reenable user in Cognito.");
      }

      // Add the user back to the active table
      const putParams = {
        TableName: targetTable,
        Item: { ...user }, // Restore all properties
      };
      const { dynamoDB } = await getAuthenticatedClients();
      await dynamoDB.put(putParams).promise();

      // Delete the user from the removed table
      const deleteParams = {
        TableName: sourceTable,
        Key: { username: user.username },
      };
      await dynamoDB.delete(deleteParams).promise();

      alert(`${user.role} ${user.firstName} ${user.lastName} reinstated successfully.`);
      setUsers((prev) => [...prev, user]);
    } catch (error) {
      console.error('Error reinstating user:', error);
      alert('Failed to reinstate user. Please try again.');
    }
  };

  const removeSponsorCompany = async (company: SponsorCompany) => {
    try {
      const confirmRemove = window.confirm(
        `Are you sure you want to remove Sponsor Company: ${company.sponsorName}?`
      );
  
      if (!confirmRemove) return;
  
      const sourceTable = 'Team06-Sponsors';
      const targetTable = 'Team06-RemovedSponsors';
  
      console.log('Removing Company:', company);
  
      // Fetch the full company record
      const getParams = {
        TableName: sourceTable,
        Key: {
          SponsorID: company.sponsorID, // Ensure these match the table schema
          SponsorName: company.sponsorName,
        },
      };
      const { dynamoDB } = await getAuthenticatedClients();
      const result = await dynamoDB.get(getParams).promise();
      console.log('Fetched Company:', result.Item);
  
      if (!result.Item) {
        alert('Sponsor company not found in active table.');
        return;
      }
  
      const fullCompany = result.Item;
  
      // Add the company to the removed table
      const putParams = {
        TableName: targetTable,
        Item: {
          sponsorName: fullCompany.SponsorName, // Use SponsorName as partition key
          removedAt: new Date().toISOString(), // Add timestamp for removal
          SponsorID: fullCompany.SponsorID, // Include extra fields if needed
          ...fullCompany, // Include all other fields, ensuring no key conflicts
        },
      };
      
      console.log('Putting item into removed table:', JSON.stringify(putParams, null, 2));
      await dynamoDB.put(putParams).promise();
  
      // Delete the company from the active table
      const deleteParams = {
        TableName: sourceTable,
        Key: {
          SponsorID: company.sponsorID,
          SponsorName: company.sponsorName,
        },
      };
      console.log('Deleting item from active table:', deleteParams);
      await dynamoDB.delete(deleteParams).promise();
  
      alert(`Sponsor Company ${company.sponsorName} removed successfully.`);
      setSponsorCompanies((prev) =>
        prev.filter((c) => c.sponsorID !== company.sponsorID)
      );
      setRemovedCompanies((prev) => [...prev, { ...company }]);
    } catch (error) {
      console.error('Error removing sponsor company:', error);
      alert('Failed to remove sponsor company. Please try again.');
    }
  };
  
  
  
  const reinstateSponsorCompany = async (company: SponsorCompany) => {
    try {
      const confirmReinstate = window.confirm(
        `Are you sure you want to reinstate Sponsor Company: ${company.sponsorName}?`
      );
  
      if (!confirmReinstate) return;
  
      const sourceTable = 'Team06-RemovedSponsors';
      const targetTable = 'Team06-Sponsors';
  
      // Fetch the full company record
      const getParams = {
        TableName: sourceTable,
        Key: {
          sponsorName: company.sponsorName, // Use sponsorName as the partition key
        },
      };
      const { dynamoDB } = await getAuthenticatedClients();
      const result = await dynamoDB.get(getParams).promise();
  
      if (!result.Item) {
        alert('Sponsor company not found in removed table.');
        return;
      }
  
      const fullCompany = result.Item;
  
      // Ensure SponsorName and other required keys are present
      if (!fullCompany.sponsorName) {
        console.error('Missing sponsorName in the fetched data:', fullCompany);
        alert('Invalid sponsor company data. Cannot reinstate.');
        return;
      }
  
      // Add the company back to the active table
      const putParams = {
        TableName: targetTable,
        Item: {
          SponsorID: fullCompany.SponsorID || '', // Ensure SponsorID is included or provide a fallback
          SponsorName: fullCompany.sponsorName, // Ensure sponsorName matches partition key in active table
          ...fullCompany, // Include all additional fields
        },
      };
      console.log('Putting item into active table:', putParams);
      await dynamoDB.put(putParams).promise();
  
      // Delete the company from the removed table
      const deleteParams = {
        TableName: sourceTable,
        Key: {
          sponsorName: company.sponsorName, // Use sponsorName as the key for deletion
        },
      };
      await dynamoDB.delete(deleteParams).promise();
  
      alert(`Sponsor Company ${company.sponsorName} reinstated successfully.`);
      setRemovedCompanies((prev) =>
        prev.filter((removed) => removed.sponsorName !== company.sponsorName)
      );
      setSponsorCompanies((prev) => [
        ...prev,
        {
          sponsorID: fullCompany.SponsorID || '',
          sponsorName: fullCompany.sponsorName,
          ...fullCompany, // Add additional fields as needed
        } as SponsorCompany, // Type assertion to ensure compatibility
      ]);
    } catch (error) {
      console.error('Error reinstating sponsor company:', error);
      alert('Failed to reinstate sponsor company. Please try again.');
    }
  };
  
  
  
  



  return (
    <div className={styles.background}>
      <header className={styles.header}>
        <h1>User Management</h1>
        <h2>Search and filter users below.</h2>
      </header>

      <div className={styles.contentContainer}>
        <div className={styles.filtersContainer}>
          {/* Role Selector */}
          <div className={styles.filterItem}>
            <label htmlFor="role" className={styles.filterLabel}>Role:</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={styles.filterInput}
            >
              <option value="All">All</option>
              <option value="Admin">Admins</option>
              <option value="Sponsor">Sponsors</option>
              <option value="Driver">Drivers</option>
            </select>
          </div>

          {/* Company Filter */}
          <div className={styles.filterItem}>
            <label htmlFor="company" className={styles.filterLabel}>Company:</label>
            <input
              type="text"
              id="company"
              placeholder="Filter by company"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          {/* Search Input */}
          <div className={styles.filterItem}>
            <label htmlFor="search" className={styles.filterLabel}>Name:</label>
            <input
              type="text"
              id="search"
              placeholder="Search by username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.filterInput}
            />
          </div>
        </div>


        {/* User Table */}
        {loading ? (
          <p>Loading...</p>
        ) : filteredUsers.length > 0 ? (
          <table className={styles.driverTable}>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>User Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={index} onClick={() => setSelectedUser(user)}>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.username}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.sponsorMap
                      ? user.sponsorMap.map((entry) => entry.company).join(', ')
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        ) : (
          <p>No users found matching the criteria.</p>
        )}

        {/* User Modal */}
        {selectedUser && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3 className={styles.header3}>User Details</h3>
              <p><strong>Username:</strong> {selectedUser.username}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Role:</strong> {selectedUser.role}</p>
              <p><strong>Company:</strong> {selectedUser.sponsorMap
                ? selectedUser.sponsorMap.map((entry) => entry.company).join(', ')
                : 'N/A'}</p>

              <div className={styles.modalActions}>
              <br />
                <button
                  className={styles.closeButton}
                  onClick={() => handleAssumeRole(selectedUser)}
                >
                  Assume Role
                </button>
&nbsp;&nbsp;
                <button
                  className={styles.closeButton}
                  onClick={() => handleEditUser(selectedUser)}
                >
                  Edit User
                </button>
                &nbsp;&nbsp;
                <button
                  className={styles.closeButton}
                  onClick={() => handleDisableUser(selectedUser)}
                >
                  Disable User
                </button>
<br /><br />
                <button
                  className={styles.closeButton}
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}



<div className={styles.sponsorSection}>
  <h2 className={styles.sponsorSectionHeader}>Removed Users</h2>
  {removedUsers.length > 0 ? (
    <table className={styles.driverTable}>
      <thead>
        <tr>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Role</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {removedUsers.map((user) => (
          <tr key={user.username}>
            <td>{user.firstName}</td>
            <td>{user.lastName}</td>
            <td>{user.role}</td>
            <td>
              <button
                className={styles.successButton}
                onClick={() => reinstateUser(user)}
              >
                Reinstate
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className={styles.emptyMessage}>No removed users found.</p>
  )}
</div>

<div className={styles.sponsorSection}>
  <h2 className={styles.sponsorSectionHeader}>Active Sponsor Companies</h2>
  {loading ? (
    <p className={styles.emptyMessage}>Loading...</p>
  ) : sponsorCompanies.length > 0 ? (
    <table className={styles.driverTable}>
      <thead>
        <tr>
          <th>Company Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sponsorCompanies.map((company) => (
          <tr key={company.sponsorID}>
            <td>{company.sponsorName}</td>
            <td>
              <button
                className={styles.warningButton}
                onClick={() => removeSponsorCompany(company)}
              >
                Remove
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className={styles.emptyMessage}>No active sponsor companies found.</p>
  )}
</div>

<div className={styles.sponsorSection}>
  <h2 className={styles.sponsorSectionHeader}>Removed Sponsor Companies</h2>
  {removedCompanies.length > 0 ? (
    <table className={styles.driverTable}>
      <thead>
        <tr>
          <th>Company Name</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {removedCompanies.map((company) => (
          <tr key={company.sponsorID}>
            <td>{company.sponsorName}</td>
            <td>
              <button
                className={styles.successButton}
                onClick={() => reinstateSponsorCompany(company)}
              >
                Reinstate
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className={styles.emptyMessage}>No removed sponsor companies found.</p>
  )}
</div>

      </div>
    </div>
  );
};

export default AdminPage;
