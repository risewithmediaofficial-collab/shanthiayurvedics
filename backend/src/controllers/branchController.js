import { Branch } from '../models/Branch.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { AuditService } from '../services/auditService.js';

export const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ isActive: true }).sort({ name: 1 }).lean();
  return ApiResponse.success(res, branches, 'Branches retrieved successfully');
});

export const getAllBranchesAdmin = asyncHandler(async (req, res) => {
  const branches = await Branch.find().sort({ createdAt: -1 }).lean();
  return ApiResponse.success(res, branches, 'All branches retrieved');
});

export const createBranch = asyncHandler(async (req, res) => {
  const { name, code, address, phone, email } = req.body;

  const existingCode = await Branch.findOne({ code: code.toUpperCase() });
  if (existingCode) {
    throw new ConflictError(`Branch with code '${code}' already exists`);
  }

  const newBranch = new Branch({
    name,
    code: code.toUpperCase(),
    address,
    phone,
    email,
    isActive: true
  });

  await newBranch.save();

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

  return ApiResponse.created(res, newBranch, 'Branch created successfully');
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) {
    throw new NotFoundError('Branch');
  }

  const oldValue = branch.toObject();
  const { name, address, phone, email, isActive } = req.body;

  if (name !== undefined) branch.name = name;
  if (address !== undefined) branch.address = address;
  if (phone !== undefined) branch.phone = phone;
  if (email !== undefined) branch.email = email;
  if (isActive !== undefined) branch.isActive = isActive;

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

  return ApiResponse.success(res, branch, 'Branch updated successfully');
});
