'use client';
import styles from './login.module.css';
import React, { useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { useRouter } from 'next/navigation';
import { Authenticator, Heading, useTheme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { signUp, SignUpInput, fetchAuthSession } from 'aws-amplify/auth';
import awsExports from '../../aws-exports';

Amplify.configure(awsExports);

async function getAuthenticatedClients() {
    const { credentials } = await fetchAuthSession();
  
    const cognitoClient = new CognitoIdentityProviderClient({
      region: 'us-east-2',
      credentials: credentials
    });

    return { cognitoClient };
  }

interface AuthUser {
    username: string;
    attributes?: {
        email?: string;
        name?: string;
        [key: string]: string | undefined;
    };
    signInDetails?: {
        loginId?: string;
        authFlowType?: string;
    };
}

const addUserToDriversGroup = async (username: string) => {
    try {
        const { cognitoClient } = await getAuthenticatedClients();
        const command = new AdminAddUserToGroupCommand({
            UserPoolId: 'us-east-2_OgBXsNrwH',
            Username: username,
            GroupName: 'Drivers'
        });
        
        await cognitoClient.send(command);
        console.log(`User ${username} successfully added to Drivers group`);
        return true;
    } catch (error) {
        console.error('Error adding user to Drivers group:', error);
        return false;
    }
};

const components = {
    SignIn: {
        Header() {
            const { tokens } = useTheme();
            return (
                <Heading
                    padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
                    level={3}
                    color={`var(--foreground)`}
                >
                    Sign in to your account
                </Heading>
            );
        }
    },
    SignUp: {
        Header() {
            const { tokens } = useTheme();
            return (
                <Heading
                    padding={`${tokens.space.xl} 0 0 ${tokens.space.xl}`}
                    level={3}
                    color={`var(--foreground)`}
                >
                    Create a new account
                </Heading>
            );
        }
    }
};

function AuthHandler({ user }: { user: AuthUser | undefined }) {
    const router = useRouter();
    const [processed, setProcessed] = React.useState(false);

    useEffect(() => {
        const handleAuth = async () => {
            if (user && !processed) {
                const isNewSignup = sessionStorage.getItem('newSignup') === 'true';
                console.log('Processing auth state:', { isNewSignup });
                
                if (isNewSignup) {
                    console.log('Processing new signup...');
                    sessionStorage.removeItem('newSignup');
                    const success = await addUserToDriversGroup(user.username);
                    if (success) {
                        console.log('Added to drivers group, redirecting to verify-license');
                        router.push('/verify-license');
                    }
                } else {
                    console.log('Regular sign in, redirecting to dashboard');
                    router.push('/dashboard');
                }
                
                setProcessed(true);
            }
        };

        handleAuth();
    }, [user, processed, router]);

    return null;
}

export default function Login() {
    const services = {
        async handleSignUp(input: SignUpInput) {
            sessionStorage.setItem('newSignup', 'true');
            console.log('Sign up started');
            return await signUp(input);
        }
    };

    return (
        <Authenticator
            className={styles.authmenu}
            initialState="signIn"
            components={components}
            services={services}
            signUpAttributes={['email', 'name']}
        >
            {({ signOut, user }) => (
                <main>
                    <AuthHandler user={user as AuthUser | undefined} />
                    <h1>Hello {user?.username}</h1>
                    <button onClick={signOut}>Sign out</button>
                </main>
            )}
        </Authenticator>
    );
}