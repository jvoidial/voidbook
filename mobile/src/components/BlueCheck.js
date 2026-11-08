import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { theme as T } from '../theme';

// A profile is verified if either flag is set. `verified` predates the
// monetization work; `is_verified` is what the admin panel and SQL grant. Reading
// both means a checkmark can never disappear because one column lagged behind.
export const isVerified = (u) => !!(u?.is_verified || u?.verified);

export default function BlueCheck({ user, size = 15, style }) {
  if (!isVerified(user)) return null;
  return <Ionicons name="checkmark-circle" size={size} color={T.link} style={style} />;
}
