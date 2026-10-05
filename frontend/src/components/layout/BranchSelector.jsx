import React from 'react';
import { Building2 } from 'lucide-react';
import { useBranch } from '../../context/BranchContext.jsx';

export function BranchSelector() {
  const { selectedBranchId, selectBranch, availableBranches = [], isOwner } = useBranch();
  const safeBranches = Array.isArray(availableBranches) ? availableBranches : [];

  // Non-owners (Managers, Distributors, Staff) are strictly locked to their assigned branch
  if (!isOwner) {
    const singleBranch = safeBranches[0];
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 shadow-2xs select-none">
        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate max-w-[240px]">{singleBranch?.name || 'Hosur Main Hub'}</span>
        {singleBranch?.code && (
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200/60 rounded text-emerald-900 font-bold ml-0.5">
            {singleBranch.code}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="w-4 h-4 text-slate-400" />
      <select
        value={selectedBranchId || 'ALL'}
        onChange={(e) => selectBranch(e.target.value)}
        className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600 shadow-xs cursor-pointer"
      >
        {isOwner && (
          <option key="branch-option-all" value="ALL">
            🏢 All Branches (Global)
          </option>
        )}
        {safeBranches.map((branch, index) => {
          const branchId = branch?._id || branch?.id || (typeof branch === 'string' ? branch : `branch-${index}`);
          const branchName = branch?.name || (branch?.code ? `Branch ${branch.code}` : `Branch ${index + 1}`);
          const branchCode = branch?.code ? ` (${branch.code})` : '';

          return (
            <option key={`branch-opt-${branchId}-${index}`} value={branchId}>
              📍 {branchName}{branchCode}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default BranchSelector;
