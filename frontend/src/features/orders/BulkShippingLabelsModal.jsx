import React from 'react';
import { ShippingLabelLandscapeModal } from './ShippingLabelLandscapeModal.jsx';

export function BulkShippingLabelsModal({ isOpen, onClose, orders = [] }) {
  if (!isOpen) return null;

  return (
    <ShippingLabelLandscapeModal
      isOpen={isOpen}
      onClose={onClose}
      orders={orders}
      title="Batch Shipping Labels (A4 Landscape)"
    />
  );
}

export default BulkShippingLabelsModal;
