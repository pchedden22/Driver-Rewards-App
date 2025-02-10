'use client'; // Ensures this page runs on the client side

import '../styles/styles.css';
import styles from './add-user.module.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



import React, { useState, useEffect } from 'react';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminGetUserCommand, AdminAddUserToGroupCommand, UsernameExistsException } from '@aws-sdk/client-cognito-identity-provider';

import AWS from 'aws-sdk';
import { fetchAuthSession } from 'aws-amplify/auth';

const AddUser = () => {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNum, setPhoneNum] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [dln, setDln] = useState('');
  const [points, setPoints] = useState(0);
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  //const [message, setMessage] = useState('');
  //const [userRole, setUserRole] = useState('');
  const [createRole, setCreateRole] = useState('Drivers');
  const [availableRoles, setAvailableRoles] = useState(['Driver']); // Default for sponsors
  const [sponsorCompany, setSponsorCompany] = useState('');
  //const [username, setUsername] = useState('');

  // AWS configuration
  async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();

    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: 'us-east-2',
      credentials: credentials
    });

    const cognitoClient = new CognitoIdentityProviderClient({
      region: 'us-east-2',
      credentials: credentials
    });

    return { dynamoDB, cognitoClient };
  }

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const session = await fetchAuthSession();
        if (!session || !session.tokens) {
          throw new Error("User is not authenticated.");
        }

        const { tokens } = session;
        const username = tokens.accessToken.payload["username"];
        const groups = tokens.accessToken.payload["cognito:groups"] as string[] | undefined;

        if (groups && groups.includes("Admins")) {
          //setUserRole("Admin");
          setAvailableRoles(["Driver", "Sponsor", "Admin"]);
        } else if (groups && groups.includes("Sponsors")) {
          //setUserRole("Sponsor");

          if (username) {
            const company = await fetchSponsorCompany(username.toString());
            setCompany(company ?? 'DefaultCompany');
            setSponsorCompany(company ?? 'DefaultCompany');
            setAvailableRoles(["Driver", "Sponsor"]);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };


    fetchUserRole();
  }, []);


  // Helper function to fetch the sponsor's company from DynamoDB
  const fetchSponsorCompany = async (username: string): Promise<string> => {
    try {
      const { dynamoDB } = await getAuthenticatedClients();
      const params = {
        TableName: "Team06-Drivers",
        IndexName: "username-index", // Ensure there's a GSI for looking up by username
        KeyConditionExpression: "username = :usernameVal",
        ExpressionAttributeValues: {
          ":usernameVal": username,
        },
        ProjectionExpression: "sponsorCompany",
      };

      const data = await dynamoDB.query(params).promise();
      return data.Items?.[0]?.sponsorCompany || "DefaultCompany"; // Use DefaultCompany if not found
    } catch (error) {
      console.error("Error fetching sponsor company:", error);
      return "None";
    }
  };

  // Function to add a user to Cognito
