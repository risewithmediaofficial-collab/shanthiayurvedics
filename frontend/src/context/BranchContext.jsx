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
      const saved = sessionStorage.getItem('active_branch_id');
      if (saved && saved !== 'ALL') return saved;
      return '';
    } catch {
      return '';
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
    const list = Array.isArray(branchesResponse?.data)
      ? branchesResponse.data
      : (Array.isArray(branchesResponse) ? branchesResponse : []);
    if (list.length > 0) return list;
    return [{
      _id: 'MAIN',
      name: 'Main Branch',
      code: 'MAIN',
      isDefault: true
    }];
  }, [branchesResponse]);

  // Main hub/branch identification
  const mainBranch = useMemo(() => {
    if (!allBranches || allBranches.length === 0) return null;
    return (
      allBranches.find((b) => b.isDefault || b.code === 'MAIN' || b.code === 'HSR' || /main|hub|hosur/i.test(b.name || '')) ||
      allBranches[0]
    );
  }, [allBranches]);

  const availableBranches = useMemo(() => {
    if (!user) return [];
    if (user.role === 'OWNER') {
      if (!mainBranch) return allBranches;
      const mainId = String(mainBranch._id || mainBranch.id);
      const others = allBranches.filter((b) => String(b._id || b.id) !== mainId);
      return [mainBranch, ...others];
    }

    if (user.role === 'MANAGER') {
      const userBranchesList = Array.isArray(user.branches) && user.branches.length > 0
        ? user.branches
        : (user.branchId ? [user.branchId] : []);

      const assignedBranchIds = userBranchesList.map(b => (b._id || b.id || b).toString());
      const matched = allBranches.filter((b) => assignedBranchIds.includes((b._id || b.id)?.toString()));
      if (matched.length > 0) return matched;

      // Fallback: strictly lock to single first branch if available, NEVER all branches!
      return allBranches.length > 0 ? [allBranches[0]] : [];
    }

    // Strictly scope non-owners and non-managers (Distributor, Telecaller) to their single assigned branch
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

    return matchedBranch ? [matchedBranch] : (allBranches.length > 0 ? [allBranches[0]] : []);
  }, [user, allBranches, mainBranch]);

  // Keep selectedBranchId clean and synchronized
  useEffect(() => {
    if (!user) {
      setSelectedBranchId('');
      try { sessionStorage.removeItem('active_branch_id'); } catch {}
      return;
    }

    const mainBranchId = mainBranch ? String(mainBranch._id || mainBranch.id) : '';

    if (user.role === 'OWNER') {
      const savedBranch = sessionStorage.getItem('active_branch_id');
      // If owner had explicitly selected a valid branch (other than 'ALL') that exists:
      if (savedBranch && savedBranch !== 'ALL' && availableBranches.some((b) => String(b._id || b.id) === savedBranch)) {
        setSelectedBranchId(savedBranch);
      } else if (mainBranchId) {
        // STRICT: Default owner to Main Branch orders/data upon login, NEVER 'ALL'
        setSelectedBranchId(mainBranchId);
        try { sessionStorage.setItem('active_branch_id', mainBranchId); } catch {}
      }
    } else {
      // MANAGER, DISTRIBUTOR, TELECALLER: Strictly locked to their assigned branch!
      const firstBranch = availableBranches[0];
      const targetBranch = (firstBranch && firstBranch._id !== 'MAIN') ? String(firstBranch._id || firstBranch.id) : '';
      if (targetBranch) {
        setSelectedBranchId(targetBranch);
        try { sessionStorage.setItem('active_branch_id', targetBranch); } catch {}
      }
    }
  }, [user, availableBranches, mainBranch]);

  const selectBranch = (branchId) => {
    // Only OWNER can switch branches globally. Manager can only switch if assigned multiple specific branches.
    if (user?.role !== 'OWNER' && (user?.role !== 'MANAGER' || availableBranches.length <= 1)) {
      return;
    }

    const mainBranchId = mainBranch ? String(mainBranch._id || mainBranch.id) : '';
    const targetBranch = branchId || (mainBranchId || String(availableBranches[0]?._id || availableBranches[0]?.id));
    if (targetBranch === 'ALL' && user?.role !== 'OWNER') return;
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
        allBranches,
        branches: availableBranches,
        selectBranch,
        setSelectedBranchId: selectBranch,
        isOwner: user?.role === 'OWNER',
        isManager: user?.role === 'MANAGER',
        canSwitchBranch: user?.role === 'OWNER' || (user?.role === 'MANAGER' && availableBranches.length > 1)
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
