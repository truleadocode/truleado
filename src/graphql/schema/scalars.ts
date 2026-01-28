/**
 * GraphQL Custom Scalar Types
 * 
 * Implements the custom scalars defined in the GraphQL API Contract.
 */

import { GraphQLScalarType, Kind } from 'graphql';

/**
 * DateTime scalar - ISO 8601 date-time strings
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('DateTime must be a Date or ISO string');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid DateTime string');
      }
      return date;
    }
    throw new Error('DateTime must be a string');
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('DateTime must be a string');
  },
});

/**
 * Money scalar - Decimal amounts as strings to preserve precision
 */
export const MoneyScalar = new GraphQLScalarType({
  name: 'Money',
  description: 'Monetary amount as a decimal string',
  serialize(value: unknown): string {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (typeof value === 'string') {
      return parseFloat(value).toFixed(2);
    }
    throw new Error('Money must be a number or string');
  },
  parseValue(value: unknown): number {
    if (typeof value === 'string') {
      const amount = parseFloat(value);
      if (isNaN(amount)) {
        throw new Error('Invalid Money value');
      }
      return amount;
    }
    if (typeof value === 'number') {
      return value;
    }
    throw new Error('Money must be a string or number');
  },
  parseLiteral(ast): number {
    if (ast.kind === Kind.STRING || ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return parseFloat(ast.kind === Kind.STRING ? ast.value : String(ast.value));
    }
    throw new Error('Money must be a string or number');
  },
});

/**
 * URL scalar - Valid URL strings
 */
export const URLScalar = new GraphQLScalarType({
  name: 'URL',
  description: 'Valid URL string',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('URL must be a string');
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      try {
        new URL(value);
        return value;
      } catch {
        throw new Error('Invalid URL format');
      }
    }
    throw new Error('URL must be a string');
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      try {
        new URL(ast.value);
        return ast.value;
      } catch {
        throw new Error('Invalid URL format');
      }
    }
    throw new Error('URL must be a string');
  },
});

/**
 * JSON scalar - Arbitrary JSON data
 */
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast, variables): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT: {
        const obj: Record<string, unknown> = {};
        ast.fields.forEach((field) => {
          obj[field.name.value] = JSONScalar.parseLiteral(field.value, variables);
        });
        return obj;
      }
      case Kind.LIST:
        return ast.values.map((value) => JSONScalar.parseLiteral(value, variables));
      case Kind.NULL:
        return null;
      case Kind.VARIABLE:
        return variables?.[ast.name.value];
      default:
        return null;
    }
  },
});

export const scalarResolvers = {
  DateTime: DateTimeScalar,
  Money: MoneyScalar,
  URL: URLScalar,
  JSON: JSONScalar,
};
