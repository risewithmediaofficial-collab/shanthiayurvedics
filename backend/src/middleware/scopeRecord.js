import { recordScope } from '../utils/recordScope.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import mongoose from 'mongoose';

export const scopeRecord = (Model, ownershipField) => async (req, res, next, id) => {
  try {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid record ID', 400);
    const exists = await Model.exists({ _id: id, ...recordScope(req.user, req, ownershipField) });
    if (!exists) throw new NotFoundError(Model.modelName);
    next();
  } catch (err) { next(err); }
};
