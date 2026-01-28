/**
 * GraphQL Schema Export
 * 
 * Combines type definitions and resolvers into a complete schema.
 */

import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './typeDefs';
import { scalarResolvers } from './scalars';
import { queryResolvers } from '../resolvers/queries';
import { mutationResolvers } from '../resolvers/mutations';
import { typeResolvers } from '../resolvers/types';

// Combine all resolvers
const resolvers = {
  ...scalarResolvers,
  Query: queryResolvers,
  Mutation: mutationResolvers,
  ...typeResolvers,
};

// Create executable schema
export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export { typeDefs, resolvers };
