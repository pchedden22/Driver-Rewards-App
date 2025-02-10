'use client';
import '@/app/globals.css';
import styles from './preferences.module.css';
import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { v4 as uuidv4 } from 'uuid';
import {
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
  DeleteItemCommand,
  PutItemCommand, // Added to enable inserting data into Team06-DeletedDrivers
} from "@aws-sdk/client-dynamodb";

import { CognitoIdentityProviderClient, AdminDisableUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { fetchAuthSession } from 'aws-amplify/auth';


Amplify.configure(awsExports);

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();
  
  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials
  });

  const cognitoClient = new CognitoIdentityProviderClient({
    region: 'us-east-2',
    credentials: credentials
  });

  return { dynamoDBClient, cognitoClient };
}

export default function AccountSettings() {
  const [licenseID, setLicenseID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  //const [email, setEmail] = useState<string | null>(null);
  const [settingsData, setSettingsData] = useState({
    language: '',
    timeZone: '',
    currency: '',
    dateFormat: '',
    measurementSystem: '',
    emailNotifications: false,
    smsNotifications: false,
    appNotifications: false,
    password: '',
    allowDataSharing: false,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  useEffect(() => {
    const fetchEmailFromDriversTable = async () => {
      try {
        const session = await fetchAuthSession();
        if (!session || !session.tokens) {
          throw new Error("User is not authenticated.");
        }
  
        const { tokens } = session;
        const fetchedUsername = tokens.accessToken.payload["username"] as string | null;
  
        if (!fetchedUsername) {
          console.error("Username not found in session tokens.");
          return;
        }
  
        console.log("Fetching email for username:", fetchedUsername);
  
        const params = {
          TableName: "Team06-Drivers", // Replace with your table name
          IndexName: "username-index", // Ensure this index exists for querying by username
          KeyConditionExpression: "username = :usernameValue",
          ExpressionAttributeValues: {
            ":usernameValue": { S: fetchedUsername },
          },
        };
  
        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new QueryCommand(params));
  
        if (data.Items && data.Items.length > 0) {
          const fetchedEmail = data.Items[0]?.email?.S || null; // Adjust "email" key based on table structure
          if (fetchedEmail) {
            setEmail(fetchedEmail);
            console.log("Email fetched from DynamoDB:", fetchedEmail);
          } else {
            console.warn("No email found for the user in DynamoDB.");
          }
        } else {
          console.warn("No matching record found in DynamoDB for username:", fetchedUsername);
        }
      } catch (error) {
        console.error("Error fetching email from drivers table:", error);
      }
    };
  
    fetchEmailFromDriversTable();
  }, []);
  

  useEffect(() => {
    const fetchLicenseID = async () => {
      try {
        const session = await fetchAuthSession();
        if (!session || !session.tokens) {
          throw new Error("User is not authenticated.");
        }

        const { tokens } = session;
        const fetchedUsername = tokens.accessToken.payload["username"] as string | null;
        const fetchedEmail = tokens.accessToken.payload["email"] as string | null;
        
        setUsername(fetchedUsername);
        

        if (!fetchedUsername && !fetchedEmail) {
          console.error('Unable to fetch user identifier.');
          return;
        }

        const params = {
          TableName: 'Team06-Drivers',
          IndexName: fetchedUsername ? 'username-index' : 'email-index',
          KeyConditionExpression: fetchedUsername
            ? 'username = :usernameValue'
            : 'email = :emailValue',
          ExpressionAttributeValues: {
            ...(fetchedUsername && { ':usernameValue': { S: fetchedUsername } }),
            ...(fetchedEmail && { ':emailValue': { S: fetchedEmail } }),
          },
        };
        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new QueryCommand(params));
        if (data.Items && data.Items.length > 0) {
          const fetchedLicenseID = data.Items[0].LicenseID?.S || null;
          setLicenseID(fetchedLicenseID);
        } else {
          console.error('No LicenseID found for the user.');
        }
      } catch (error) {
        console.error('Error fetching LicenseID:', error);
      }
    };

    fetchLicenseID();
  }, []);

  const languageMap: { [key: string]: string } = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
  };

  useEffect(() => {
    if (!licenseID) return;

    const fetchSettings = async () => {
      const params = {
        TableName: 'Team06-Drivers',
        Key: {
          "LicenseID": { S: licenseID },
        },
      };

      try {
        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new GetItemCommand(params));
        console.log("Settings data fetched from DynamoDB:", data.Item);
        if (data.Item) {
          setSettingsData({
            language: data.Item.language?.S || 'en', // Default to 'en'
            timeZone: data.Item.timeZone?.S || 'GMT', // Default to 'GMT'
            currency: data.Item.currency?.S || 'USD', // Default to 'USD'
            dateFormat: data.Item.dateFormat?.S || 'MM/DD/YYYY', // Default to 'MM/DD/YYYY'
            measurementSystem: data.Item.measurementSystem?.S || 'metric', // Default to 'metric'
            emailNotifications: data.Item.emailNotifications?.BOOL ?? false,
            smsNotifications: data.Item.smsNotifications?.BOOL ?? false,
            appNotifications: data.Item.appNotifications?.BOOL ?? false,
            allowDataSharing: data.Item.allowDataSharing?.BOOL ?? false,
            password: data.Item.password?.S || '',
          });
        } else {
          alert('No settings found');
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        alert('Unable to load account settings');
      }
    };

    fetchSettings();
  }, [licenseID]);


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type, checked } = e.target  as HTMLInputElement;;
    setSettingsData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!licenseID) {
      alert("Unable to save settings. LicenseID is missing.");
      return;
    }

    const params = {
      TableName: 'Team06-Drivers',
      Key: {
        "LicenseID": { S: licenseID },
      },
      UpdateExpression:
        "set #language = :l, #timeZone = :t, currency = :c, dateFormat = :d, measurementSystem = :m, " +
        "emailNotifications = :en, smsNotifications = :sn, appNotifications = :an, allowDataSharing = :ads",
      ExpressionAttributeNames: {
        "#language": "language", // Alias for reserved keyword
        "#timeZone": "timeZone", // Alias for reserved keyword
      },
      ExpressionAttributeValues: {
        ":l": { S: settingsData.language },
        ":t": { S: settingsData.timeZone },
        ":c": { S: settingsData.currency },
        ":d": { S: settingsData.dateFormat },
        ":m": { S: settingsData.measurementSystem },
        ":en": { BOOL: settingsData.emailNotifications },
        ":sn": { BOOL: settingsData.smsNotifications },
        ":an": { BOOL: settingsData.appNotifications },
        ":ads": { BOOL: settingsData.allowDataSharing },
      },
    };
    
    

    try {
      const { dynamoDBClient } = await getAuthenticatedClients();
      await dynamoDBClient.send(new UpdateItemCommand(params));
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000); // Hide confirmation after 3 seconds
    } catch (err) {
      console.error("Unable to update settings. Error:", err);
      alert('Error saving settings');
    }

    toast.success("Changes saved successfully!");
  };

  const handleDeleteAccount = async () => {
    const confirmation = confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    if (!confirmation) return;
  
    try {
      if (licenseID) {
        // Step 1: Retrieve the record from the Team06-Drivers table
        const getParams = {
          TableName: 'Team06-Drivers',
          Key: {
            LicenseID: { S: licenseID },
          },
        };
        const { dynamoDBClient } = await getAuthenticatedClients();
        const data = await dynamoDBClient.send(new GetItemCommand(getParams));
        if (!data.Item) {
          console.error('No record found in Team06-Drivers for deletion.');
          alert('No record found to delete.');
          return;
        }
  
        // Step 2: Insert the retrieved record into the Team06-DeletedDrivers table
        const putParams = {
          TableName: 'Team06-DeletedDrivers',
          Item: {
            ...data.Item, // Copy all attributes from the original record
            DeletedAt: { S: new Date().toISOString() }, // Add a timestamp for deletion
          },
        };
  
        await dynamoDBClient.send(new PutItemCommand(putParams));
        console.log(`Successfully moved record with LicenseID: ${licenseID} to Team06-DeletedDrivers.`);
  
        // Step 3: Delete the record from the Team06-Drivers table
        const deleteParams = {
          TableName: 'Team06-Drivers',
          Key: {
            LicenseID: { S: licenseID },
          },
        };
  
        await dynamoDBClient.send(new DeleteItemCommand(deleteParams));
        console.log(`Successfully deleted record with LicenseID: ${licenseID} from Team06-Drivers.`);
      } else {
        console.warn('No LicenseID found. Skipping database deletion.');
      }
  
      // Step 4: Disable the user in Cognito
      if (username) {
        const disableParams = {
          UserPoolId: 'us-east-2_OgBXsNrwH', // Replace with your Cognito User Pool ID
          Username: username,
        };
        const { cognitoClient } = await getAuthenticatedClients();
        await cognitoClient.send(new AdminDisableUserCommand(disableParams));
        console.log(`Successfully disabled user in Cognito: ${username}`);
        alert('Your account has been disabled and archived.');
      } else {
        console.warn('No valid username found for Cognito. Skipping account disable.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting your account.');
    }
  };
  
  const resetToDefaults = () => {
    const defaultSettings = {
      language: 'en',
      timeZone: 'GMT',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      measurementSystem: 'metric',
      password: 'Password1!',
      emailNotifications: true,
      smsNotifications: false,
      appNotifications: true,
      allowDataSharing: false,
    };
    setSettingsData(defaultSettings);
  };

  

  const handleForgotPassword = async () => {
    const { cognitoClient } = await getAuthenticatedClients();
    console.log('Email:', email);
    try {
      const command = new ForgotPasswordCommand({
        ClientId: "28ajnq9pd6h5ae07og5fsd4jfm", // Replace with your Cognito app client ID
        Username: email,
      });
  
      await cognitoClient.send(command);
      alert("A reset code has been sent to your email.");
    } catch (error) {
      console.error("Error sending reset password email:", error);
      alert("Error sending reset password email.");
    }
  };
  
  const handleConfirmResetPassword = async () => {
    const { cognitoClient, dynamoDBClient } = await getAuthenticatedClients();
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: "28ajnq9pd6h5ae07og5fsd4jfm", // Replace with your Cognito app client ID
        Username: email,
        ConfirmationCode: resetCode,
        Password: newPassword,
      });
  
      await cognitoClient.send(command);
      alert("Password reset successful. You can now log in with your new password.");

      // Extract the username portion from the email (everything before the @)
      const username = email.split("@")[0];
  
      // Add a record to Team06-PasswordChanges with a unique ID
      const timestamp = new Date().toISOString(); // Record the current time
      const uniqueId = uuidv4(); // Generate a unique ID for each reset
      const putItemParams = {
        TableName: "Team06-PasswordChanges",
        Item: {
          id: { S: uniqueId }, // Unique ID as part of the primary key
          username: { S: username }, // Username
          timestamp: { S: timestamp }, // Record the time of password change
          action: { S: "Password Reset" }, // Action description
        },
      };
  
      await dynamoDBClient.send(new PutItemCommand(putItemParams));
      console.log("Password change recorded in Team06-PasswordChanges table.");
  
      setForgotPasswordMode(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("Error resetting password.");
    }
  };
  


  return (
    <div>
      <ToastContainer />
      <div className={styles.mainBackground}>
      <div className={styles.container}>
      <header className={styles.header}>
        <h1>Account Settings</h1>
        <p>Update your preferences below.</p>
      </header>
      <div className={styles.settingsForm}>
        {!isEditing ? (
          <div id="settingsDisplay">
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Regional Preferences</h3>
            <p>Language: {languageMap[settingsData.language] || "Unknown"}</p>
            <p>Time Zone: {settingsData.timeZone}</p>
            <p>Currency: {settingsData.currency}</p>
            <p>Date Format: {settingsData.dateFormat}</p>
            <p>Measurement System: {settingsData.measurementSystem}</p>
            <p>Email Notifications: {settingsData.emailNotifications ? 'On' : 'Off'}</p>
            <p>SMS Notifications: {settingsData.smsNotifications ? 'On' : 'Off'}</p>
            <p>App Notifications: {settingsData.appNotifications ? 'On' : 'Off'}</p>
            <p>Allow Data Sharing: {settingsData.allowDataSharing ? 'Yes' : 'No'}</p>
            <button className={styles.editButton} onClick={() => setIsEditing(true)}>Edit Settings</button>
          </div>
        ) : (
          <form id="settingsForm" className={styles.settingsEditForm}>
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Regional Preferences</h3>
            <label htmlFor="language">Language:</label>
<select id="language" name="language" value={settingsData.language} onChange={handleChange}>
  {Object.entries(languageMap).map(([code, name]) => (
    <option key={code} value={code}>
      {name}
    </option>
  ))}
</select>


            <label htmlFor="timeZone">Time Zone:</label>
            <select id="timeZone" name="timeZone" value={settingsData.timeZone} onChange={handleChange}>
              <option value="GMT">GMT</option>
              <option value="EST">EST</option>
              <option value="PST">PST</option>
              <option value="CST">CST</option>
            </select>

            <label htmlFor="currency">Currency:</label>
            <select id="currency" name="currency" value={settingsData.currency} onChange={handleChange}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>

            <label htmlFor="dateFormat">Date Format:</label>
            <select id="dateFormat" name="dateFormat" value={settingsData.dateFormat} onChange={handleChange}>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            </select>

            <label htmlFor="measurementSystem">Measurement System:</label>
            <select id="measurementSystem" name="measurementSystem" value={settingsData.measurementSystem} onChange={handleChange}>
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>

            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Notification Preferences</h3>
            <label>
              <input type="checkbox" name="emailNotifications" checked={settingsData.emailNotifications} onChange={handleChange} />
              Email Notifications
            </label>
            <label>
              <input type="checkbox" name="smsNotifications" checked={settingsData.smsNotifications} onChange={handleChange} />
              SMS Notifications
            </label>
            <label>
              <input type="checkbox" name="appNotifications" checked={settingsData.appNotifications} onChange={handleChange} />
              App Notifications
            </label>

            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Privacy Settings</h3>
            <label>
              <input type="checkbox" name="allowDataSharing" checked={settingsData.allowDataSharing} onChange={handleChange} />
              Allow Data Sharing with Third Parties
            </label>

            <div className={styles.buttonContainer}>
              <button type="button" className={styles.editButton} onClick={handleSave}>Save Changes</button> &nbsp;
              <button type="button" className={styles.editButton} onClick={() => setIsEditing(false)}>Cancel</button>
            </div>

            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Account Management</h3>
            <button type="button" className={styles.editButton} onClick={handleDeleteAccount}>Delete Account</button>&nbsp;&nbsp;
            <button type="button" className={styles.editButton} onClick={resetToDefaults}>Reset to Defaults</button>
          </form>
        )}

{forgotPasswordMode ? (
  <div className={styles.forgotPasswordContainer}>
    <br /><h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Reset Your Password</h3>

    <label htmlFor="resetCode">Reset Code:</label><br />
    <input
      type="text"
      id="resetCode"
      value={resetCode}
      className={styles.forgotPasswordInput}
      onChange={(e) => setResetCode(e.target.value)}
    /><br /><br />
    <label htmlFor="newPassword">New Password:</label><br />
    <input
      type="password"
      id="newPassword"
      value={newPassword}
      className={styles.forgotPasswordInput}
      onChange={(e) => setNewPassword(e.target.value)}
    />
    <br />
    <button className={styles.editButton} onClick={handleConfirmResetPassword}>Confirm Reset</button> &nbsp;
    <button className={styles.editButton} onClick={() => setForgotPasswordMode(false)}>Cancel</button>
  </div>
) : (
  <div>
    <button
      className={styles.editButton}
      onClick={() => {
        setForgotPasswordMode(true); // Toggle forgotPasswordMode to true
        handleForgotPassword(); // Call handleForgotPassword
      }}
    >
      Forgot Password
    </button>
  </div>
)}

      </div>

      {showSaveConfirmation}
    </div>

      </div>
    </div>
  );
}
