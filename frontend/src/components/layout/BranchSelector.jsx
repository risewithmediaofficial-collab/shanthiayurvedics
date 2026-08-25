import React from 'react';
import { Building2 } from 'lucide-react';
import { useBranch } from '../../context/BranchContext.jsx';

export function BranchSelector() {
  const { selectedBranchId, selectBranch, availableBranches = [], isOwner } = useBranch();

  if (!isOwner && availableBranches.length <= 1) {
    const singleBranch = availableBranches[0];
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-ayur-50/80 border border-ayur-200/80 rounded-lg text-xs font-semibold text-ayur-800">
        <Building2 className="w-3.5 h-3.5 text-ayur-600" />
        <span>{singleBranch?.name || 'Branch'}</span>
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
        {availableBranches.map((branch, index) => {
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
