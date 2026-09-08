import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import apiClient from '../api/apiClient.js';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [availableBranches, setAvailableBranches] = useState([]);

  useEffect(() => {
    const loadBranches = async () => {
      if (!user) {
        setAvailableBranches([]);
        setSelectedBranchId('ALL');
        return;
      }

      try {
        const res = await apiClient.get('/branches');
        const allBranches = res.data?.data || [];

        if (user.role === 'OWNER') {
          setAvailableBranches(allBranches);
          setSelectedBranchId('ALL');
        } else {
          const userBranchIds = (user.branches || [user.branchId || user.branch])
            .map((b) => (typeof b === 'object' ? (b?._id || b?.id)?.toString() : b?.toString()))
            .filter(Boolean);

          const filtered = allBranches.filter((b) => userBranchIds.includes(b._id?.toString()));
          const finalBranches = filtered.length > 0 ? filtered : allBranches;
          setAvailableBranches(finalBranches);
          if (finalBranches.length > 0) {
            setSelectedBranchId(finalBranches[0]._id);
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
    setSelectedBranchId(branchId);
    // Store in session storage for quick persistence
    sessionStorage.setItem('active_branch_id', branchId);
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        availableBranches,
        selectBranch,
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
