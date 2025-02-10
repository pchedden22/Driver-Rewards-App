'use client';

//import { Navbar } from '@/components';
import '../styles/styles.css';
import styles from './rewards.module.css';

import React, { useEffect, useState } from 'react';
import { DynamoDBClient, UpdateItemCommand, QueryCommand, ReturnValue, ScanCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { fetchAuthSession } from 'aws-amplify/auth';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type iTunesItem = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  collectionViewUrl: string;
  collectionType?: string;
  kind: string;
  wrapperType?: string;
  collectionPrice?: number;
  trackPrice?: number;
  priceInPoints?: number;
  currency?: string;
  explicitness?: string;
  collectionExplicitness?: string;  // Add as optional
  trackExplicitness?: string;       // Add as optional
};

async function getAuthenticatedClients() {
  const { credentials } = await fetchAuthSession();
  
  const dynamoDBClient = new DynamoDBClient({
    region: 'us-east-2',
    credentials: credentials
  });

  const sesClient = new SESClient({
    region: 'us-east-2',
    credentials: credentials
  });

  return { dynamoDBClient, sesClient };
}


type Charity = {
  id: string;
  name: string;
  description: string;
};


export default function Rewards() {
  const [items, setItems] = useState<iTunesItem[]>([]);
  const [cart, setCart] = useState<iTunesItem[]>([]); // New state for shopping cart
  const [query, setQuery] = useState('AC/DC');
  const [mediaType, setMediaType] = useState('all');
  const [userPoints, setUserPoints] = useState(0);
  //const [priceInPoints, setPriceInPoints] = useState(0);
  const [sponsorPointsPerUnit, setSponsorPointsPerUnit] = useState<number>(1);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorID, setSponsorID] = useState('');
  const [email, setUserEmail] = useState('');
  const [licenseID, setLicenseID] = useState<string | null>(null);
  //const [cartItems, setCartItems] = useState<iTunesItem[]>([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [donationAmounts, setDonationAmounts] = useState<{ [key: string]: number }>({});
  const toggleCart = () => {
    setIsCartVisible((prev) => !prev);
  };
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selectedCharities, setSelectedCharities] = useState<string[]>([]);
  const [driverCharities, setDriverCharities] = useState<Charity[]>([]);
  const [userRole, setUserRole] = useState('');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  //const [maxPriceInPoints, setMaxPriceInPoints] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  //const effectiveMaxPriceInPoints = maxPriceInPoints ?? Number.MAX_SAFE_INTEGER;
  const [allowExplicitContent, setAllowExplicitContent] = useState<boolean>(true);
  const categoryMapping: Record<string, string[]> = {
    Music: ["musicTrack", "album", "musicVideo", "collection", "track", "song"],
    Movies: ["feature-movie", "movie", "video"],
    TVShows: ["tv-episode", "tvSeason"],
    Podcasts: ["podcast", "podcast-episode"],
    Audiobooks: ["audiobook", "book"],
  };
  


  
  const showAddToCartPopup = () => {
    setShowPopup(true);
    setTimeout(() => {
        setShowPopup(false);
    }, 2000); // Popup will disappear after 2 seconds
};


  // Update the donation amount for a specific charity
const handleDonationAmountChange = (charityId: string, amount: number) => {
  setDonationAmounts((prev) => ({ ...prev, [charityId]: amount }));
};

// Fetch items on change.
useEffect(() => {
  fetchItems();
}, [query, mediaType, allowedCategories, sponsorPointsPerUnit, allowExplicitContent]);


