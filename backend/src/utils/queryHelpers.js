import { AppError } from './errors.js';
import { parseBusinessDate } from './businessTime.js';

export const pagination = (query = {}) => {
  const isExport = query.export === 'true';
  const page = isExport ? 1 : Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = isExport ? 5000 : Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, isExport };
};

export const escapeSearch = (value) => String(value).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const dateRange = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = parseBusinessDate(startDate);
  if (endDate) range.$lte = parseBusinessDate(endDate, true);
  if (Object.values(range).some((date) => Number.isNaN(date.getTime()))) {
    throw new AppError('Enter a valid start and end date', 400);
  }
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw new AppError('Start date must be before end date', 400);
  }
  return range;
};
