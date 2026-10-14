import React from 'react';
import { ShippingLabelLandscapeModal } from './ShippingLabelLandscapeModal.jsx';

export function PrintableShippingLabelModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  return (
    <ShippingLabelLandscapeModal
      isOpen={isOpen}
      onClose={onClose}
      orders={[order]}
      title={`Shipping Label — ${order.orderNumber || ''}`}
    />
  );
}

export default PrintableShippingLabelModal;