// Add the custom donation to the cart
const addDonationToCart = (charity: Charity) => {
  const donationAmount = donationAmounts[charity.id] || 0;

  if (donationAmount <= 0 || donationAmount > userPoints) {
    alert("Enter a valid donation amount within your point balance.");
    return;
  }

  

  // Create a cart item representing the donation
  const donationItem = {
    trackId: Number(charity.id), // Use charity ID as a unique identifier
    trackName: `Donation to ${charity.name}`,
    artistName: "", // Optional field, left empty for donations
    collectionName: charity.name,
    artworkUrl100: "", // Optional, can be left empty
    collectionViewUrl: "",
    kind: "donation",
    trackPrice: donationAmount, // Use points as the "price" for simplicity
    currency: "points",
  };

  // Update points and add donation to cart
  handleAddToCart(donationItem);


  // Clear donation amount input after adding to the cart
  setDonationAmounts((prev) => ({ ...prev, [charity.id]: 0 }));
};


  // Main fetchItems function to get items from the iTunes API or charities
  const fetchItems = async () => {
    if (mediaType === "charities") return; // Skip if searching for charities

    console.log("Explicit content allowed:", allowExplicitContent);

  
    let entity;
    if (mediaType === "music") {
      entity = "musicTrack,album"; // Include both tracks and albums for music
    } else if (mediaType === "movie") {
      entity = "movie";
    } else {
      entity = "album,movie,musicTrack"; // Default to all possible media types if "all" is selected
    }
  
    const url = `https://itunes.apple.com/search?term=${query}&entity=${entity}`;
  
    try {
        const response = await fetch(url);
        const data = await response.json();
    
        // Log the full response to understand the data structure and troubleshoot
        console.log("API Response:", data);
    
        const filteredItems = data.results.filter((item: iTunesItem) => {
          const itemPriceInPoints = Math.ceil((item.collectionPrice || item.trackPrice || 0) * sponsorPointsPerUnit);
          const itemCategoryTypes = [item.kind, item.collectionType, item.wrapperType];
    
          // Check if any of the allowed categories in `allowedCategories` matches the item's type
          const categoryMatch = allowedCategories.some(category => {
            const allowedTypes = categoryMapping[category] || [];
            return itemCategoryTypes.some(type => allowedTypes.includes(type || ''));
          });

          // Check explicit content across multiple fields
          const explicitMatch = allowExplicitContent || (
            item.explicitness !== "explicit" && 
            item.collectionExplicitness !== "explicit" && 
            item.trackExplicitness !== "explicit"
          );

          // Filter out items with price <= 0
          const priceMatch = itemPriceInPoints > 0;
    
          const matches = categoryMatch && explicitMatch && priceMatch;
          if (!matches) {
            console.log("Filtered Out Item:", item, {
              categoryMatch,
              explicitMatch,
              priceMatch,
            });
          }
          return matches;
      });
  
      console.log("Filtered items:", filteredItems);
  
      setItems(filteredItems);
    } catch (error) {
      console.error('Error fetching iTunes items:', error);
    }
  };
  

  // Fetch user points and sponsor's point conversion from DynamoDB
  const fetchUserDataAndSponsorPoints = async () => {
    const { dynamoDBClient } = await getAuthenticatedClients();
    try {
      // Fetch the user's email from the session
      const session = await fetchAuthSession();

      // Log token payload to identify the email claim
    const tokenPayload = session?.tokens?.accessToken?.payload;
    console.log("Token Payload:", tokenPayload); // This will display the available claims in the console

    try {
      const session = await fetchAuthSession();
      const tokenPayload = session?.tokens?.accessToken?.payload;
      //const username = tokenPayload?.username as string;
      const groups = tokenPayload?.['cognito:groups'] || []; // Check user groups

      if (groups.toString().includes('Drivers')) {
        setUserRole('Driver');
      }
  
      // Check if user is a Sponsor
      if (groups.toString().includes('Sponsors')) {
        setUserRole('Sponsor');
  
        // Fetch charities if the user is a sponsor
        const charityParams = {
          TableName: 'Team06-Charities',
        };
  
        const charityResponse = await dynamoDBClient.send(new ScanCommand(charityParams));
        if (charityResponse.Items) {
          setCharities(
            charityResponse.Items.map(item => ({
              id: item.CharityID?.S || '',
              name: item.CharityName?.S || '',
              description: item.Description?.S || '',
            })) as Charity[]
          );
        }
        
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }


      const username = tokenPayload?.username as string;
  

        if (username) {
          const userParams = {
            TableName: 'Team06-Drivers',
            IndexName: 'username-index', // Replace with the actual index name if different
            KeyConditionExpression: 'username = :username',
            ExpressionAttributeValues: {
              ':username': { S: username } // Ensure this is a strict string
            },
            ReturnValues: "NONE" as const // Enforces correct typing for ReturnValues
          };
        
        const userResponse = await dynamoDBClient.send(new QueryCommand(userParams));
        if (userResponse.Items && userResponse.Items.length > 0) {
          const user = userResponse.Items[0];
  
          // Set user points
          const points = Number(user.points?.N || 0);
          setSponsorName(user.sponsorCompany?.S || '');
          setUserPoints(points);
          setLicenseID(user.LicenseID?.S || '');
          // Retrieve and set the email from DynamoDB
          setUserEmail(user.email?.S || '');
  
          // Retrieve and set sponsor information
          const sponsorCompany = user.sponsorCompany?.S;

          if (sponsorCompany && user.sponsorMap?.M?.[sponsorCompany]?.M?.points) {
            const sponsorPoints = Number(user.sponsorMap.M[sponsorCompany].M.points.N || 0);
            setUserPoints(sponsorPoints); // Set points based on the selected sponsor
          } else {
            setUserPoints(0); // Fallback if no points found for the sponsor
          }
          
          if (sponsorCompany) {
            const sponsorParams = {
              TableName: 'Team06-Sponsors',
              IndexName: 'sponsorNameIndex',
              KeyConditionExpression: 'SponsorName = :sponsorName',
              ExpressionAttributeValues: { ':sponsorName': { S: sponsorCompany } },
            };
  
            const sponsorResponse = await dynamoDBClient.send(new QueryCommand(sponsorParams));
            if (sponsorResponse.Items && sponsorResponse.Items.length > 0) {
              const sponsor = sponsorResponse.Items[0];
              setSponsorPointsPerUnit(Number(sponsor.PointsPerUnit?.N || 1));
              setSponsorID(sponsor.SponsorID?.S || '')
            }
          }
        } else {
          console.warn('User data not found in DynamoDB for the provided email.');
        }
      } else {
        console.warn('User email not found in session tokens.');
      }
    } catch (error) {
      console.error('Error fetching data from DynamoDB:', error);
    }
  };


  
  // Fetch sponsor preferences and user data on change.
  useEffect(() => {
    fetchSponsorPreferencesAndUserData();
  }, []);

// Fetch sponsor preferences and user data
const fetchSponsorPreferencesAndUserData = async () => {
  const { dynamoDBClient } = await getAuthenticatedClients();

  try {
    const session = await fetchAuthSession();
    const username = session?.tokens?.accessToken?.payload?.username as string;
    if (!username) return;

    // Fetch user data to get sponsor name and points from sponsorMap
    const userParams = {
      TableName: 'Team06-Drivers',
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': { S: username } },
    };
    const userResponse = await dynamoDBClient.send(new QueryCommand(userParams));
    if (userResponse.Items && userResponse.Items.length > 0) {
      const user = userResponse.Items[0];
      const sponsorCompany = user.sponsorCompany?.S || '';
      setSponsorName(sponsorCompany);

      // Retrieve points from sponsorMap based on sponsorCompany
      const sponsorMap = user.sponsorMap?.M || {};
      if (sponsorCompany && sponsorMap[sponsorCompany]?.M?.points) {
        setUserPoints(Number(sponsorMap[sponsorCompany].M.points.N) || 0);
      } else {
        setUserPoints(0); // Fallback if no points found
      }

      // Fetch sponsorID from the sponsor table using sponsorCompany
      const sponsorParams = {
        TableName: 'Team06-Sponsors',
        IndexName: 'sponsorNameIndex',
        KeyConditionExpression: 'SponsorName = :sponsorName',
        ExpressionAttributeValues: { ':sponsorName': { S: sponsorCompany } },
        ProjectionExpression: "SponsorID, preferences, PointsPerUnit",
      };
      const sponsorResponse = await dynamoDBClient.send(new QueryCommand(sponsorParams));
      console.log("Test: Sponsor Company: " + sponsorCompany)
      if (sponsorResponse.Items && sponsorResponse.Items.length > 0) {
        const sponsor = sponsorResponse.Items[0];
        const fetchedSponsorID = sponsor.SponsorID?.S || '';
        setSponsorID(fetchedSponsorID);

        // Set PointsPerUnit and preferences if available
        setSponsorPointsPerUnit(Number(sponsor.PointsPerUnit?.N || 1));
        const preferences = sponsor.preferences?.M;
        if (preferences) {
          setAllowedCategories(preferences.allowedCategories?.SS || []);
        }
        if (preferences) {
          setAllowExplicitContent(preferences.allowExplicitContent?.BOOL || false);
        } else {
          setAllowExplicitContent(false);  // default to disallow explicit content if preferences are missing
        }
      } else {
        console.warn('Sponsor data not found for the specified sponsor name.');
      }
      
    }
  } catch (error) {
    console.error("Error loading sponsor preferences and user data:", error);
  }
};


  //Fetches items and user data on change.
  useEffect(() => {
    fetchItems();
    fetchUserDataAndSponsorPoints();
  }, [query, mediaType, allowedCategories, sponsorPointsPerUnit]);

  //Fetches selected charities on change.
  useEffect(() => {
    if (sponsorID && userRole === 'Driver') {
      fetchSelectedCharities(sponsorID);
    }
  }, [sponsorID, userRole]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[name="search"]');
    const searchTerm = input?.value.trim() || "AC/DC";
  
    setQuery(searchTerm);
    if (input) {
      setQuery(input.value);
    }
  };

  const handleMediaTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMediaType(e.target.value);
  };

  /*
  const handleRedeem = async (item: iTunesItem) => {
    const itemPrice = item.collectionPrice || item.trackPrice || 0;
    const itemPriceInPoints = Math.ceil(itemPrice * sponsorPointsPerUnit);

    if (userPoints >= itemPriceInPoints) {
      setUserPoints(userPoints - itemPriceInPoints);

      const redeemedItem = {
        itemId: item.trackId ? item.trackId.toString() : 'Unknown ID',
        itemName: item.collectionName || item.trackName,
        price: itemPrice,
        redeemedDate: new Date().toISOString(),
      };

      const { dynamoDBClient } = await getAuthenticatedClients();

      const updateParams = {
        TableName: 'Team06-Drivers',
        Key: { LicenseID: { S: licenseID! } },
        UpdateExpression: 'SET points = :newPoints, #items = list_append(if_not_exists(#items, :empty_list), :newItem)',
        ExpressionAttributeValues: {
          ':newPoints': { N: (userPoints - itemPriceInPoints).toString() },
          ':newItem': { L: [{ M: {
            itemId: { S: redeemedItem.itemId },
            itemName: { S: redeemedItem.itemName },
            price: { N: redeemedItem.price.toString() },
            redeemedDate: { S: redeemedItem.redeemedDate },
          }}] },
          ':empty_list': { L: [] },
        },
        ExpressionAttributeNames: {
          '#items': 'items',
        },
        ReturnValues: ReturnValue.UPDATED_NEW,
      };

      try {
        const response = await dynamoDBClient.send(new UpdateItemCommand(updateParams));
        alert(`You have successfully redeemed ${redeemedItem.itemName}`);
        console.log('Updated item:', response.Attributes);
      } catch (error) {
        console.error('Error updating user data in DynamoDB:', error);
        alert('Failed to update your items.');
      }
    } else {
      alert('You do not have enough points to redeem this item.');
    }
  };
  */

  // Add item to the shopping cart
  const handleAddToCart = (item: iTunesItem) => {
    //setCart((prevCart) => [...prevCart, item]);
    const itemPriceInPoints = Math.ceil((item.collectionPrice || item.trackPrice || 0) * sponsorPointsPerUnit);
    const cartItem = { ...item, priceInPoints: itemPriceInPoints };

    setCart((prevCart) => [...prevCart, cartItem]);
    setCartTotal(cartTotal + itemPriceInPoints);
    console.log("Cart items:", cart);
    showAddToCartPopup();
  };
  

  // Remove item from the shopping cart
