import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.jsx';
import apiClient from '../api/apiClient.js';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    try {
      return sessionStorage.getItem('active_branch_id') || 'ALL';
    } catch {
      return 'ALL';
    }
  });

  // Reactive query: updates instantly whenever 'branches' query key is invalidated!
  const { data: branchesResponse } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
    enabled: Boolean(user)
  });

  const allBranches = useMemo(() => {
    return Array.isArray(branchesResponse?.data) ? branchesResponse.data : [];
  }, [branchesResponse]);

  const availableBranches = useMemo(() => {
    if (!user) return [];
    if (user.role === 'OWNER') {
      return allBranches;
    }

    // Strictly scope non-owners (Manager, Distributor, Telecaller) to their single assigned branch
    const userBranchId =
      (typeof user.branchId === 'object' ? user.branchId?._id || user.branchId?.id : user.branchId) ||
      (typeof user.branch === 'object' ? user.branch?._id || user.branch?.id : user.branch) ||
      (Array.isArray(user.branches) && user.branches[0]
        ? typeof user.branches[0] === 'object'
          ? user.branches[0]?._id || user.branches[0]?.id
          : user.branches[0]
        : null);

    const userBranchIdStr = userBranchId ? userBranchId.toString() : null;
    const matchedBranch = userBranchIdStr
      ? allBranches.find((b) => (b._id || b.id)?.toString() === userBranchIdStr)
      : null;

    return matchedBranch ? [matchedBranch] : [];
  }, [user, allBranches]);

  // Keep selectedBranchId clean and synchronized
  useEffect(() => {
    if (!user) {
      setSelectedBranchId('ALL');
      try { sessionStorage.removeItem('active_branch_id'); } catch {}
      return;
    }

    if (user.role === 'OWNER') {
      const savedBranch = sessionStorage.getItem('active_branch_id');
      // If the currently saved branch was deleted (is no longer in availableBranches) and isn't 'ALL', reset to 'ALL'!
      if (savedBranch && savedBranch !== 'ALL' && !availableBranches.some((b) => String(b._id || b.id) === savedBranch)) {
        setSelectedBranchId('ALL');
        try { sessionStorage.setItem('active_branch_id', 'ALL'); } catch {}
      } else if (savedBranch) {
        setSelectedBranchId(savedBranch);
      } else {
        setSelectedBranchId('ALL');
        try { sessionStorage.setItem('active_branch_id', 'ALL'); } catch {}
      }
    } else {
      const singleBranch = availableBranches[0];
      const branchIdToSet = singleBranch ? String(singleBranch._id || singleBranch.id) : '';
      setSelectedBranchId(branchIdToSet);
      try { sessionStorage.setItem('active_branch_id', branchIdToSet); } catch {}
    }
  }, [user, availableBranches]);

  const selectBranch = (branchId) => {
    // Only OWNER can switch branches; Managers, Distributors & Staff are locked to their own branch
    if (user?.role !== 'OWNER') {
      return;
    }

    const targetBranch = branchId || 'ALL';
    if (targetBranch !== 'ALL' && !availableBranches.some((branch) => String(branch._id || branch.id) === targetBranch)) return;
    if (targetBranch === selectedBranchId) return;
    queryClient.clear?.();
    setSelectedBranchId(targetBranch);
    try {
      sessionStorage.setItem('active_branch_id', targetBranch);
    } catch {}

    // Invalidate React Query cache so all modules immediately re-fetch with new branch headers!
    queryClient.invalidateQueries();
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        availableBranches,
        branches: availableBranches,
        selectBranch,
        setSelectedBranchId: selectBranch,
        isOwner: user?.role === 'OWNER'
      }}
    >
      <React.Fragment key={`${user?.id || user?._id || 'guest'}:${selectedBranchId}`}>{children}</React.Fragment>
    </BranchContext.Provider>
  );
}

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};

export default BranchContext;
