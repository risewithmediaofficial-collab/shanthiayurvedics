import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const [availableBranches, setAvailableBranches] = useState([]);

  useEffect(() => {
    const loadBranches = async () => {
      if (!user) {
        setAvailableBranches([]);
        setSelectedBranchId('ALL');
        try { sessionStorage.removeItem('active_branch_id'); } catch {}
        return;
      }

      try {
        const res = await apiClient.get('/branches');
        const allBranches = res.data?.data || [];

        if (user.role === 'OWNER') {
          setAvailableBranches(allBranches);
          const savedBranch = sessionStorage.getItem('active_branch_id');
          if (savedBranch && (savedBranch === 'ALL' || allBranches.some((b) => (b._id || b.id)?.toString() === savedBranch))) {
            setSelectedBranchId(savedBranch);
          } else {
            setSelectedBranchId('ALL');
            sessionStorage.setItem('active_branch_id', 'ALL');
          }
        } else {
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
            : allBranches[0];

          const finalBranches = matchedBranch ? [matchedBranch] : (allBranches.length > 0 ? [allBranches[0]] : []);
          setAvailableBranches(finalBranches);

          const branchIdToSet = (finalBranches[0]?._id || finalBranches[0]?.id)?.toString() || '';
          setSelectedBranchId(branchIdToSet);
          try {
            sessionStorage.setItem('active_branch_id', branchIdToSet);
          } catch {}
        }
      } catch {
        const fallback = user.branches || [];
        setAvailableBranches(fallback);
      }
    };

    loadBranches();
  }, [user]);

  const selectBranch = (branchId) => {
    // Only OWNER can switch branches; Managers, Distributors & Staff are locked to their own branch
    if (user?.role !== 'OWNER') {
      return;
    }

    const targetBranch = branchId || 'ALL';
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
      {children}
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
