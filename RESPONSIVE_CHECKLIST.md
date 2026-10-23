# Responsive Design Project-Wide Checklist

This checklist tracks the responsive design status for every route, layout, dashboard view, sub-tab, modal, and reusable UI component in the Shanthi Ayurvedas CRM project across **Mobile (320px, 375px, 390px)**, **Tablet (768px)**, and **Desktop (1024px, 1440px)**.

Statuses:
- **Fix status**: `PENDING` | `IN_PROGRESS` | `FIXED`
- **Verification status**: `PENDING` | `VERIFIED` | `BLOCKED`

---

## 1. Global Styles & Shared Layouts

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/src/index.css` | Global CSS & Design System | Added `.safe-bottom`, touch targets (`min-h-[44px]`), `.crm-table-wrap` (inertial touch scrolling, containment), word-break rules | FIXED | VERIFIED |
| `frontend/src/layouts/DashboardLayout.jsx` | Dashboard Layout Wrapper | Adaptive padding `p-2 sm:p-4 md:p-6`, bottom safe-area offset for mobile dock | FIXED | VERIFIED |
| `frontend/src/layouts/AuthLayout.jsx` | Auth Layout Wrapper | Mobile padding `py-6 sm:py-12 px-3 sm:px-6`, centered card container with zero horizontal bleed | FIXED | VERIFIED |
| `frontend/src/components/layout/Navbar.jsx` | Top Navigation Bar | Compact header layout, responsive icon sizing, mobile branch selector truncation | FIXED | VERIFIED |
| `frontend/src/components/layout/Sidebar.jsx` | Sidebar & Mobile Drawer | Responsive drawer width `w-[82vw] max-w-72`, safe-area touch close button, smooth backdrop tap dismiss | FIXED | VERIFIED |
| `frontend/src/components/layout/BottomDockMenuBar.jsx` | Mobile Dock Navigation Bar | Touch targets >=44px, safe-area inset bottom padding, active item state indicators | FIXED | VERIFIED |
| `frontend/src/components/layout/Breadcrumbs.jsx` | Breadcrumbs Navigation | Breadcrumb truncate per breakpoint, flex-wrap containment | FIXED | VERIFIED |
| `frontend/src/components/layout/BranchSelector.jsx` | Branch Switcher Dropdown | Mobile header text truncation, dropdown width containment | FIXED | VERIFIED |
| `frontend/src/components/layout/ViewPanelMenu.jsx` | View Panel Switcher Popover | Responsive popover max-width `max-w-[calc(100vw-2rem)]` | FIXED | VERIFIED |
| `frontend/src/components/layout/NotificationBell.jsx` | Notification Bell & Drawer | Responsive notification panel width, break-words text wrapping | FIXED | VERIFIED |
| `frontend/src/components/layout/UserMenu.jsx` | User Profile Dropdown & Modal | Touch menu item targets, responsive placement | FIXED | VERIFIED |
| `frontend/src/components/layout/AccountSwitcher.jsx` | Account Switcher Modal | Centered responsive modal container | FIXED | VERIFIED |

---

## 2. Reusable Common Primitives

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/src/components/common/Card.jsx` | Card Component | Header auto-stacking `flex-col sm:flex-row`, responsive padding `p-3.5 sm:p-5` | FIXED | VERIFIED |
| `frontend/src/components/common/Modal.jsx` | Modal Dialog | Full width on mobile (<640px) with 0 horizontal bleed, internal scrolling, sticky actions, safe-bottom | FIXED | VERIFIED |
| `frontend/src/components/common/Drawer.jsx` | Slide-over Drawer | 100% width on mobile, safe-area bottom padding, smooth close button | FIXED | VERIFIED |
| `frontend/src/components/common/Table.jsx` | Data Table Primitive | Wrapped in `.crm-table-wrap w-full max-w-full overflow-x-auto` with native momentum scroll | FIXED | VERIFIED |
| `frontend/src/components/common/Pagination.jsx` | Pagination Bar | Adaptive column stack on xs screens `flex-col xs:flex-row`, touch page buttons | FIXED | VERIFIED |
| `frontend/src/components/common/Button.jsx` | Button Primitive | Touch target sizing (`min-h-[40px] sm:min-h-[38px]`, `touch-manipulation`) | FIXED | VERIFIED |
| `frontend/src/components/common/Input.jsx` | Input Field & Addons | Flexible input container, responsive text sizing, break-word error labels | FIXED | VERIFIED |
| `frontend/src/components/common/Select.jsx` | Native Select Dropdown | Touch sizing, truncated option text, responsive arrow icon | FIXED | VERIFIED |
| `frontend/src/components/common/CustomSelect.jsx` | Searchable Custom Select | Popover constrained `max-w-[calc(100vw-1.5rem)]`, touch list items | FIXED | VERIFIED |
| `frontend/src/components/common/DateRangeFilter.jsx` | Date Range Filter Ribbon | Responsive ribbon with `.crm-table-wrap`, touch presets, popover alignment | FIXED | VERIFIED |
| `frontend/src/components/common/SortDropdown.jsx` | Sort Dropdown Menu | Mobile popover alignment and touch items | FIXED | VERIFIED |
| `frontend/src/components/common/Badge.jsx` | Badge Pill | Inline-flex whitespace-nowrap, adaptive text sizing | FIXED | VERIFIED |
| `frontend/src/components/common/SimpleProgressBar.jsx` | Progress Bar | Flexible container width, adaptive typography | FIXED | VERIFIED |
| `frontend/src/components/common/SimpleTrendChart.jsx` | Sparkline & Trend Chart | Container `min-w-0 max-w-full` preventing Recharts flex blowout | FIXED | VERIFIED |
| `frontend/src/components/common/EmptyState.jsx` | Empty State Box | Adaptive padding and icon sizing on 320px | FIXED | VERIFIED |
| `frontend/src/components/common/ExportButton.jsx` | Export Action Button | Responsive label display, touch-friendly hit box | FIXED | VERIFIED |
| `frontend/src/components/common/Spinner.jsx` | Loading Spinner | Flex centering container across all parent widths | FIXED | VERIFIED |

