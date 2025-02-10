'use client';
import '@/app/globals.css';
import styles from '../edit.module.css';
import { useEffect, useState, Suspense } from 'react';
import { Amplify } from 'aws-amplify';
import awsExports from '../../../aws-exports';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';

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

function AdminEditProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');
  const email = searchParams.get('email');

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

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [cdlFile, setCdlFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!username && !email) {
        alert('No user specified');
        router.push('/adminList');
        return;
      }

      try {
        const params = {
          TableName: 'Team06-Drivers',
          IndexName: username ? 'username-index' : 'email-index',
          KeyConditionExpression: username ? 'username = :usernameValue' : 'email = :emailValue',
          ExpressionAttributeValues: {
            ...(username && { ':usernameValue': { S: username } }),
            ...(email && { ':emailValue': { S: email } }),
          },
        };
        const { dynamoDBClient } = await getAuthenticatedClients();
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
          router.push('/adminList');
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        alert('Unable to load user profile');
        router.push('/adminList');
      }
    };

    fetchData();
  }, [username, email, router]);

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
      const { dynamoDBClient } = await getAuthenticatedClients();
      await dynamoDBClient.send(new UpdateItemCommand(params));
      console.log("Profile updated successfully");
      setShowSaveConfirmation(true);
      setTimeout(() => {
        setShowSaveConfirmation(false);
        router.push('/adminList');
      }, 3000);
    } catch (err) {
      console.error("Unable to update profile. Error:", err);
      alert('Error saving profile information');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Edit User Profile</h1>
        <p>Update user profile, emergency contact, and vehicle information.</p>
      </header>
      <div className={styles.profileEdit}>
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
            <div className={styles.buttonContainer}>
              <button type="submit" className={styles.saveButton}>Save Changes</button>
              <button type="button" className={styles.cancelButton} onClick={() => router.push('/adminList')}>Cancel</button>
            </div>
          </form>
        </div>
        {showSaveConfirmation && <div className={styles.confirmation}>Profile updated successfully! Redirecting...</div>}
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function AdminEditProfile() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminEditProfileContent />
    </Suspense>
  );
}