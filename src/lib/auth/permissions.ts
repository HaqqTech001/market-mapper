/**
 * Market Mapper — Centralized Authorization & Permission Layer
 * Phase 2F Implementation
 *
 * The database is the authorization source of truth (enforced via Supabase RLS & PostgreSQL triggers).
 * This module provides typed role and semantic permission helpers for client UI representation.
 *
 * Approved roles ONLY: 'mapper', 'team_lead', 'admin'.
 * Inactive users (isActive === false) are denied all operational permissions.
 */

import { Profile, UserRole } from '../../types';

export interface UserPermissions {
  canManageUsers: boolean;
  canManageRoles: boolean;
  canManageTeams: boolean;
  canCreateMission: boolean;
  canManageGlobalCatalogue: boolean;
  canReviewCatalogueSuggestions: boolean;
  canManageMarketDefinitions: boolean;
  canCoordinateMission: boolean;
  canVerifyFieldRecords: boolean;
  canCaptureFieldData: boolean;
}

/**
 * Role Checkers (Strictly typed to approved roles)
 */
export const isMapper = (profile: Profile | null | undefined): boolean => {
  if (!profile || !profile.isActive) return false;
  return profile.role === 'mapper';
};

export const isTeamLead = (profile: Profile | null | undefined): boolean => {
  if (!profile || !profile.isActive) return false;
  return profile.role === 'team_lead';
};

export const isAdmin = (profile: Profile | null | undefined): boolean => {
  if (!profile || !profile.isActive) return false;
  return profile.role === 'admin';
};

/**
 * Checks if a profile has active status
 */
export const isUserActive = (profile: Profile | null | undefined): boolean => {
  return Boolean(profile && profile.isActive);
};

/**
 * Semantic Permission Evaluators
 * Inactive users receive false for all permissions.
 */
export const canManageUsers = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canManageRoles = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canManageTeams = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canCreateMission = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile) || isTeamLead(profile);
};

export const canManageGlobalCatalogue = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canReviewCatalogueSuggestions = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canManageMarketDefinitions = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile);
};

export const canCoordinateMission = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile) || isTeamLead(profile);
};

export const canVerifyFieldRecords = (profile: Profile | null | undefined): boolean => {
  return isAdmin(profile) || isTeamLead(profile);
};

export const canCaptureFieldData = (profile: Profile | null | undefined): boolean => {
  // All active roles can capture field data (mapper, team_lead, admin)
  return isUserActive(profile);
};

/**
 * Helper to get all permissions bundle for a profile
 */
export const getPermissions = (profile: Profile | null | undefined): UserPermissions => {
  return {
    canManageUsers: canManageUsers(profile),
    canManageRoles: canManageRoles(profile),
    canManageTeams: canManageTeams(profile),
    canCreateMission: canCreateMission(profile),
    canManageGlobalCatalogue: canManageGlobalCatalogue(profile),
    canReviewCatalogueSuggestions: canReviewCatalogueSuggestions(profile),
    canManageMarketDefinitions: canManageMarketDefinitions(profile),
    canCoordinateMission: canCoordinateMission(profile),
    canVerifyFieldRecords: canVerifyFieldRecords(profile),
    canCaptureFieldData: canCaptureFieldData(profile),
  };
};