---

## 3. Authentication & Public Pages

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginPage.jsx` | Full width card on mobile, touch-friendly inputs, zero horizontal scroll | FIXED | VERIFIED |
| `/forgot-password` | `ForgotPasswordPage.jsx` | Adaptive card container, comfortable mobile touch targets | FIXED | VERIFIED |
| `/reset-password` | `ResetPasswordPage.jsx` | Responsive password toggle button, full-width submission action | FIXED | VERIFIED |

---

## 4. Role Dashboards & Internal Tabs (`/dashboard`, `/manager`)

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | `DashboardHub.jsx` | Role router view switching layout with responsive container | FIXED | VERIFIED |
| `/dashboard?view=telecaller` | `TelecallerDashboardView.jsx` | Header stats ribbon auto-wrap, lead cards grid, touch call actions | FIXED | VERIFIED |
| `/dashboard?view=distributor` | `DistributorStockDashboardView.jsx` | Stock table horizontal containment, action buttons wrap cleanly | FIXED | VERIFIED |
| `/dashboard?view=owner` | `AdminDistributorDashboardView.jsx` | Metrics grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, team grid, table scroll | FIXED | VERIFIED |
| `/dashboard?tab=overview` | `ManagerOverviewTab.jsx` | Bento grid metrics wrapping, conversion funnel cards, activity table containment | FIXED | VERIFIED |
| `/dashboard?tab=orders` | `ManagerOrdersTab.jsx` | Orders table container `.crm-table-wrap`, filter toolbars wrap | FIXED | VERIFIED |
| `/dashboard?tab=leads` | `ManagerLeadsTab.jsx` | Lead pipeline cards, filter controls, bulk reassign bar wrapping | FIXED | VERIFIED |
| `/dashboard?tab=stock` | `ManagerStockTab.jsx` | Low stock alerts grid `grid-cols-1 sm:grid-cols-2`, inventory table scroll | FIXED | VERIFIED |
| `/dashboard?tab=team` | `ManagerTeamTab.jsx` | Staff cards grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, chart containers | FIXED | VERIFIED |
| `/dashboard?tab=salary` | `ManagerSalaryTab.jsx` | Salary calculator table with horizontal touch scroll, responsive inputs | FIXED | VERIFIED |
| `/dashboard?tab=officesale` | `ManagerOfficeSaleTab.jsx` | Counter sale form layout stack `flex-col lg:flex-row`, payment selector | FIXED | VERIFIED |
| `/dashboard?tab=branchorders`| `ManagerBranchOrdersTab.jsx` | Inter-branch order fulfillment table `.crm-table-wrap`, touch status actions | FIXED | VERIFIED |
| `/dashboard?tab=withdrawal` | `ManagerWithdrawalTab.jsx` | Cash withdrawal request form and approval cards stacking | FIXED | VERIFIED |
| `/dashboard?tab=stuck` | `ManagerStuckTab.jsx` | Stuck order resolution actions, responsive error reason badges | FIXED | VERIFIED |

---

## 5. Orders & Counter Sale Modules

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/orders` | `OrderListPage.jsx` | Status pill ribbon horizontal scroll `.crm-table-wrap`, bulk toolbar stacking, table wrap | FIXED | VERIFIED |
| `/orders` (Table View) | `OrdersFullTableView.jsx` | 20+ columns table horizontal containment with momentum touch scroll, column selector | FIXED | VERIFIED |
| `/orders/:id` | `OrderDetailPage.jsx` | 2-column detail grid stacking `grid-cols-1 lg:grid-cols-3`, customer card, timeline | FIXED | VERIFIED |
| `/orders/counter-sale` | `CounterSalePage.jsx` | POS responsive split-view `grid-cols-1 lg:grid-cols-12` (product catalog + order cart) | FIXED | VERIFIED |
| `/orders/stuck` | `StuckOrdersPage.jsx` | Stuck orders filter ribbon, retry buttons touch targets, error code inspection | FIXED | VERIFIED |

