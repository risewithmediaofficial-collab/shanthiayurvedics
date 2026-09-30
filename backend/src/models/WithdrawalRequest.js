import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 5000 },
  status: { type: String, enum: ['PENDING', 'PROCESSED', 'REJECTED'], default: 'PENDING', index: true },
  payoutMode: { type: String, enum: ['BANK_TRANSFER', 'UPI'], required: true },
  bankAccount: { type: String, required: true, trim: true },
  referenceNo: { type: String, trim: true },
  processedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

withdrawalRequestSchema.index({ branchId: 1, createdAt: -1 });

export const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
export default WithdrawalRequest;
