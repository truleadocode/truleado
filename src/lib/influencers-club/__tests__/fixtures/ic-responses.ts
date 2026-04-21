/**
 * Fixture payloads mirroring product-documentation/influencers.club/*.md.
 * Keep these in sync with the docs; they double as a contract test against
 * our type definitions.
 */

import type {
  IcCreditsResponse,
  IcDiscoveryResponse,
  IcDictionaryLanguage,
} from '../../types';

export const creditsResponse: IcCreditsResponse = {
  credits_available: 99.5,
  credits_used: 0.5,
};

export const discoveryResponseBasic: IcDiscoveryResponse = {
  total: 120,
  limit: 30,
  credits_left: '99.2',
  accounts: [
    {
      user_id: 'ig_123456',
      profile: {
        full_name: 'Alice Fitness',
        username: 'alicefit',
        picture: 'https://cdn.ic.example/temp/alicefit.jpg?exp=123',
        followers: 125000,
        engagement_percent: 3.4,
      },
    },
    {
      user_id: 'ig_789012',
      profile: {
        full_name: 'Bob Yoga',
        username: 'bobyoga',
        picture: 'https://cdn.ic.example/temp/bobyoga.jpg?exp=456',
        followers: 48000,
        engagement_percent: 5.1,
      },
    },
  ],
};

export const languagesDictionary: IcDictionaryLanguage[] = [
  { language: 'English', abbreviation: 'en' },
  { language: 'Spanish', abbreviation: 'es' },
  { language: 'Japanese', abbreviation: 'ja' },
];