---

## 6. Leads, Followups & Customers

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/leads` | `LeadListPage.jsx` | Filter bar stacking `flex-col sm:flex-row`, stage tabs horizontal scroll, table containment | FIXED | VERIFIED |
| `/leads/calls` & `/call-history` | `CallHistoryPage.jsx` | Audio playback controller bar stacking, call outcome tags wrap, duration display | FIXED | VERIFIED |
| `/followups` | `FollowUpListPage.jsx` | Overdue/Today/Upcoming tabs `.crm-table-wrap`, calendar filter, call reschedule drawer | FIXED | VERIFIED |
| `/customers` | `CustomerListPage.jsx` | Customer search bar responsive width, purchase history drawer trigger, metrics cards | FIXED | VERIFIED |

---

## 7. Products, Inventory & Transfers

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/products` | `ProductCatalogPage.jsx` | Product cards grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, pricing inputs stack | FIXED | VERIFIED |
| `/inventory` | `InventoryLedgerPage.jsx` | Stock adjustments table `.crm-table-wrap`, warehouse selector, batch filter | FIXED | VERIFIED |
| `/inventory/transfers` | `StockTransfersPage.jsx` | Transfer request wizard responsive step cards, dispatch manifest, transit badges | FIXED | VERIFIED |

---

## 8. Operations & Logistics Hub

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/operations` | `OperationsHubPage.jsx` | Metrics tiles grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, courier breakdown | FIXED | VERIFIED |
| `/operations/packing` | `PackingStationPage.jsx` | Barcode scanner input, item checklist, box dimension inputs stack, print button | FIXED | VERIFIED |
| `/operations/dispatch` | `DispatchQueuePage.jsx` | Manifest generator, courier handover checklist, bulk print actions wrapping | FIXED | VERIFIED |
| `/scan-tracker` | `ScanTrackerPage.jsx` | Scan tracker container responsive padding, camera/USB barcode input sizing | FIXED | VERIFIED |

---

## 9. Shipping & RTO Management

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/shipping` & `/shipping/tracking` | `DeliveryTrackingPage.jsx` | Courier filter pills `.crm-table-wrap`, AWB search bar, tracking timeline stepper | FIXED | VERIFIED |
| `/rto` | `RTOManagementPage.jsx` | RTO classification tabs horizontal scroll, re-attempt schedule form stack | FIXED | VERIFIED |