const handleRemoveFromCart = (index: number) => {
  setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  //setCartItems((prevCartItems) => prevCartItems.filter((_, i) => i !== index));

  const removedItem = cart[index];
  if (removedItem) {
    const itemPriceInPoints = Math.ceil((removedItem.collectionPrice || removedItem.trackPrice || 0) * sponsorPointsPerUnit);
    setCartTotal((prevTotal) => prevTotal - itemPriceInPoints);
  }
};

  

  // Calculate total points required for items in the cart
  const calculateTotalPoints = () => {
    return cart.reduce((total, item) => {
      const itemPrice = item.collectionPrice || item.trackPrice || 0;
      return total + Math.ceil(itemPrice * sponsorPointsPerUnit);
    }, 0);
  };

  const handleCheckout = async () => {
    console.log("Cart items:", cart);
  
    const totalPoints = calculateTotalPoints();
  
    if (userPoints >= totalPoints) {
      const { dynamoDBClient } = await getAuthenticatedClients();
  
      // Calculate remaining points after checkout
      const remainingPoints = userPoints - totalPoints;
  
      if (remainingPoints < 0) {
        console.log("ERROR: NOT ENOUGH POINTS!");
        return;
      }
  
      // Update points within sponsorMap for the specific sponsor
      const updateParams = {
        TableName: 'Team06-Drivers',
        Key: { LicenseID: { S: licenseID! } },
        UpdateExpression: 'SET sponsorMap.#sponsorID.points = :newPoints, #items = list_append(if_not_exists(#items, :empty_list), :newItems)',
        ExpressionAttributeNames: {
          '#sponsorID': sponsorName, // Use the sponsorName as a dynamic path for sponsor-specific updates
          '#items': 'items',
        },
        ExpressionAttributeValues: {
          ':newPoints': { N: remainingPoints.toString() },
          ':newItems': {
            L: cart.map((item) => ({
              M: {
                itemId: { S: item.trackId ? item.trackId.toString() : 'Unknown ID' },
                itemName: { S: item.collectionName || item.trackName },
                price: { N: (item.collectionPrice || item.trackPrice || 0).toString() },
                redeemedDate: { S: new Date().toISOString() },
                sponsorCompany: { S: sponsorName },
              },
            })),
          },
          ':empty_list': { L: [] },
        },
        ReturnValues: ReturnValue.UPDATED_NEW,
      };
  
      try {
        console.log("Update Params:", JSON.stringify(updateParams, null, 2));
  
        const response = await dynamoDBClient.send(new UpdateItemCommand(updateParams));
        setUserPoints(remainingPoints); // Update local state with the new points
        setCart([]); // Clear cart after successful checkout
        setCartTotal(0); // Reset cart total to zero
        alert('Successfully redeemed items in your cart!');
  
        // Create a single transaction log for the entire purchase
        const transactionParams = {
          TableName: 'Team06-PTransactions',
          Item: {
            LicenseID: { S: licenseID! },
            TransactionID: { S: `${Date.now()}` }, // Unique transaction ID based on timestamp
            amount: { N: totalPoints.toString() }, // Total points used for the purchase
            description: { S: `Purchase of ${cart.length} items` },
            sponsorCompany: { S: sponsorName },
            timestamp: { N: `${Date.now()}` },
            transactionType: { S: 'deducted' },
            username: { S: email || 'Unknown User' },
          },
        };
  
        await dynamoDBClient.send(new PutItemCommand(transactionParams));
  
        if (email) {
          await sendConfirmationEmail(email, cart, totalPoints);
        } else {
          console.error("User email is not available.");
        }
  
        console.log('Updated item:', response.Attributes);
      } catch (error) {
        console.error('Error updating user data in DynamoDB:', error);
        alert('Failed to update your items.');
      }
    } else {
      alert('You do not have enough points to redeem these items.');
    }
  };
  
  


