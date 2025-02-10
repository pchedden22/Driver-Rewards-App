'use client';
import '@/app/globals.css';
import styles from './edit.module.css';
import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../aws-exports';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, QueryCommand, UpdateItemCommand, QueryCommandInput } from "@aws-sdk/client-dynamodb";
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

Amplify.configure(awsExports);

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();
  
  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials
  });

  const s3Client = new S3Client({
    region: 'us-east-2',
    credentials: credentials
  });

  return { dynamoDBClient, s3Client };
}

export default function EditProfile() {
  const [profileData, setProfileData] = useState({
    licenseID: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNum: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    vehiclePlate: '',
    vehicleType: '',
    profilePictureUrl: '',
    cdlImageUrl: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cdlFile, setCdlFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const attributes = await fetchUserAttributes();
        const { tokens } = await fetchAuthSession();
        if (!tokens) throw new Error("User Not Logged In");
    
        const { dynamoDBClient } = await getAuthenticatedClients();

        const username = tokens.accessToken.payload["username"];
        const email = attributes?.email ?? null;
        console.log(username);

        if (!username && !email) {
          throw new Error("Username or email not found in user attributes");
        }

        interface AttributeValue {
          S: string;
        }

        const params: QueryCommandInput = username ? {
          TableName: 'Team06-Drivers',
          IndexName: 'username-index',
          KeyConditionExpression: 'username = :usernameValue',
          ExpressionAttributeValues: {
            ':usernameValue': { S: username } as AttributeValue
          }
        } : {
          TableName: 'Team06-Drivers',
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :emailValue',
          ExpressionAttributeValues: {
            ':emailValue': { S: email! } as AttributeValue
          }
        };

        const data = await dynamoDBClient.send(new QueryCommand(params));
        if (data.Items && data.Items.length > 0) {
          const item = data.Items[0];
          setProfileData({
            licenseID: item.LicenseID?.S ?? '',
            firstName: item.firstName?.S ?? '',
            lastName: item.lastName?.S ?? '',
            email: item.email?.S ?? '',
            phoneNum: item.phoneNum?.S ?? '',
            address: item.address?.S ?? '',
            city: item.city?.S ?? '',
            state: item.state?.S ?? '',
            zipCode: item.zipCode?.S ?? '',
            emergencyName: item.emergencyName?.S ?? '',
            emergencyRelationship: item.emergencyRelationship?.S ?? '',
            emergencyPhone: item.emergencyPhone?.S ?? '',
            vehiclePlate: item.vehiclePlate?.S ?? '',
            vehicleType: item.vehicleType?.S ?? '',
            profilePictureUrl: item.profilePictureUrl?.S ?? '',
            cdlImageUrl: item.cdlImageUrl?.S ?? ''
          });
        } else {
          alert('No user found');
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        alert('Unable to load user profile');
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCdlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setCdlFile(selectedFile);
    }
  };

  const uploadFileToS3 = async (file: File, path: string) => {
    try {
      const { s3Client } = await getAuthenticatedClients();
      const command = new PutObjectCommand({
        Bucket: 'team06-profile-pictures',
        Key: path,
        Body: file,
        ContentType: file.type,
      });
      await s3Client.send(command);
      return `https://team06-profile-pictures.s3.amazonaws.com/${path}`;
    } catch (err) {
      console.error("Error uploading file:", err);
      alert('Error uploading file');
    }
    return '';
  };

  const handleSave = async () => {
    const { dynamoDBClient } = await getAuthenticatedClients();
    const profilePictureUrl = file ? await uploadFileToS3(file, `profilePictures/${profileData.licenseID}/${file.name}`) : profileData.profilePictureUrl;
    const cdlImageUrl = cdlFile ? await uploadFileToS3(cdlFile, `CDLImages/${profileData.licenseID}/${cdlFile.name}`) : profileData.cdlImageUrl;

    const params = {
      TableName: 'Team06-Drivers',
      Key: {
        "LicenseID": { S: profileData.licenseID },
      },
      UpdateExpression: "set firstName = :f, lastName = :l, email = :e, phoneNum = :p, address = :a, city = :c, #st = :s, zipCode = :z, emergencyName = :en, emergencyRelationship = :er, emergencyPhone = :ep, vehiclePlate = :vp, vehicleType = :vt, profilePictureUrl = :pp, cdlImageUrl = :cdl",
      ExpressionAttributeNames: {
        "#st": "state",
      },
      ExpressionAttributeValues: {
        ":f": { S: profileData.firstName },
        ":l": { S: profileData.lastName },
        ":e": { S: profileData.email },
        ":p": { S: profileData.phoneNum },
        ":a": { S: profileData.address },
        ":c": { S: profileData.city },
        ":s": { S: profileData.state },
        ":z": { S: profileData.zipCode },
        ":en": { S: profileData.emergencyName },
        ":er": { S: profileData.emergencyRelationship },
        ":ep": { S: profileData.emergencyPhone },
        ":vp": { S: profileData.vehiclePlate },
        ":vt": { S: profileData.vehicleType },
        ":pp": { S: profilePictureUrl },
        ":cdl": { S: cdlImageUrl }
      },
    };

    try {
      await dynamoDBClient.send(new UpdateItemCommand(params));
      console.log("Profile updated successfully");
      setIsEditing(false);
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000);
    } catch (err) {
      console.error("Unable to update profile. Error:", err);
      alert('Error saving profile information');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Edit Profile</h1>
        <p>Update your profile, emergency contact, and vehicle information here.</p>
      </header>
      <div className={styles.profileEdit}>
        {!isEditing ? (
          <div id="profileDisplay">
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Personal Information</h3>
            <div className={styles.profileInfo}>
              <p>First Name: {profileData.firstName}</p>
              <p>Last Name: {profileData.lastName}</p>
              <p>Email: {profileData.email}</p>
              <p>Phone Number: {profileData.phoneNum}</p>
              <p>Address: {profileData.address}</p>
              <p>City: {profileData.city}</p>
              <p>State: {profileData.state}</p>
              <p>Zip Code: {profileData.zipCode}</p>
              <p>Driver&apos;s License Number: {profileData.licenseID}</p>
              {profileData.profilePictureUrl && (
                <img src={profileData.profilePictureUrl} alt="Profile" className={styles.profilePicture} />
              )}
              {profileData.cdlImageUrl && (
                <img src={profileData.cdlImageUrl} alt="CDL" className={styles.cdlImage} />
              )}
            </div>
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Emergency Contact Information</h3>
            <div className={styles.emergencyInfo}>
              <p>Emergency Contact Name: {profileData.emergencyName}</p>
              <p>Relationship: {profileData.emergencyRelationship}</p>
              <p>Emergency Contact Phone: {profileData.emergencyPhone}</p>
            </div>
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Vehicle Information</h3>
            <div className={styles.vehicleInfo}>
              <p>Vehicle Type: {profileData.vehicleType}</p>
              <p>Vehicle Plate: {profileData.vehiclePlate}</p>
            </div>
            <button className={styles.editButton} onClick={() => setIsEditing(true)}>Edit Profile</button>
          </div>
        ) : (
          <div id="profileEditForm" className={styles.profileEditForm}>
            <h3 className={`${styles.sectionHeader} ${styles.boldHeader}`}>Edit Personal Information</h3>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <label>
                First Name:
                <input type="text" name="firstName" value={profileData.firstName} onChange={handleChange} required />
              </label>
              <label>
                Last Name:
                <input type="text" name="lastName" value={profileData.lastName} onChange={handleChange} required />
              </label>
              <label>
                Email:
                <input type="email" name="email" value={profileData.email} onChange={handleChange} required />
              </label>
              <label>
                Phone Number:
                <input type="tel" name="phoneNum" value={profileData.phoneNum} onChange={handleChange} required />
              </label>
              <label>
                Address:
                <input type="text" name="address" value={profileData.address} onChange={handleChange} required />
              </label>
              <label>
                City:
                <input type="text" name="city" value={profileData.city} onChange={handleChange} required />
              </label>
              <label>
                State:
                <input type="text" name="state" value={profileData.state} onChange={handleChange} required />
              </label>
              <label>
                Zip Code:
                <input type="text" name="zipCode" value={profileData.zipCode} onChange={handleChange} required />
              </label>
              <label>
                Emergency Contact Name:
                <input type="text" name="emergencyName" value={profileData.emergencyName} onChange={handleChange} />
              </label>
              <label>
                Relationship:
                <input type="text" name="emergencyRelationship" value={profileData.emergencyRelationship} onChange={handleChange} />
              </label>
              <label>
                Emergency Contact Phone:
                <input type="tel" name="emergencyPhone" value={profileData.emergencyPhone} onChange={handleChange} />
              </label>
              <label>
                Vehicle Plate:
                <input type="text" name="vehiclePlate" value={profileData.vehiclePlate} onChange={handleChange} />
              </label>
              <label>
                Vehicle Type:
                <input type="text" name="vehicleType" value={profileData.vehicleType} onChange={handleChange} />
              </label>
              <label>
                Profile Picture:
                <input type="file" accept="image/*" onChange={handleProfilePictureUpload} />
              </label>
              <label>
                CDL Image:
                <input type="file" accept="image/*" onChange={handleCdlUpload} />
              </label>
              <button type="submit" className={styles.saveButton}>Save Changes</button>
              <button type="button" className={styles.cancelButton} onClick={() => setIsEditing(false)}>Cancel</button>
            </form>
          </div>
        )}
        {showSaveConfirmation && <div className={styles.confirmation}>Profile updated successfully!</div>}
      </div>
    </div>
  );
}
