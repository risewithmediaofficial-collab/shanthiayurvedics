import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { useBranch } from '../../context/BranchContext.jsx';
import { CustomSelect } from '../common/CustomSelect.jsx';

export function BranchSelector() {
  const { selectedBranchId, selectBranch, availableBranches = [], canSwitchBranch, isOwner } = useBranch();
  const safeBranches = Array.isArray(availableBranches) ? availableBranches : [];

  // Staff locked to single assigned branch (Manager, Distributor, Telecaller)
  if (!canSwitchBranch) {
    const singleBranch = safeBranches[0];
    return (
      <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50/90 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 shadow-2xs select-none max-w-full">
        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="truncate max-w-[110px] sm:max-w-[240px]">{singleBranch?.name || 'Hosur Main Hub'}</span>
        {singleBranch?.code && (
          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200/60 rounded text-emerald-900 font-bold ml-0.5 shrink-0">
            {singleBranch.code}
          </span>
        )}
      </div>
    );
  }

  const branchOptions = useMemo(() => {
    const opts = [];
    if (isOwner) {
      opts.push({
        value: 'ALL',
        label: '🏢 All Branches (Global)',
      });
    }

    safeBranches.forEach((branch, index) => {
      const branchId = branch?._id || branch?.id || (typeof branch === 'string' ? branch : `branch-${index}`);
      const branchName = branch?.name || (branch?.code ? `Branch ${branch.code}` : `Branch ${index + 1}`);
      const branchCode = branch?.code ? ` (${branch.code})` : '';

      opts.push({
        value: branchId,
        label: `📍 ${branchName}${branchCode}`,
        badge: branch?.code || undefined,
      });
    });

    return opts;
  }, [safeBranches, isOwner]);

  return (
    <div className="flex items-center">
      <CustomSelect
        value={selectedBranchId || 'ALL'}
        onChange={(e) => selectBranch(e.target.value)}
        options={branchOptions}
        icon={Building2}
        size="sm"
        minWidth="min-w-[130px] sm:min-w-[220px]"
        searchable={branchOptions.length > 5}
        className="bg-white/90 font-semibold border-slate-200 text-slate-700 shadow-xs hover:border-emerald-400"
      />
    </div>
  );
}

export default BranchSelector;
