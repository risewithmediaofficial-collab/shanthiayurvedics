import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true })
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .sort({ name: 1 })
    .lean();
  return ApiResponse.success(res, branches, 'Branches retrieved successfully');
});

export const getAllBranchesAdmin = asyncHandler(async (req, res) => {
  const branches = await Branch.find()
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .sort({ createdAt: -1 })
    .lean();
  return ApiResponse.success(res, branches, 'All branches retrieved');
});

export const createBranch = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    address,
    phone,
    email,
    managerId,
    managerName,
    managerPhone,
    distributorId,
    distributorName,
    distributorPhone,
    distributorEmail,
    branchType,
    revenueSharePercent,
    billerId,
    gstNumber
  } = req.body;

  const existingCode = await Branch.findOne({ code: code.toUpperCase() });
  if (existingCode) {
    throw new ConflictError(`Branch with code '${code}' already exists`);
  }

  // Resolve manager details if managerId is provided
  let effectiveManagerName = managerName;
  let effectiveManagerPhone = managerPhone;
  if (managerId) {
    const mgrUser = await User.findById(managerId).select('name phone email').lean();
    if (mgrUser) {
      effectiveManagerName = effectiveManagerName || mgrUser.name;
      effectiveManagerPhone = effectiveManagerPhone || mgrUser.phone;
    }
  }

  // Resolve distributor details if distributorId is provided
  let effectiveDistributorName = distributorName;
  let effectiveDistributorPhone = distributorPhone;
  let effectiveDistributorEmail = distributorEmail;
  if (distributorId) {
    const distUser = await User.findById(distributorId).select('name phone email').lean();
    if (distUser) {
      effectiveDistributorName = effectiveDistributorName || distUser.name;
      effectiveDistributorPhone = effectiveDistributorPhone || distUser.phone;
      effectiveDistributorEmail = effectiveDistributorEmail || distUser.email;
    }
  }

  const newBranch = new Branch({
    name,
    code: code.toUpperCase(),
    address,
    phone,
    email,
    managerId: managerId || null,
    managerName: effectiveManagerName,
    managerPhone: effectiveManagerPhone,
    distributorId: distributorId || null,
    distributorName: effectiveDistributorName,
    distributorPhone: effectiveDistributorPhone,
    distributorEmail: effectiveDistributorEmail,
    branchType: branchType || 'COMPANY_OWNED',
    revenueSharePercent: Number(revenueSharePercent || 0),
    billerId: billerId || '1000058077',
    gstNumber,
    isActive: true
  });

  await newBranch.save();

  // Link newly created branch to assigned manager & distributor
  if (managerId) {
    await User.findByIdAndUpdate(managerId, {
      branchId: newBranch._id,
      $addToSet: { branches: newBranch._id }
    });
  }
  if (distributorId) {
    await User.findByIdAndUpdate(distributorId, {
      branchId: newBranch._id,
      $addToSet: { branches: newBranch._id }
    });
  }

  await AuditService.log({
    userId: req.user.id,
    branchId: newBranch._id,
    action: 'BRANCH_CREATED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: newBranch._id,
    newValue: newBranch.toObject(),
    req
  });

  const populatedBranch = await Branch.findById(newBranch._id)
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .lean();

  return ApiResponse.created(res, populatedBranch, 'Branch created successfully');
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const oldValue = branch.toObject();
  const {
    name,
    code,
    address,
    phone,
    email,
    isActive,
    managerId,
    managerName,
    managerPhone,
    distributorId,
    distributorName,
    distributorPhone,
    distributorEmail,
    branchType,
    revenueSharePercent,
    billerId,
    gstNumber
  } = req.body;

  if (code && code.toUpperCase() !== branch.code) {
    const existingCode = await Branch.findOne({
      code: code.toUpperCase(),
      _id: { $ne: branch._id }
    });
    if (existingCode) {
      throw new ConflictError(`Branch with code '${code}' already exists`);
    }
    branch.code = code.toUpperCase();
  }

  if (name !== undefined) branch.name = name;
  if (address !== undefined) branch.address = address;
  if (phone !== undefined) branch.phone = phone;
  if (email !== undefined) branch.email = email;
  if (isActive !== undefined) branch.isActive = isActive;
  
  if (managerId !== undefined) {
    branch.managerId = managerId || null;
    if (managerId) {
      const mgrUser = await User.findById(managerId).select('name phone').lean();
      if (mgrUser) {
        branch.managerName = managerName || mgrUser.name;
        branch.managerPhone = managerPhone || mgrUser.phone;
      }
      await User.findByIdAndUpdate(managerId, {
        branchId: branch._id,
        $addToSet: { branches: branch._id }
      });
    }
  }
  if (managerName !== undefined) branch.managerName = managerName;
  if (managerPhone !== undefined) branch.managerPhone = managerPhone;

  if (distributorId !== undefined) {
    branch.distributorId = distributorId || null;
    if (distributorId) {
      const distUser = await User.findById(distributorId).select('name phone email').lean();
      if (distUser) {
        branch.distributorName = distributorName || distUser.name;
        branch.distributorPhone = distributorPhone || distUser.phone;
        branch.distributorEmail = distributorEmail || distUser.email;
      }
      await User.findByIdAndUpdate(distributorId, {
        branchId: branch._id,
        $addToSet: { branches: branch._id }
      });
    }
  }
  if (distributorName !== undefined) branch.distributorName = distributorName;
  if (distributorPhone !== undefined) branch.distributorPhone = distributorPhone;
  if (distributorEmail !== undefined) branch.distributorEmail = distributorEmail;

  if (branchType !== undefined) branch.branchType = branchType;
  if (revenueSharePercent !== undefined) branch.revenueSharePercent = revenueSharePercent;
  if (billerId !== undefined) branch.billerId = billerId;
  if (gstNumber !== undefined) branch.gstNumber = gstNumber;

  await branch.save();

  await AuditService.log({
    userId: req.user.id,
    branchId: branch._id,
    action: 'BRANCH_UPDATED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: branch._id,
    oldValue,
    newValue: branch.toObject(),
    req
  });

  const updatedPopulated = await Branch.findById(branch._id)
    .populate('managerId', 'name phone email role')
    .populate('distributorId', 'name phone email role')
    .lean();

  return ApiResponse.success(res, updatedPopulated, 'Branch updated successfully');
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const oldValue = branch.toObject();
  await Branch.findByIdAndDelete(req.params.id);

  await AuditService.log({
    userId: req.user.id,
    branchId: branch._id,
    action: 'BRANCH_DELETED',
    module: 'branches',
    resourceType: 'Branch',
    resourceId: branch._id,
    oldValue,
    req
  });

  return ApiResponse.success(res, { id: req.params.id, name: branch.name }, 'Branch deleted successfully');
});

