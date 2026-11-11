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
      const isExplicit = sessionStorage.getItem('active_branch_explicit') === 'true';
      if (saved && (saved !== 'ALL' || isExplicit) && saved !== 'MAIN' && saved !== 'undefined' && saved !== 'null') {
        return saved;
      }
      return '';
    } catch {
      return '';
    }
  });

  // Reactive query: updates instantly whenever 'branches' query key is invalidated!
  const { data: branchesResponse, isLoading: branchesLoading, isFetched: branchesFetched } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
    enabled: Boolean(user),
    staleTime: 60000
  });

  const hasLoadedBranches = useMemo(() => {
    const raw = branchesResponse?.data ?? branchesResponse;
    return Array.isArray(raw);
  }, [branchesResponse]);

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
      try {
        sessionStorage.removeItem('active_branch_id');
        sessionStorage.removeItem('active_branch_explicit');
      } catch {}
      return;
    }

    // Do not clamp or overwrite saved selection against temporary fallback before branches API resolves
    if (!hasLoadedBranches && (branchesLoading || !branchesFetched)) {
      return;
    }
    if (!hasLoadedBranches) {
      return;
    }

    const mainBranchId = mainBranch ? String(mainBranch._id || mainBranch.id) : '';
    const savedBranch = (() => {
      try { return sessionStorage.getItem('active_branch_id'); } catch { return null; }
    })();
    const isExplicit = (() => {
      try { return sessionStorage.getItem('active_branch_explicit') === 'true'; } catch { return false; }
    })();

    if (user.role === 'OWNER') {
      const isSavedValidBranch = Boolean(
        savedBranch &&
        availableBranches.some((b) => String(b._id || b.id) === String(savedBranch))
      );

      if (isSavedValidBranch) {
        setSelectedBranchId(String(savedBranch));
      } else if (savedBranch === 'ALL' && isExplicit) {
        setSelectedBranchId('ALL');
      } else if (mainBranchId) {
        // STRICT: Default owner to Main Branch orders/data upon login, NEVER stale 'ALL'
        setSelectedBranchId(mainBranchId);
        try {
          sessionStorage.setItem('active_branch_id', mainBranchId);
          sessionStorage.removeItem('active_branch_explicit');
        } catch {}
      }
    } else if (
      user.role === 'MANAGER' &&
      availableBranches.length > 1 &&
      savedBranch &&
      availableBranches.some((b) => String(b._id || b.id) === String(savedBranch))
    ) {
      setSelectedBranchId(String(savedBranch));
    } else {
      // MANAGER (single branch), DISTRIBUTOR, TELECALLER: Strictly locked to their assigned branch!
      const firstBranch = availableBranches[0];
      const targetBranch = (firstBranch && firstBranch._id !== 'MAIN') ? String(firstBranch._id || firstBranch.id) : '';
      if (targetBranch) {
        setSelectedBranchId(targetBranch);
        try {
          sessionStorage.setItem('active_branch_id', targetBranch);
          sessionStorage.removeItem('active_branch_explicit');
        } catch {}
      }
    }
  }, [user, availableBranches, mainBranch, hasLoadedBranches, branchesLoading, branchesFetched]);

  const selectBranch = (branchId) => {
    // Only OWNER can switch branches globally. Manager can only switch if assigned multiple specific branches.
    if (user?.role !== 'OWNER' && (user?.role !== 'MANAGER' || availableBranches.length <= 1)) {
      return;
    }

    const mainBranchId = mainBranch ? String(mainBranch._id || mainBranch.id) : '';
    const targetBranch = branchId ? String(branchId) : (mainBranchId || String(availableBranches[0]?._id || availableBranches[0]?.id));
    if (targetBranch === 'ALL' && user?.role !== 'OWNER') return;
    if (targetBranch !== 'ALL' && !availableBranches.some((branch) => String(branch._id || branch.id) === targetBranch)) return;
    if (targetBranch === String(selectedBranchId)) return;

    // Persist in sessionStorage BEFORE updating state/invalidating queries so immediate fetches attach new x-branch-id
    try {
      sessionStorage.setItem('active_branch_id', targetBranch);
      sessionStorage.setItem('active_branch_explicit', 'true');
    } catch {}

    setSelectedBranchId(targetBranch);

    // Clear and refetch all branch-scoped queries while preserving ['branches'] so availableBranches never flashes empty!
    const nonBranchesPredicate = (query) => query?.queryKey?.[0] !== 'branches';
    queryClient.removeQueries?.({ predicate: nonBranchesPredicate });
    queryClient.invalidateQueries?.({ predicate: nonBranchesPredicate });
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
