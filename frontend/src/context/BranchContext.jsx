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
          const userBranchIds = (user.branches || [user.branchId || user.branch])
            .map((b) => (typeof b === 'object' ? (b?._id || b?.id)?.toString() : b?.toString()))
            .filter(Boolean);

          const filtered = allBranches.filter((b) => userBranchIds.includes((b._id || b.id)?.toString()));
          const finalBranches = filtered.length > 0 ? filtered : allBranches;
          setAvailableBranches(finalBranches);

          const savedBranch = sessionStorage.getItem('active_branch_id');
          if (savedBranch && finalBranches.some((b) => (b._id || b.id)?.toString() === savedBranch)) {
            setSelectedBranchId(savedBranch);
          } else if (finalBranches.length > 0) {
            const firstBranchId = (finalBranches[0]._id || finalBranches[0].id)?.toString();
            setSelectedBranchId(firstBranchId);
            sessionStorage.setItem('active_branch_id', firstBranchId);
          }
        }
      } catch {
        const fallback = user.branches || [];
        setAvailableBranches(fallback);
      }
    };

    loadBranches();
  }, [user]);

  const selectBranch = (branchId) => {
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