const sendConfirmationEmail = async (userEmail: string, items: iTunesItem[], totalPoints: number) => {
  const { sesClient } = await getAuthenticatedClients();

  const itemList = items.map((item) => `${item.trackName || item.collectionName} - ${Math.ceil((item.collectionPrice || item.trackPrice || 0) * sponsorPointsPerUnit)} points`).join("\n");

  const emailParams = {
    Source: "updateddriversrewards@gmail.com", // Verified email address in SES
    Destination: {
      ToAddresses: [userEmail],
    },
    Message: {
      Subject: {
        Data: "Purchase Confirmation",
      },
      Body: {
        Text: {
          Data: `Thank you for your purchase! Here are the details:\n\nItems:\n${itemList}\n\nTotal Points Used: ${totalPoints}\n\nEnjoy your rewards!`,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(emailParams));
    console.log("Confirmation email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const toggleCharitySelection = (charityId: string) => {
  setSelectedCharities(prevSelected =>
    prevSelected.includes(charityId)
      ? prevSelected.filter(id => id !== charityId)
      : [...prevSelected, charityId]
  );
};

const saveSelectedCharities = async () => {
  try {
    const { dynamoDBClient } = await getAuthenticatedClients();

    const updateParams = {
      TableName: 'Team06-Sponsors',
      Key: {
        SponsorID: { S: sponsorID },  // Partition Key
        SponsorName: { S: sponsorName }        // Sort Key
      },
      UpdateExpression: 'SET SelectedCharities = :selectedCharities',
      ExpressionAttributeValues: {
        ':selectedCharities': { SS: selectedCharities }, // SS for String Set
      },
    };
    await dynamoDBClient.send(new UpdateItemCommand(updateParams));

    alert("Selected charities have been saved.");
  } catch (error) {
    console.error("Error saving selected charities:", error);
  }
};

/*
const handleDonateToCharity = async (charityID : string) => {
  if (!licenseID) {
    alert("License ID is missing. Cannot process donation.");
    return;
  }

  if (userPoints <= 0) {
    alert("You don't have enough points to donate.");
    return;
  }

  const { dynamoDBClient } = await getAuthenticatedClients();

  try {
    // Define how many points are to be donated (adjust this as necessary)
    const donationPoints = 10; // Example: donate 10 points

    if (userPoints < donationPoints) {
      alert("You don't have enough points to donate this amount.");
      return;
    }

    // Update the user's points in the 'Team06-Drivers' table
    const updateParams = {
      TableName: 'Team06-Drivers',
      Key: { LicenseID: { S: licenseID! } }, // Ensure LicenseID is not null
      UpdateExpression: `
        SET points = points - :donationPoints,
            donationHistory = list_append(if_not_exists(donationHistory, :emptyList), :newDonation)
      `,
      ExpressionAttributeValues: {
        ':donationPoints': { N: donationPoints.toString() },
        ':emptyList': { L: [] },
        ':newDonation': { 
          L: [{
            M: {
              charityID: { S: charityID },
              pointsDonated: { N: donationPoints.toString() },
              date: { S: new Date().toISOString() }
            }
          }]
        }
      },
      ReturnValues: ReturnValue.UPDATED_NEW,
    };

    const response = await dynamoDBClient.send(new UpdateItemCommand(updateParams));
    console.log('Updated points and donation history:', response.Attributes);
    setUserPoints((prevPoints) => prevPoints - donationPoints);

    alert(`You have successfully donated ${donationPoints} points to the charity.`);
  } catch (error) {
    console.error('Error processing donation:', error);
    alert('Failed to donate points. Please try again later.');
  }
};
*/


const fetchSelectedCharities = async (sponsorID : string) => {
  try{
  const { dynamoDBClient } = await getAuthenticatedClients();

  const sponsorParams = {
    TableName: 'Team06-Sponsors',
    Key: {
        SponsorID: { S: sponsorID },  // Partition Key
        SponsorName: { S: sponsorName }        // Sort Key
      },
    ProjectionExpression: 'SelectedCharities',
  };

    const sponsorResponse = await dynamoDBClient.send(new GetItemCommand(sponsorParams));
    const selectedCharityIDs = sponsorResponse.Item?.SelectedCharities?.SS || [];

    // Query Team06-Charities for the details of each selected charity
    const charityPromises = selectedCharityIDs.map(async (charityID) => {
      const charityParams = {
        TableName: 'Team06-Charities',
        Key: { CharityID: { S: charityID } }
      };
      const charityResponse = await dynamoDBClient.send(new GetItemCommand(charityParams));
      return {
        id: charityID,
        name: charityResponse.Item?.CharityName?.S || '',
        description: charityResponse.Item?.Description?.S || ''
      };
    });

    const charityDetails = await Promise.all(charityPromises);
    setDriverCharities(charityDetails);
  }
   catch (error) {
    console.error('Error fetching selected charities:', error);
  }
};

// Function to save sponsor preferences to DynamoDB
const updateSponsorPreferences = async () => {
  const { dynamoDBClient } = await getAuthenticatedClients();

  type DynamoDBPreferencesMap = {
    allowedCategories: { SS: string[] };
    allowExplicitContent: { BOOL: boolean };
  };
  
  

// Construct the preferences map with a strict type
const preferencesMap: DynamoDBPreferencesMap = {
  allowedCategories: { SS: allowedCategories },
  allowExplicitContent: { BOOL: allowExplicitContent },
};




  const updateParams = {
    TableName: 'Team06-Sponsors',
    Key: { SponsorID: { S: sponsorID }, SponsorName: { S: sponsorName } },
    UpdateExpression: "SET preferences = :preferences",
    ExpressionAttributeValues: {
      ":preferences": { M: preferencesMap },
    },
  };

  try {
    await dynamoDBClient.send(new UpdateItemCommand(updateParams));
    toast.success("Preferences updated successfully!");
  } catch (error) {
    console.error("Error updating sponsor preferences:", error);
  }
};

// Function to handle category selection
const handleCategoryChange = (category: string) => {
  setAllowedCategories((prevCategories) =>
    prevCategories.includes(category)
      ? prevCategories.filter((c) => c !== category)
      : [...prevCategories, category]
  );
};

  

return (
  <div>
    <header>
      <h1>iTunes Rewards Store</h1>
      <p>Your Points: {userPoints}</p>
      <p>Sponsor: {sponsorName}</p>
    </header>

    {showPopup && (
    <div className={styles.popup}>
        <p>Added to cart!</p>
    </div>
    )}


    {/* Search and Dropdown Filter */}
    <div className={styles.contentContainer}>
      <form onSubmit={handleSearch} className={styles.searchBar}>
        <input type="text" name="search" placeholder="Search iTunes..." className={styles.searchInput} />
        <button type="submit" className={styles.searchButton}>Search</button>
        <select value={mediaType} onChange={handleMediaTypeChange} className={styles.mediaSelect}>
          <option value="all">All</option>
          <option value="music">Music</option>
          <option value="movie">Movies</option>
          <option value="charities">Charities</option>
        </select>
      </form>

      {/* View Cart Button */}
      <button onClick={toggleCart} className={styles.viewCartButton}>View Cart ({cart.length})</button>

      {/* Sponsor View */}
      {userRole === 'Sponsor' && (
        <div>
              <ToastContainer />
          <div className={styles.sponsorSettings}>
            <h2 className={styles.header3}>Filter Options for Drivers</h2>

            {/* Allowed Categories */}
            <div className={styles.settingSection}>
              <h3 className={styles.header2}>Allowed Categories</h3>
              <div className={styles.checkboxGroup}>
                {["Music", "Movies", "TV Shows", "Podcasts", "Audiobooks"].map((category) => (
                  <label key={category} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      id='catCheckbox'
                      checked={allowedCategories.includes(category)}
                      onChange={() => handleCategoryChange(category)}
                      className={styles.checkboxInput}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            {/* Explicit Content Setting */}
            <div className={styles.settingSection}>
              <h3 className={styles.header2}>Explicit Content</h3>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  id='explicitCheck'
                  checked={allowExplicitContent}
                  onChange={() => setAllowExplicitContent(!allowExplicitContent)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleText}>{allowExplicitContent ? "Allowed" : "Not Allowed"}</span>
              </label>
            </div>

            <button id='savePrefs' onClick={updateSponsorPreferences} className={styles.saveButton}>
              Save Preferences
            </button>
          </div>

          {/* Charity Selection for Drivers */}
          <div className={styles.sponsorSettings}>
            <h2 className={styles.header2}>Select Charities for Drivers</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveSelectedCharities(); }}>
              {charities.map(charity => (
                <div key={charity.id}>
                  <label className={styles.header2}>
                    <input
                      type="checkbox"
                      checked={selectedCharities.includes(charity.id)}
                      onChange={() => toggleCharitySelection(charity.id)}
                    />
                    {charity.name} - {charity.description}
                  </label>
                </div>
              ))}
              <button type="submit">Save Selected Charities</button>
            </form>

          </div>
            
        </div>
      )}

      {/* Items and Charities Display */}
      <div className={styles.itemGrid}>
        {mediaType !== "charities" ? (
          items && items.length > 0 ? (
            items.map((item) => {
              const itemPrice = item.collectionPrice || item.trackPrice || 0;
              const itemPriceInPoints = Math.ceil(itemPrice * sponsorPointsPerUnit);

              return (
                <a
                  key={item.trackId}
                  href={item.collectionViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.itemLink}
                >
                  <div key={item.trackId} className={styles.item}>
                    <img src={item.artworkUrl100} alt={item.collectionName || item.trackName} />
                    <h3 className={styles.charityHeader}>{item.collectionName || item.trackName}</h3>
                    <p>Artist: {item.artistName}</p>
                    <p>Price: {item.collectionPrice || item.trackPrice} {item.currency}</p>
                    <button onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                    >
                      Add to Cart for {itemPriceInPoints} Points
                    </button>
                  </div>
                </a>
              );
            })
          ) : (
            <p>No items available.</p>
          )
        ) : (
          /* Charities Display for both Drivers and Sponsors */
          driverCharities.map((charity) => (
            <div key={charity.id} className={styles.item}>
              <h3 className={styles.charityHeader}>{charity.name}</h3>
              <p>{charity.description}</p>
              <input
                type="number"
                placeholder="Donation amount in points"
                value={donationAmounts[charity.id] || ""}
                onChange={(e) => handleDonationAmountChange(charity.id, Number(e.target.value))}
                className={styles.donationInput}
              />
              <button onClick={() => addDonationToCart(charity)} className={styles.donateButton}>
                Add Donation to Cart
              </button>
            </div>
          ))
        )}
      </div>

      {/* Popup */}
      {showPopup && (
            <div className={styles.popup}>
                <p>Added to cart!</p>
            </div>
        )}

      {/* Cart Modal */}
      {isCartVisible && (
        <div className={styles.cartModal}>
          <div className={styles.cartContent}>
            <button onClick={toggleCart} className={styles.closeButton}>X</button>
            <h2 className={styles.cartTitle}>Your Cart</h2>
            <div className={styles.cartItems}>
              {cart.length > 0 ? (
                cart.map((item, index) => (
                  <div key={index} className={styles.cartItem}>
                    <span>{item.trackName || item.collectionName}</span>
                    <span>{item.priceInPoints || '0'} Points</span>
                    <button onClick={() => handleRemoveFromCart(index)}>Remove</button>
                  </div>
                ))
              ) : (
                <p>Your cart is empty</p>
              )}
            </div>
            <p>Total Points: {cartTotal}</p>
            <button onClick={handleCheckout} className={styles.checkoutButton} disabled={cart.length === 0}>
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
};