// Function to add a user to Cognito
// Function to add a user to Cognito
const createCognitoUser = async (username: string) => {
  const { cognitoClient } = await getAuthenticatedClients();

  try {
    // Check if the user already exists
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: 'us-east-2_OgBXsNrwH',
      Username: username,
    });

    await cognitoClient.send(getUserCommand);

    // If this line executes, the user already exists
    throw new Error("User already exists.");
  } catch (error) {
    // Narrow the type of `error`
    if (error instanceof Error) {
      if (error.name === "UserNotFoundException") {
        // User does not exist, proceed with creation
        console.log("User not found, creating a new user...");

        // Create a new user in Cognito
        const createUserCommand = new AdminCreateUserCommand({
          UserPoolId: 'us-east-2_OgBXsNrwH',
          Username: username,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          TemporaryPassword: password,
        });

        await cognitoClient.send(createUserCommand); // Await for proper handling
        console.log("User created successfully in Cognito.");

        // Determine the appropriate group for the user
        let updatedRole = createRole;
        if (updatedRole === "Driver") {
          updatedRole = "Drivers";
        } else if (updatedRole === "Sponsor") {
          updatedRole = "Sponsors";
        } else if (updatedRole === "Admin") {
          updatedRole = "Admins";
        }

        // Add the user to the appropriate group
        const addUserToGroupCommand = new AdminAddUserToGroupCommand({
          UserPoolId: 'us-east-2_OgBXsNrwH',
          Username: username,
          GroupName: updatedRole,
        });

        await cognitoClient.send(addUserToGroupCommand); // Await for proper handling
        console.log(`User added to group: ${updatedRole}`);
      } else if (error.name === "UsernameExistsException") {
        console.error("User already exists:", error.message);
        throw new Error("User account already exists in Cognito.");
      } else {
        console.error("Unexpected error occurred:", error.message);
        throw error; // Re-throw unexpected errors
      }
    } else {
      console.error("An unknown error occurred", error);
      throw new Error("An unknown error occurred while creating the user.");
    }
  }
};





  // Function to add a user to DynamoDB
  const createDynamoDBUser = async (username: string, company: string) => {
    const { dynamoDB } = await getAuthenticatedClients();
    console.log("createDynamoDBUser called with:", { username, company });

    const sponsorMap = {
      [company]: {
        points: points, // Initial points value
        company: company, // Set the sponsor company
      },
    };

    setSponsorCompany(company);

    const params = {
      TableName: 'Team06-Drivers',
      Item: {
        LicenseID: dln,
        firstName,
        lastName,
        email,
        phoneNum,
        address,
        city,
        state,
        zipCode,
        points,
        role: createRole,
        sponsorCompany: company,
        sponsorMap, // Assigns company automatically if sponsor
        username,
      },
    };

    console.log("DynamoDB put params:", params);

    try {
      await dynamoDB.put(params).promise();
      console.log("User successfully added to DynamoDB.");
    } catch (error) {
      console.error("Error adding user to DynamoDB:", error);
      throw error; // Re-throw error to handle it in the calling function
    }
  };


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Derive username from email by removing the domain
    const username = email.split('@')[0]; // Takes part before "@" in email
    //setUsername(username ?? '')


    try {
      const { cognitoClient } = await getAuthenticatedClients();
      await createCognitoUser(username);  // Pass derived username
      console.log("Cognito user created successfully");

      let updatedRole = createRole;
      if (updatedRole == "Driver") {
        updatedRole = updatedRole + 's';
      }
      if (updatedRole == "Sponsor") {
        updatedRole = updatedRole + 's';
      }
      if (updatedRole == "Admin") {
        updatedRole = updatedRole + 's';
      }
      console.log(updatedRole);


      // Add user to the correct group
      const addUserToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: "us-east-2_OgBXsNrwH", // Replace with your User Pool ID
        Username: username,
        GroupName: updatedRole,
      });

      await cognitoClient.send(addUserToGroupCommand);
      console.log(`User added to group: ${updatedRole}`);

      // Proceed with DynamoDB user creation
      await createDynamoDBUser(username, company);
      toast.success("User created successfully!");
    } catch (error) {
      if (error instanceof UsernameExistsException) {
        console.error("User already exists:", error);
        toast.error("User already exists!");

      } else {
        console.error("Error creating user:", error);
        toast.error("Error in creating user!");

      }
    }
  };



  return (
    <div>
      
      <header>
        <h1>Add New User</h1>
        <p>Fill out the following form to add a new user to the rewards program.</p>
      </header>

      <div className={styles.background}>
      <ToastContainer />
        <div className={styles['content-container']}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="fname">First Name:</label><br />
            <input type="text" id="fname" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /><br />

            <label htmlFor="lname">Last Name:</label><br />
            <input type="text" id="lname" value={lastName} onChange={(e) => setLastName(e.target.value)} required /><br />

            <label htmlFor="email">Email:</label><br />
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><br />

            <label htmlFor="password">Temporary Password:</label><br />
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required /><br />

            <label htmlFor="phoneNum">Phone Number:</label><br />
            <input type="text" id="phoneNum" value={phoneNum} onChange={(e) => setPhoneNum(e.target.value)} required /><br />

            <label htmlFor="address">Address:</label><br />
            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} required /><br />

            <label htmlFor="city">City:</label><br />
            <input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} required /><br />

            <label htmlFor="state">State:</label><br />
            <input type="text" id="state" value={state} onChange={(e) => setState(e.target.value)} required /><br />

            <label htmlFor="zipCode">Zip Code:</label><br />
            <input type="text" id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required /><br />

            <label htmlFor="dln">Driver&apos;s License Number:</label><br />
            <input type="text" id="dln" value={dln} onChange={(e) => setDln(e.target.value)} required /><br />

            <label htmlFor="points">Points:</label><br />
            <input type="number" id="points" value={points === 0 ? '' : points} onChange={(e) => setPoints(Number(e.target.value))} required /><br /><br />

            {
              availableRoles.includes("Admin") ? (
                <>
                  <label htmlFor="role">Role:</label><br />
                  <select
                    id="role"

                    onChange={(e) => setCreateRole(e.target.value)}
                    className={styles.dropdown}
                    required
                  >
                    <option value="Drivers">Driver</option>
                    <option value="Sponsors">Sponsor</option>
                    <option value="Admins">Admin</option>
                  </select><br /><br />

                  <label htmlFor="company">Company:</label><br />
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={styles.dropdown}
                    placeholder="Enter company name"
                    required
                  /><br /><br />
                </>
              ) : (
                <>
                  <label htmlFor="role">Role:</label><br />
                  <select
                    id="role"

                    onChange={(e) => setCreateRole(e.target.value)}
                    className={styles.dropdown}
                    required
                  >
                    <option value="Drivers">Drivers</option>
                    <option value="Sponsors">Sponsors</option>
                  </select><br /><br />

                  <label>Company:</label><br />
                  <span>{sponsorCompany}</span><br /><br />
                </>
              )}


            <button type="submit">Add User</button>
          </form>
        </div>

        
      </div>
    </div>
  );
};

export default AddUser;
