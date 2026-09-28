import { JunctionBranch, JunctionType, JunctionBranchStatus } from '../../types';

/**
 * Junction Branch Manager
 * Handles programmatic branch initialization, branch-state lifecycle,
 * and connection logic for field mapping.
 */

export interface BranchSummary {
  totalCount: number;
  unmappedCount: number;
  inProgressCount: number;
  mappedCount: number;
  blockedCount: number;
  hasRemainingBranches: boolean;
}

/**
 * Generates initial branches according to topological junction type.
 * Ensures the arrival corridor is marked mapped if recorded during an active path,
 * while remaining diverging arms are initialized as 'unmapped'.
 */
export function generateDefaultBranchesForType(
  junctionId: string,
  type: JunctionType,
  connectedArrivalPathId?: string
): JunctionBranch[] {
  const arrivalStatus: JunctionBranchStatus = connectedArrivalPathId ? 'mapped' : 'unmapped';

  switch (type) {
    case 't_junction':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Corridor' : 'Base Corridor',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Left Branch',
          relativeSide: 'left',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b3`,
          junctionId,
          label: 'Right Branch',
          relativeSide: 'right',
          status: 'unmapped',
        },
      ];

    case 'cross_4way':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Corridor' : 'South Approach',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Left Branch',
          relativeSide: 'left',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b3`,
          junctionId,
          label: 'Straight Ahead',
          relativeSide: 'straight',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b4`,
          junctionId,
          label: 'Right Branch',
          relativeSide: 'right',
          status: 'unmapped',
        },
      ];

    case 'y_fork':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Stem' : 'Main Approach',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Left Fork',
          relativeSide: 'left',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b3`,
          junctionId,
          label: 'Right Fork',
          relativeSide: 'right',
          status: 'unmapped',
        },
      ];

    case 'irregular_3way':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Thoroughfare' : 'Main Corridor',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Angled Alleyway',
          relativeSide: 'left',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b3`,
          junctionId,
          label: 'Continuing Thoroughfare',
          relativeSide: 'right',
          status: 'unmapped',
        },
      ];

    case 'multi_way':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Corridor' : 'Entry Spoke',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Radial Branch 1 (North-East)',
          relativeSide: 'branch_1',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b3`,
          junctionId,
          label: 'Radial Branch 2 (South-East)',
          relativeSide: 'branch_2',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b4`,
          junctionId,
          label: 'Radial Branch 3 (South-West)',
          relativeSide: 'branch_3',
          status: 'unmapped',
        },
        {
          id: `${junctionId}_b5`,
          junctionId,
          label: 'Radial Branch 4 (North-West)',
          relativeSide: 'branch_4',
          status: 'unmapped',
        },
      ];

    case 'corner_bend':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Corridor' : 'Leg 1',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Corner Turn Continuation',
          relativeSide: 'straight',
          status: 'unmapped',
        },
      ];

    case 'dead_end':
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: 'Arrival Corridor (Terminates at Barrier)',
          relativeSide: 'stem',
          status: connectedArrivalPathId ? 'mapped' : 'unmapped',
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
      ];

    case 'unknown':
    default:
      return [
        {
          id: `${junctionId}_b1`,
          junctionId,
          label: connectedArrivalPathId ? 'Arrival Corridor' : 'Branch 1',
          relativeSide: 'stem',
          status: arrivalStatus,
          connectedPathId: connectedArrivalPathId,
          mappedAt: connectedArrivalPathId ? new Date().toISOString() : undefined,
        },
        {
          id: `${junctionId}_b2`,
          junctionId,
          label: 'Branch 2',
          relativeSide: 'straight',
          status: 'unmapped',
        },
      ];
  }
}

/**
 * Summarizes the branch tracking state for a junction.
 */
export function getBranchSummary(branches?: JunctionBranch[]): BranchSummary {
  if (!branches || branches.length === 0) {
    return {
      totalCount: 0,
      unmappedCount: 0,
      inProgressCount: 0,
      mappedCount: 0,
      blockedCount: 0,
      hasRemainingBranches: false,
    };
  }

  const unmappedCount = branches.filter((b) => b.status === 'unmapped').length;
  const inProgressCount = branches.filter((b) => b.status === 'in_progress').length;
  const mappedCount = branches.filter((b) => b.status === 'mapped').length;
  const blockedCount = branches.filter((b) => b.status === 'blocked').length;

  return {
    totalCount: branches.length,
    unmappedCount,
    inProgressCount,
    mappedCount,
    blockedCount,
    hasRemainingBranches: unmappedCount + inProgressCount > 0,
  };
}

/**
 * Human-readable breakdown of branches created by a junction type
 */
export function getBranchBreakdownDescription(type: JunctionType): string {
  switch (type) {
    case 't_junction':
      return '3 branches: 1 arrival + 2 remaining arms (Left & Right)';
    case 'cross_4way':
      return '4 branches: 1 arrival + 3 remaining arms (Left, Straight & Right)';
    case 'y_fork':
      return '3 branches: 1 arrival stem + 2 diverging forks (Left & Right)';
    case 'irregular_3way':
      return '3 branches: 1 arrival + 2 remaining corridors (Alleyway & Continuation)';
    case 'multi_way':
      return '5 branches: 1 arrival + 4 radial corridors to explore';
    case 'corner_bend':
      return '2 branches: 1 arrival + 1 corner turn continuation';
    case 'dead_end':
      return '1 branch: Terminating corridor (no diverging branches)';
    case 'unknown':
    default:
      return '2 branches: 1 arrival + 1 unmapped branch';
  }
}