---

## 10. Reports & Analytics

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/reports` | `ReportsHubPage.jsx` | Multi-tab analytics dashboard `.crm-table-wrap`, chart containers `min-w-0 max-w-full` | FIXED | VERIFIED |
| `/reports/tc-sales` | `ReportsHubPage.jsx` (TC Sales) | Telecaller sales leaderboard, commission breakdown table containment | FIXED | VERIFIED |
| `/reports/settlement` | `ReportsHubPage.jsx` (Settlement) | Courier COD remittance table `.crm-table-wrap`, reconciliation list | FIXED | VERIFIED |

---

## 11. Administration & Settings

| Path | Page/component | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `/admin/branches` | `BranchManagementPage.jsx` | Branch cards grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, new branch modal | FIXED | VERIFIED |
| `/admin/users` | `UserManagementPage.jsx` | User role filter bar stack, staff table `.crm-table-wrap`, permissions drawer | FIXED | VERIFIED |
| `/admin/roles` | `RolesManagementPage.jsx` | Permission matrix checklist grid scrollable on mobile/tablet | FIXED | VERIFIED |
| `/admin/integrations` | `IntegrationsPage.jsx` | API credentials cards `grid-cols-1 lg:grid-cols-2`, form inputs stack | FIXED | VERIFIED |
| `/admin/notifications-test` | `NotificationTestingPage.jsx` | Web push testing console, device subscription payload viewer pre-wrap | FIXED | VERIFIED |
| `/admin/audit` | `AuditLogViewerPage.jsx` | Audit event timeline, JSON diff inspector modal with touch scroll | FIXED | VERIFIED |

---

## 12. Modals & Dialog Drawers

| Component | Usage | Issues & Responsive Solutions | Fix status | Verification status |
| :--- | :--- | :--- | :--- | :--- |
| `OrderCreateModal.jsx` | New Order Creation | Multi-step form with customer search, address fields stack, product line items mobile headers | FIXED | VERIFIED |
| `OrderDetailsModal.jsx` | Quick Order View | Sticky header/footer, status badge, items list `.crm-table-wrap`, action buttons wrap | FIXED | VERIFIED |
| `CustomerProfileModal.jsx` | Customer 360 View | Tabs `.crm-table-wrap`, address cards stack, lifetime value summary grid | FIXED | VERIFIED |
| `LeadDetailModal.jsx` | Lead Activity & Log | Call log inputs stack, follow-up scheduler, outcome dropdown, WhatsApp touch action | FIXED | VERIFIED |
| `BarcodeScanStationModal.jsx` | Fast Batch Scanning | Fullscreen mobile scan interface, manual barcode fallback, station tabs scroll | FIXED | VERIFIED |
| `BulkShippingLabelsModal.jsx` | Bulk Label Printing | Print grid layout, pagination stack, batch count selection | FIXED | VERIFIED |
| `ExcelExportModal.jsx` | Export Data Dialog | Format cards `grid-cols-1 sm:grid-cols-3`, date range options | FIXED | VERIFIED |
| `ExcelImportModal.jsx` | Import File Dialog | File dropzone, CSV column mapping preview table in `.crm-table-wrap` | FIXED | VERIFIED |
| `IndiaPostModuleModal.jsx` | Speed Post Booking | Metrics grid `grid-cols-1 sm:grid-cols-3`, consignment barcode generator | FIXED | VERIFIED |
| `PrintableInvoiceModal.jsx` | Tax Invoice (A4/Thermal) | Responsive invoice header stacking, table containment, print `@media print` | FIXED | VERIFIED |
| `PrintableShippingLabelModal.jsx` | Shipping Label (4x6) | 4x6 label preview container, barcode scaling, courier logos | FIXED | VERIFIED |
| `ShippingLabelLandscapeModal.jsx`| Landscape Shipping Label | Landscape preview with horizontal scroll preview, address wrap | FIXED | VERIFIED |
| `TPCLabelModal.jsx` | The Professional Couriers Label | Label dimensions, barcode scaling, destination branch code wrap | FIXED | VERIFIED |
