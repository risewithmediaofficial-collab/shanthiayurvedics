import React, { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { convertNumberToIndianWords } from '../../utils/numberToWords.js';

export function PrintableShippingLabelModal({ isOpen, onClose, order }) {
  const { user } = useAuth();

  useEffect(() => {
    const clearPrintMode = () => document.body.classList.remove('printing-shipping-label');
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  if (!order) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-shipping-label');
    window.print();
  };

  const patientName = (order.patientDetails?.patientName || order.customerId?.name || 'Valued Patient').toUpperCase();
  const mobile = order.patientDetails?.mobile || order.customerId?.mobile || order.deliveryAddress?.phone || '—';
  const altMobile = order.patientDetails?.alternateMobile || order.deliveryAddress?.alternatePhone || '';
  const fatherName = order.patientDetails?.fatherName ? order.patientDetails.fatherName.toUpperCase() : '';
  const addr = order.deliveryAddress || {};

  // Build full recipient address string in UPPERCASE
  const addressParts = [
    addr.street,
    addr.landmark ? `LANDMARK: ${addr.landmark}` : null,
    addr.village,
    addr.taluk,
    addr.district || addr.city,
    addr.state ? `${addr.state} - ${addr.pincode || ''}` : addr.pincode
  ].filter(Boolean);
  const formattedAddress = addressParts.join(', ').toUpperCase();

  // Weight & Pieces
  const totalPieces = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
  const orderWeight = order.weight || order.items?.reduce((sum, item) => sum + (Number(item.weight || item.productId?.weight || 0) * (Number(item.quantity) || 1)), 0) || 0;
  const weightDisplay = orderWeight >= 1000 ? `${(orderWeight / 1000).toFixed(2)} KG` : `${orderWeight || 250} G`;

  // Payment & Speed Post row
  const isCOD = (order.paymentMethod || 'COD') === 'COD';
  const isTPC = (order.courierName || '').toLowerCase().includes('professional');
  const payableAmount = Math.round(Number(
    isCOD
      ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : order.grandTotal)
      : order.grandTotal
  ) || 0);
  const amountWords = convertNumberToIndianWords(payableAmount);

  // Carrier header text
  const carrierHeaderText = isTPC
    ? `THE PROFESSIONAL COURIERS : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY [DEMO MODE]`
    : (isCOD
      ? `SPEED POST : Rs ${payableAmount} | ${amountWords} RUPEES ONLY`
      : `SPEED POST : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY`);

  const carrierSubheaderText = isTPC
    ? 'TPC EXPRESS LOGISTICS NETWORK · ORIGIN: HOSUR HUB (635109) · SURFACE TRANSIT (ST)'
    : `BILLER ID : ${order.branchId?.billerId || '1000058077'} (BOOKED AT HOSUR BPC POST - 635110)`;

  // Tracking Number / AWB Barcode
  const trackingNumber =
    order.trackingNumber ||
    order.awbNumber ||
    (isTPC
      ? `TPC${Date.now().toString().slice(-8)}`
      : `EM${order.orderNumber?.replace(/[^0-9]/g, '').slice(-9) || Date.now().toString().slice(-9)}IN`);

  // Telecaller Resolution (Refer By & Phone)
  const telecallerName = (
    order.telecallerName ||
    order.telecallerId?.name ||
    (user?.role === 'TELECALLER' ? user?.name : '') ||
    'SHANTHI AYURVEDAS'
  ).toUpperCase();

  const telecallerMobile =
    order.telecallerPhone ||
    order.telecallerId?.phone ||
    order.telecallerId?.mobile ||
    (user?.role === 'TELECALLER' ? (user?.phone || user?.mobile) : '') ||
    '';

  // Sender phone: telecaller number first, then office numbers
  const senderPhoneText = telecallerMobile
    ? `${telecallerMobile} / 8884747209 / 8884113629`
    : `8884747209 / 8884113629`;

  const billerId = order.branchId?.billerId || '1000058077';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Shipping Label (4x6) — ${order.orderNumber}`} maxWidth="max-w-2xl">
      <div className="space-y-4 font-sans p-1">
        {/* Top Print Button */}
        <div className="flex justify-center print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#4338ca] hover:bg-[#3730a3] text-white font-bold text-sm px-6 py-2 rounded-lg shadow cursor-pointer transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>

        {/* The Exact Label Template */}
        <div
          id="printable-shipping-label"
          className="border-2 border-black bg-white text-black text-xs mx-auto shadow-sm select-none"
          style={{ width: '100%', maxWidth: '560px' }}
        >
          {/* 1. Header Banner: Green Background with Logo */}
          <div className="bg-[#15803d] text-white py-2 px-3 text-center flex items-center justify-center">
            <div className="bg-white rounded-md px-4 py-1 inline-flex items-center justify-center shadow-xs">
              <img
                src="/shanthi_logo.png"
                alt="Shanthi Ayurvedas"
                className="h-8 sm:h-9 w-auto object-contain shrink-0"
              />
            </div>
          </div>

          {/* 2. Subheader Row 1: Carrier info */}
          <div className="border-b border-black px-2.5 py-1.5 font-extrabold text-[11px] sm:text-xs tracking-tight uppercase leading-snug">
            {carrierHeaderText}
          </div>

          {/* 3. Subheader Row 2: Carrier routing details */}
          <div className="border-b border-black px-2.5 py-1.5 font-extrabold text-[11px] sm:text-xs tracking-tight uppercase leading-snug">
            {carrierSubheaderText}
          </div>

          {/* 4. Two-Column Middle Grid */}
          <div className="grid grid-cols-2 divide-x divide-black min-h-[220px]">
            {/* Left Column: TO, Customer Name, Full Address, Mobile */}
            <div className="p-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="font-extrabold text-[11px] text-black uppercase tracking-wide">
                  TO
                </div>
                <div className="font-black text-sm sm:text-base text-black uppercase leading-tight">
                  {patientName}
                </div>
                {fatherName && (
                  <div className="font-bold text-[11px] text-black uppercase">
                    C/O {fatherName}
                  </div>
                )}
                <div className="font-bold text-[10.5px] sm:text-[11px] text-black uppercase leading-relaxed pt-0.5">
                  {formattedAddress}
                </div>
              </div>

              <div className="font-black text-[12px] sm:text-[13px] text-black uppercase pt-3">
                MOBILE : {mobile} {altMobile ? `/ ${altMobile}` : ''}
              </div>
            </div>

            {/* Right Column: Article Number Box & Products Table */}
            <div className="p-2.5 flex flex-col gap-2">
              {/* Dashed Article Number Box */}
              <div className="border border-dashed border-neutral-500 rounded p-1.5 text-center bg-neutral-50/50">
                <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                  ARTICLE NUMBER
                </div>
                <div className="font-mono text-sm sm:text-base font-black tracking-widest text-black mt-0.5">
                  {trackingNumber}
                </div>
              </div>

              {/* Key-Value Details Table */}
              <table className="w-full border-collapse border border-black text-[10px] sm:text-[10.5px] font-extrabold uppercase">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1 border-r border-black w-2/5 bg-neutral-50">
                      REFER BY
                    </td>
                    <td className="p-1 font-black">
                      {telecallerName}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1 border-r border-black bg-neutral-50">
                      WEIGHT
                    </td>
                    <td className="p-1 font-black">
                      {weightDisplay} {totalPieces} PCS
                    </td>
                  </tr>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((it, idx) => (
                      <tr
                        key={it._id || idx}
                        className={idx !== order.items.length - 1 ? 'border-b border-black' : ''}
                      >
                        <td className="p-1 border-r border-black bg-neutral-50">
                          PRODUCT
                        </td>
                        <td className="p-1 font-black">
                          {it.productName?.toUpperCase()} X{it.quantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-1 border-r border-black bg-neutral-50">
                        PRODUCT
                      </td>
                      <td className="p-1 font-black">
                        AYURVEDIC MEDICINE X1
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Bottom Sender Section */}
          <div className="border-t border-black p-2 font-extrabold text-[10px] sm:text-[10.5px] uppercase leading-tight space-y-0.5 bg-white">
            <div>
              FROM : SHANTHI AYURVEDAS, SHANTHI AYURVEDAS NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR
            </div>
            <div>
              MOBILE : {senderPhoneText}
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-1 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default PrintableShippingLabelModal;
