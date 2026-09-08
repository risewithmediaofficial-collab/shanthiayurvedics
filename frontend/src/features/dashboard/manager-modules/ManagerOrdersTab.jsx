import React from 'react';
import { OrderListPage } from '../../orders/OrderListPage.jsx';

export function ManagerOrdersTab() {
  return (
    <div className="space-y-4">
      <OrderListPage hideHeader={true} />
    </div>
  );
}

export default ManagerOrdersTab;
