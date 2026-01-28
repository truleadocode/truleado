/**
 * Test script to get a Firebase ID token and test the GraphQL API
 * 
 * Run with: npx ts-node scripts/test-auth.ts <email> <password>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Load environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Debug: show config (without full API key)
console.log('Config loaded:', {
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 10) + '...' : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
});

async function main() {
  // Get credentials from command line or use defaults
  const email = process.argv[2] || 'admin@test.com';
  const password = process.argv[3];
  
  if (!password) {
    console.error('Usage: npx ts-node scripts/test-auth.ts <email> <password>');
    console.error('Example: npx ts-node scripts/test-auth.ts admin@test.com mypassword123');
    process.exit(1);
  }

  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  try {
    console.log(`Signing in as ${email}...`);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    console.log('\n✅ Authentication successful!\n');
    console.log('Firebase UID:', userCredential.user.uid);
    console.log('\n--- ID Token (copy this) ---\n');
    console.log(idToken);
    console.log('\n--- Test with curl ---\n');
    console.log(`curl -X POST http://localhost:3000/api/graphql \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${idToken}" \\
  -d '{"query": "{ me { id name email } }"}'`);
    
    // Test the GraphQL endpoint
    console.log('\n--- Testing GraphQL API ---\n');
    const response = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              id
              name
              email
              agencies {
                agency {
                  id
                  name
                  tokenBalance
                }
                role
              }
            }
          }
        `,
      }),
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
