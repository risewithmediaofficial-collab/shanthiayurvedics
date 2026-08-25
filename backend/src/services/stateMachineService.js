import { ALLOWED_ORDER_TRANSITIONS, ORDER_STATUS } from '../constants/orderStates.js';
import { AppError } from '../utils/errors.js';

export class StateMachineService {
  /**
   * Validate if an order status transition is permissible
   */
  static validateOrderTransition(currentStatus, targetStatus) {
    if (currentStatus === targetStatus) {
      return true;
    }

    const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid order status transition: Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(', ') || 'None (Terminal state)'}]`,
        400
      );
    }

    return true;
  }

  /**
   * Check if status indicates order is dispatched or beyond
   */
  static isDispatchedOrBeyond(status) {
    const postDispatchStates = [
      ORDER_STATUS.DISPATCHED,
      ORDER_STATUS.IN_TRANSIT,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.DELIVERY_FAILED,
      ORDER_STATUS.RTO
    ];
    return postDispatchStates.includes(status);
  }
}

export default StateMachineService;
