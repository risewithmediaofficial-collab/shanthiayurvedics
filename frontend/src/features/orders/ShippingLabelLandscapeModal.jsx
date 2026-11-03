import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Printer, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { convertNumberToIndianWords } from '../../utils/numberToWords.js';

// Font scales for adjusting text size on shipping labels
const FONT_SCALES = {
  compact: {
    key: 'compact',
    label: 'Compact (90%)',
    scale: 0.9,
    // Print 3-per-sheet sizing:
    nameSize: '10.5px',
    phoneSize: '9.2px',
    addrSize: '7.8px',
    trackSize: '10.5px',
    artTitleSize: '6.5px',
    codBadgeSize: '9px',
    codAmtSize: '10.5px',
    subRowSize: '8px',
    billerSubSize: '7.5px',
    bannerSize: '7.5px',
    tableLabelSize: '7.5px',
    tableValSize: '8px',
    senderSize: '7px',
    emergencySize: '6.5px',
    // Preview JSX inline font sizes:
    previewName: '10.5px',
    previewPhone: '8.8px',
    previewAddr: '7.5px',
    previewTrack: '9.5px',
    previewCod: '8.8px',
    previewCodAmt: '10.5px',
    previewTableLabel: '7.2px',
    previewTableVal: '7.8px',
    previewSub: '7.5px',
    previewSender: '7px',
    previewEmergency: '6.5px'
  },
  normal: {
    key: 'normal',
    label: 'Normal (100% Increased)',
    scale: 1.0,
    // Print 3-per-sheet sizing (Increased baseline legibility!):
    nameSize: '12px',
    phoneSize: '10.5px',
    addrSize: '8.8px',
    trackSize: '11.8px',
    artTitleSize: '7.5px',
    codBadgeSize: '10px',
    codAmtSize: '12px',
    subRowSize: '8.8px',
    billerSubSize: '8.2px',
    bannerSize: '8.5px',
    tableLabelSize: '8.2px',
    tableValSize: '8.8px',
    senderSize: '7.8px',
    emergencySize: '7.2px',
    // Preview JSX inline font sizes:
    previewName: '11.8px',
    previewPhone: '9.8px',
    previewAddr: '8.4px',
    previewTrack: '11px',
    previewCod: '9.8px',
    previewCodAmt: '12px',
    previewTableLabel: '8px',
    previewTableVal: '8.6px',
    previewSub: '8.2px',
    previewSender: '7.8px',
    previewEmergency: '7.2px'
  },
  large: {
    key: 'large',
    label: 'Large (115%)',
    scale: 1.15,
    nameSize: '13.8px',
    phoneSize: '11.8px',
    addrSize: '9.8px',
    trackSize: '13.2px',
    artTitleSize: '8.5px',
    codBadgeSize: '11px',
    codAmtSize: '13.5px',
    subRowSize: '9.8px',
    billerSubSize: '9px',
    bannerSize: '9.5px',
    tableLabelSize: '9px',
    tableValSize: '9.8px',
    senderSize: '8.8px',
    emergencySize: '8px',
    // Preview JSX inline font sizes:
    previewName: '13.2px',
    previewPhone: '10.8px',
    previewAddr: '9.4px',
    previewTrack: '12.5px',
    previewCod: '10.8px',
    previewCodAmt: '13.2px',
    previewTableLabel: '8.8px',
    previewTableVal: '9.6px',
    previewSub: '9px',
    previewSender: '8.8px',
    previewEmergency: '8px'
  },
  xlarge: {
    key: 'xlarge',
    label: 'Extra Large (130%)',
    scale: 1.3,
    nameSize: '15.5px',
    phoneSize: '13px',
    addrSize: '11px',
    trackSize: '14.8px',
    artTitleSize: '9.5px',
    codBadgeSize: '12px',
    codAmtSize: '15px',
    subRowSize: '10.8px',
    billerSubSize: '9.8px',
    bannerSize: '10.5px',
    tableLabelSize: '10px',
    tableValSize: '10.8px',
    senderSize: '9.6px',
    emergencySize: '8.8px',
    // Preview JSX inline font sizes:
    previewName: '14.8px',
    previewPhone: '12px',
    previewAddr: '10.5px',
    previewTrack: '14px',
    previewCod: '12px',
    previewCodAmt: '14.8px',
    previewTableLabel: '9.8px',
    previewTableVal: '10.6px',
    previewSub: '10px',
    previewSender: '9.6px',
    previewEmergency: '8.8px'
  }
};

// Dynamic adaptive layout helper calculating proportions, column ratios, paddings, and font sizes based on product count
const getAdaptiveLayout = (prodCount, isSingle, fontScale, addressLength = 0) => {
  const fs = FONT_SCALES[fontScale] || FONT_SCALES.normal;
  const isScaleUp = fontScale === 'large' || fontScale === 'xlarge';

  if (isSingle) {
    return {
      gridCols: '1.08fr 0.92fr',
      labelWidth: '26%',
      padTableY: '2px',
      prodFont: isScaleUp ? '10px' : '8.8px',
      labelFont: isScaleUp ? '9px' : '8.2px',
      previewProdFont: isScaleUp ? '10px' : '8.8px',
      previewLabelFont: isScaleUp ? '9px' : '8.2px',
      lineHeight: '1.15',
      artBoxPadding: '1.5px 3px',
      artTitleSize: '7.5px',
      artCodeSize: '11.8px',
      nameSize: isScaleUp ? '13px' : '12px',
      previewNameSize: isScaleUp ? '13px' : '12px',
      addrSize: addressLength > 130 ? '8px' : '8.8px',
      previewAddrSize: addressLength > 130 ? '7.8px' : '8.4px',
      phoneSize: '10.5px',
      previewPhoneSize: '9.8px',
      codBadgeSize: '10px',
      previewCodBadgeSize: '9.8px',
      codAmtSize: '12px',
      previewCodAmtSize: '12px',
      headerPad: '2px 6px',
      carrierPad: '1.5px 6px',
      subRowPad: '1.5px 6px',
      helpPad: '1.5px 5px',
      senderPad: '1.5px 6px',
      emergencyPad: '1px 4px',
      subRowSize: '8.8px',
      billerSubSize: '8.2px',
      bannerSize: '8.5px',
      senderSize: '7.8px',
      emergencySize: '7.2px',
      previewSub: '8.2px',
      previewSender: '7.8px',
      previewEmergency: '7.2px',
      articleBoxClass: 'p-0.5'
    };
  }

  // 3-per-sheet Mode: Adaptively adjust according to product count
  if (prodCount <= 2) {
    return {
      gridCols: '1.08fr 0.92fr',
      labelWidth: '26%',
      padTableY: '2px',
      prodFont: fs.tableValSize,
      labelFont: fs.tableLabelSize,
      previewProdFont: fs.previewTableVal,
      previewLabelFont: fs.previewTableLabel,
      lineHeight: '1.15',
      artBoxPadding: '1.5px 3px',
      artTitleSize: fs.artTitleSize,
      artCodeSize: fs.trackSize,
      nameSize: fs.nameSize,
      previewNameSize: fs.previewName,
      addrSize: addressLength > 130 ? '8px' : fs.addrSize,
      previewAddrSize: addressLength > 130 ? '7.8px' : fs.previewAddr,
      phoneSize: fs.phoneSize,
      previewPhoneSize: fs.previewPhone,
      codBadgeSize: fs.codBadgeSize,
      previewCodBadgeSize: fs.previewCod,
      codAmtSize: fs.codAmtSize,
      previewCodAmtSize: fs.previewCodAmt,
      headerPad: '2px 6px',
      carrierPad: '1.5px 6px',
      subRowPad: '1.5px 6px',
      helpPad: '1.5px 5px',
      senderPad: '1.5px 6px',
      emergencyPad: '1px 4px',
      subRowSize: fs.subRowSize,
      billerSubSize: fs.billerSubSize,
      bannerSize: fs.bannerSize,
      senderSize: fs.senderSize,
      emergencySize: fs.emergencySize,
      previewSub: fs.previewSub,
      previewSender: fs.previewSender,
      previewEmergency: fs.previewEmergency,
      articleBoxClass: 'p-0.5'
    };
  } else if (prodCount === 3) {
    return {
      gridCols: '1.02fr 0.98fr',
      labelWidth: '25%',
      padTableY: '1.4px',
      prodFont: fontScale === 'xlarge' ? '8.8px' : (fontScale === 'large' ? '8.4px' : '8px'),
      labelFont: '7.6px',
      previewProdFont: fontScale === 'xlarge' ? '8.6px' : (fontScale === 'large' ? '8.2px' : '7.8px'),
      previewLabelFont: '7.4px',
      lineHeight: '1.1',
      artBoxPadding: '1.2px 3px',
      artTitleSize: '7px',
      artCodeSize: fontScale === 'xlarge' ? '12px' : '11px',
      nameSize: fontScale === 'xlarge' ? '13px' : fs.nameSize,
      previewNameSize: fontScale === 'xlarge' ? '12.5px' : fs.previewName,
      addrSize: addressLength > 120 ? '7.6px' : (fontScale === 'xlarge' ? '8.8px' : fs.addrSize),
      previewAddrSize: addressLength > 120 ? '7.4px' : (fontScale === 'xlarge' ? '8.4px' : fs.previewAddr),
      phoneSize: fs.phoneSize,
      previewPhoneSize: fs.previewPhone,
      codBadgeSize: fs.codBadgeSize,
      previewCodBadgeSize: fs.previewCod,
      codAmtSize: fs.codAmtSize,
      previewCodAmtSize: fs.previewCodAmt,
      headerPad: '1.8px 6px',
      carrierPad: '1.2px 6px',
      subRowPad: '1.2px 6px',
      helpPad: '1.2px 5px',
      senderPad: '1.2px 6px',
      emergencyPad: '1px 4px',
      subRowSize: fontScale === 'xlarge' ? '9.2px' : fs.subRowSize,
      billerSubSize: fontScale === 'xlarge' ? '8.6px' : fs.billerSubSize,
      bannerSize: fontScale === 'xlarge' ? '8.8px' : fs.bannerSize,
      senderSize: fontScale === 'xlarge' ? '8.2px' : fs.senderSize,
      emergencySize: fontScale === 'xlarge' ? '7.5px' : fs.emergencySize,
      previewSub: fontScale === 'xlarge' ? '8.6px' : fs.previewSub,
      previewSender: fontScale === 'xlarge' ? '8px' : fs.previewSender,
      previewEmergency: fontScale === 'xlarge' ? '7.2px' : fs.previewEmergency,
      articleBoxClass: 'py-0.5 px-1'
    };
  } else if (prodCount === 4) {
    return {
      gridCols: '0.98fr 1.02fr',
      labelWidth: '24%',
      padTableY: '1px',
      prodFont: '7.8px',
      labelFont: '7.2px',
      previewProdFont: '7.6px',
      previewLabelFont: '7px',
      lineHeight: '1.08',
      artBoxPadding: '1px 3px',
      artTitleSize: '6.5px',
      artCodeSize: '10.5px',
      nameSize: '11.5px',
      previewNameSize: '11.2px',
      addrSize: '7.6px',
      previewAddrSize: '7.4px',
      phoneSize: '9.8px',
      previewPhoneSize: '9.5px',
      codBadgeSize: '9.5px',
      previewCodBadgeSize: '9.2px',
      codAmtSize: '11.5px',
      previewCodAmtSize: '11.2px',
      headerPad: '1.5px 6px',
      carrierPad: '1px 6px',
      subRowPad: '1px 6px',
      helpPad: '1px 5px',
      senderPad: '1px 6px',
      emergencyPad: '0.8px 4px',
      subRowSize: '8.2px',
      billerSubSize: '7.8px',
      bannerSize: '8px',
      senderSize: '7.5px',
      emergencySize: '6.8px',
      previewSub: '8px',
      previewSender: '7.4px',
      previewEmergency: '6.8px',
      articleBoxClass: 'py-0.5 px-0.5'
    };
  } else {
    // 5+ products: Ultra-compact adaptive pack
    return {
      gridCols: '0.95fr 1.05fr',
      labelWidth: '23%',
      padTableY: '0.8px',
      prodFont: '7.2px',
      labelFont: '6.6px',
      previewProdFont: '7px',
      previewLabelFont: '6.4px',
      lineHeight: '1.04',
      artBoxPadding: '0.8px 2px',
      artTitleSize: '6px',
      artCodeSize: '9.8px',
      nameSize: '11px',
      previewNameSize: '10.5px',
      addrSize: '7.2px',
      previewAddrSize: '7px',
      phoneSize: '9.2px',
      previewPhoneSize: '9px',
      codBadgeSize: '9px',
      previewCodBadgeSize: '8.8px',
      codAmtSize: '11px',
      previewCodAmtSize: '10.5px',
      headerPad: '1.2px 5px',
      carrierPad: '0.8px 5px',
      subRowPad: '0.8px 5px',
      helpPad: '0.8px 4px',
      senderPad: '0.8px 5px',
      emergencyPad: '0.8px 3px',
      subRowSize: '7.8px',
      billerSubSize: '7.4px',
      bannerSize: '7.5px',
      senderSize: '7px',
      emergencySize: '6.5px',
      previewSub: '7.5px',
      previewSender: '6.8px',
      previewEmergency: '6.4px',
      articleBoxClass: 'py-0.2 px-0.5'
    };
  }
};

export function ShippingLabelLandscapeModal({
  isOpen,
  onClose,
  orders = [],
  title = 'Shipping Labels'
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [brandStyle, setBrandStyle] = useState('LOGO'); // LOGO | SHANTHI
  const [fontScale, setFontScale] = useState('normal'); // compact | normal | large | xlarge
  const iframeRef = useRef(null);

  const safeOrders = useMemo(() => {
    if (!orders) return [];
    return Array.isArray(orders) ? orders.filter(Boolean) : [orders];
  }, [orders]);

  const isSingleOrder = safeOrders.length === 1;

  // Layout mode:
  // 'SINGLE'   -> 1 Bill per Page (Full single label format, perfect for separate orders)
  // 'BATCH_3'  -> 3 Different Customer Bills per A4 Sheet (Batch print, NO duplicates!)
  // 'COPIES_3' -> 3 Copies of the Same Order per Sheet (Fills all 3 slots with identical order)
  const [layoutMode, setLayoutMode] = useState(isSingleOrder ? 'SINGLE' : 'BATCH_3');

  // Auto-switch default layout based on order count when modal opens or orders prop updates
  useEffect(() => {
    if (safeOrders.length === 1) {
      setLayoutMode('SINGLE');
    } else {
      setLayoutMode('BATCH_3');
    }
    setCurrentPage(0);
  }, [safeOrders.length]);

  const labelsPerSheet = layoutMode === 'SINGLE' ? 1 : 3;

  // Expand orders list:
  // For 'SINGLE' or 'BATCH_3', each order is printed ONCE (no duplicates!).
  // For 'COPIES_3', each order is cloned 3 times to fill the sheet slots.
  const expandedOrders = useMemo(() => {
    if (safeOrders.length === 0) return [];
    if (layoutMode === 'COPIES_3') {
      const result = [];
      safeOrders.forEach((ord) => {
        result.push(ord);
        result.push(ord);
        result.push(ord);
      });
      return result;
    }
    return safeOrders;
  }, [safeOrders, layoutMode]);

  // Group orders into sheets:
  // In SINGLE mode: 1 order per sheet (Page 1: Order 1, Page 2: Order 2...)
  // In BATCH_3 mode: 3 DIFFERENT orders per sheet (Sheet 1: Order 1, Order 2, Order 3; Sheet 2: Order 4, Order 5, Order 6...)
  const sheets = useMemo(() => {
    if (expandedOrders.length === 0) return [];
    const count = labelsPerSheet;
    const result = [];
    for (let i = 0; i < expandedOrders.length; i += count) {
      result.push(expandedOrders.slice(i, i + count));
    }
    return result;
  }, [expandedOrders, labelsPerSheet]);

  const totalSheets = sheets.length || 1;
  const currentSheetIndex = Math.min(currentPage, totalSheets - 1);
  const currentOrdersOnSheet = sheets[currentSheetIndex] || [];

  if (!isOpen || safeOrders.length === 0) return null;

  const printDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  // Format order helper with Karnataka detection and unhidden products
  const getOrderData = (order) => {
    const pat = order.patientDetails || {};
    const addr = order.deliveryAddress || {};
    const customerName = (pat.patientName || order.customerId?.name || 'Valued Patient').toUpperCase();
    const mobile = pat.mobile || order.customerId?.mobile || addr.phone || '—';
    const altMobile = pat.alternateMobile || addr.alternatePhone || '';
    const fatherName = pat.fatherName ? pat.fatherName.toUpperCase() : '';

    // Format delivery address with smart token deduplication
    const cleanStreet = (addr.street || '').trim();
    const cleanLandmark = (addr.landmark || '').trim();
    const cleanVillage = (addr.village || '').trim();
    const cleanTaluk = (addr.taluk || '').trim();
    const cleanDistrict = (addr.district || addr.city || '').trim();
    const cleanState = (addr.state || '').trim();
    const cleanPincode = (addr.pincode || '').trim();

    const streetLower = cleanStreet.toLowerCase();
    const addressParts = [];

    if (cleanStreet) addressParts.push(cleanStreet);
    if (cleanLandmark && !streetLower.includes(cleanLandmark.toLowerCase())) {
      addressParts.push(`LANDMARK: ${cleanLandmark}`);
    }
    if (cleanVillage && !streetLower.includes(cleanVillage.toLowerCase())) {
      addressParts.push(cleanVillage);
    }
    if (cleanTaluk && !streetLower.includes(cleanTaluk.toLowerCase())) {
      addressParts.push(cleanTaluk);
    }
    if (cleanDistrict && !streetLower.includes(cleanDistrict.toLowerCase())) {
      addressParts.push(cleanDistrict);
    }

    const stateWithPin = cleanState && cleanPincode
      ? (!streetLower.includes(cleanPincode.toLowerCase()) ? `${cleanState} - ${cleanPincode}` : cleanState)
      : (cleanState || cleanPincode);

    if (stateWithPin && !streetLower.includes(stateWithPin.toLowerCase())) {
      addressParts.push(stateWithPin);
    } else if (cleanPincode && !addressParts.some(p => p.includes(cleanPincode))) {
      addressParts.push(cleanPincode);
    }

    const formattedAddress = addressParts
      .join(', ')
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    // Language & Circle detection based on delivery state / pincode
    const stateNorm = (addr.state || '').toLowerCase();
    const destPincode = (addr.pincode || '').trim();
    const isTamilNadu = stateNorm.includes('tamil');
    const isKarnataka = stateNorm.includes('karnataka') || /^(56|57|58|59)/.test(destPincode);

    let helpBannerText;
    if (isTamilNadu) {
      helpBannerText = `உதவி (பயன்படுத்துவது எப்படி & பிரச்சனைகள்)`;
    } else if (isKarnataka) {
      helpBannerText = `Help/ಸಹಾಯ (How to use & Problems/ಬಳಸುವ ವಿಧಾನ ಮತ್ತು ಸಮಸ್ಯೆ)`;
    } else {
      helpBannerText = `Help (How to use & Problems/Contact us)`;
    }

    // Courier Detection (India Post vs TPC vs other private couriers)
    const courierRaw = (order.courierName || '').toLowerCase().trim();
    const isTPC = courierRaw.includes('professional') || courierRaw === 'tpc' || courierRaw.startsWith('tpc') || courierRaw.includes('the professional');
    const isOtherCourier = !isTPC && Boolean(courierRaw && !courierRaw.includes('post') && !courierRaw.includes('india'));
    const isIndiaPost = !isTPC && !isOtherCourier;

    const isCOD = (order.paymentMethod || 'COD') === 'COD';
    const advanceAmount = Number(order.advanceAmount || 0);
    const advanceUtr = order.advanceUtr || '';
    const payableAmount = Math.round(Number(
      isCOD
        ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : Math.max(0, (order.grandTotal || 0) - advanceAmount))
        : order.grandTotal
    ) || 0);
    const amountWords = convertNumberToIndianWords(payableAmount);

    // 1. Top Carrier Line (Line 2):
    // For TPC: "THE PROFESSIONAL COURIERS (TPC) · PREPAID (Rs ...) | ... RUPEES ONLY"
    // For Other: "<COURIER> · PREPAID (Rs ...) | ... RUPEES ONLY"
    // For India Post: "SPEED POST : Rs ... | ... RUPEES ONLY"
    let carrierBannerText;
    if (isTPC) {
      carrierBannerText = `THE PROFESSIONAL COURIERS (TPC) · ${isCOD ? `COD : Rs ${payableAmount}` : `PREPAID (Rs ${payableAmount})`} | ${amountWords} RUPEES ONLY`;
    } else if (isOtherCourier) {
      carrierBannerText = `${(order.courierName || 'EXPRESS COURIER').toUpperCase()} · ${isCOD ? `COD : Rs ${payableAmount}` : `PREPAID (Rs ${payableAmount})`} | ${amountWords} RUPEES ONLY`;
    } else {
      carrierBannerText = isCOD
        ? `SPEED POST : Rs ${payableAmount} | ${amountWords} RUPEES ONLY`
        : `SPEED POST : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY`;
    }
    const speedPostText = carrierBannerText;

    // Tracking / Consignment Docket Number
    const cleanOrderNum = order.orderNumber?.replace(/[^0-9]/g, '').slice(-9) || Date.now().toString().slice(-9);
    const trackingTitle = isTPC
      ? 'TPC CONSIGNMENT NUMBER'
      : (isOtherCourier ? 'CONSIGNMENT / DOCKET NUMBER' : 'ARTICLE NUMBER');
    const tracking = order.trackingNumber || order.awbNumber || (
      isTPC
        ? `TPC${cleanOrderNum}`
        : (isOtherCourier ? `CR${cleanOrderNum}` : `EM${cleanOrderNum}IN`)
    );
    
    // Dynamic Branch Sender & Return / From Address
    const branch = typeof order.branchId === 'object' && order.branchId ? order.branchId : {};
    const pickup = branch.postalPickupDetails || {};
    const knPickup = branch.karnatakaPostalDetails || {};
    const branchAddr = branch.address || {};

    const senderTitle = (pickup.senderName || 'SHANTHI AYURVEDAS').toUpperCase();
    const senderCity = (isKarnataka ? (knPickup.city || 'BENGALURU') : (pickup.city || branchAddr.city || 'HOSUR')).toUpperCase();
    const senderPincode = (isKarnataka ? (knPickup.pincode || '562106') : (pickup.pincode || branchAddr.pincode || '635110')).trim();
    const knPoNumber = (knPickup.postOfficeNumber || branch.karnatakaPostOfficeNumber || knPickup.phone || '').trim();

    // Return address:
    // Karnataka orders/pincodes:
    //   Shanthi Ayurvedas, 156,srr exbhuria,Anekal, Bengaluru district. 562106
    // Tamil Nadu & other orders:
    //   Shanthi Ayurvedas, No15, Jaypee gateway, anthivadi, hosur. 635110
    let fromAddressText;
    if (isKarnataka) {
      fromAddressText = `FROM : ${senderTitle}, 156, SRR EXBHURIA, ANEKAL, BENGALURU DISTRICT - 562106`;
    } else {
      fromAddressText = `FROM : ${senderTitle}, NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR - 635110`;
    }

    // Contact Numbers:
    // "8884747209/8884113629 and before this contat numbers 1st should be telecaller or who order placing their contact number should be"
    const orderPlacerPhone = String(
      order.assignedTo?.phone ||
      order.telecallerPhone ||
      order.createdBy?.phone ||
      order.assignedToPhone ||
      ''
    ).replace(/^\+91\s*/, '').replace(/[^0-9]/g, '').trim();

    let senderMobileText;
    if (orderPlacerPhone && orderPlacerPhone !== '8884747209' && orderPlacerPhone !== '8884113629') {
      senderMobileText = `MOBILE : ${orderPlacerPhone} / 8884747209 / 8884113629`;
    } else {
      senderMobileText = `MOBILE : 8884747209 / 8884113629`;
    }

    // 2. Subheader (Line 3):
    // For TPC: NO Speed Post Biller ID and NO Post Office booking details!
    let billerId = branch.billerId || '1000058077';
    let bookingLocation = '';
    let carrierSubheaderText;
    const knPincodeVal = (knPickup.pincode || '560001').trim();

    if (isTPC) {
      carrierSubheaderText = `THE PROFESSIONAL COURIERS · EXPRESS PARCEL & CARGO LOGISTICS · DISPATCH HUB: ${senderCity}`;
    } else if (isOtherCourier) {
      carrierSubheaderText = `${(order.courierName || 'EXPRESS COURIER').toUpperCase()} LOGISTICS NETWORK · DISPATCH HUB: ${senderCity}`;
    } else if (isKarnataka) {
      billerId = knPickup.billerId || branch.karnatakaBillerId || '1000054429';
      const knRawOffice = (knPickup.bookingOffice || `BENGALURU BPC POST - ${knPincodeVal}`).toUpperCase();
      bookingLocation = knRawOffice.includes(knPincodeVal) ? knRawOffice : `${knRawOffice} - ${knPincodeVal}`;
      const poNumTag = knPoNumber ? ` · PO NO: ${knPoNumber}` : '';
      const postalCodeTag = ` · POSTAL CODE: ${knPincodeVal}`;
      carrierSubheaderText = `BILLER ID : ${billerId} (BOOKED AT ${bookingLocation}${poNumTag}${postalCodeTag})`;
    } else {
      billerId = branch.billerId || '1000058077';
      bookingLocation = (
        pickup.bookingOffice ||
        (senderCity ? `${senderCity} BPC POST - ${senderPincode}` : 'HOSUR BPC POST - 635110')
      ).toUpperCase();
      carrierSubheaderText = `BILLER ID : ${billerId} (BOOKED AT ${bookingLocation})`;
    }

    const totalPieces = order.items?.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) || 1;
    const orderWeight = order.weight || order.items?.reduce((sum, item) => sum + (Number(item.weight || item.productId?.weight || 0) * (Number(item.quantity) || 1)), 0) || 0;
    const weightText = orderWeight > 0 ? (orderWeight >= 1000 ? `${(orderWeight / 1000).toFixed(2)} KG` : `${orderWeight} G`) : '1.06 KG';

    const telecallerName = (order.assignedTo?.name || order.telecallerName || 'SHANTHI CLINIC').toUpperCase();
    const telecallerMobile = order.assignedTo?.phone || order.telecallerPhone || '8925744369';

    // Show ALL products - consolidate duplicates by summing quantity, preserving every unique product
    const productMap = new Map();
    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((it) => {
        const rawName = (it.productName || it.productId?.name || 'AYURVEDIC MEDICINE').trim().toUpperCase();
        const qty = Number(it.quantity) || 1;
        if (productMap.has(rawName)) {
          productMap.set(rawName, productMap.get(rawName) + qty);
        } else {
          productMap.set(rawName, qty);
        }
      });
    }
    const products = productMap.size > 0
      ? Array.from(productMap.entries()).map(([name, qty]) => ({ name, qty }))
      : [{ name: 'AYURVEDIC MEDICINE', qty: 1 }];

    return {
      order,
      customerName,
      mobile,
      altMobile,
      fatherName,
      formattedAddress,
      isCOD,
      payableAmount,
      speedPostText,
      carrierBannerText,
      trackingTitle,
      tracking,
      carrierSubheaderText,
      fromAddressText,
      senderMobileText,
      billerId,
      bookingLocation,
      totalPieces,
      weightText,
      telecallerName,
      telecallerMobile,
      advanceAmount,
      advanceUtr,
      products,
      helpBannerText,
      isKarnataka,
      isTPC,
      isOtherCourier,
      isIndiaPost,
      knPincode: knPincodeVal,
      knPostOfficeNumber: knPoNumber
    };
  };

  // Generate printable standalone HTML
  const generatePrintHtml = () => {
    const fs = FONT_SCALES[fontScale] || FONT_SCALES.normal;
    const isSingle = layoutMode === 'SINGLE';

    const renderedSheets = sheets.map((sheetOrders, sIdx) => {
      const sheetNum = sIdx + 1;
      const sheetItems = [];

      sheetOrders.forEach((ord, lIdx) => {
        const overallLabelNum = isSingle ? sheetNum : (sIdx * 3) + lIdx + 1;
        const d = getOrderData(ord);

        const brandHeaderHtml = brandStyle === 'SHANTHI'
          ? `<div style="font-size: ${isSingle ? '15px' : '13px'}; font-weight: 900; letter-spacing: 0.5px; color: #fff; text-transform: uppercase;">SHANTHI AYURVEDAS</div>`
          : `<div style="background: #ffffff; border-radius: 3px; padding: 1.5px 6px; display: inline-flex; align-items: center; justify-content: center;"><img src="/shanthi_logo.png" style="height: ${isSingle ? '24px' : '20px'}; width: auto; object-fit: contain;" /></div>`;

        // Dynamic adaptive sizing based on product count
        const adaptive = getAdaptiveLayout(d.products.length, isSingle, fontScale, d.formattedAddress?.length || 0);

        const productRowsHtml = d.products.map((prod, idx) => `
          <tr style="border-bottom: ${idx !== d.products.length - 1 ? '1px solid #000' : 'none'};">
            <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; background: #f9fafb; font-weight: 800; font-size: ${adaptive.labelFont}; white-space: nowrap;">PRODUCT</td>
            <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; word-break: break-word; overflow-wrap: break-word; white-space: normal;">${prod.name} X${prod.qty}</td>
          </tr>
        `).join('');

        // Cutting guide between labels in 3-per-sheet mode
        if (!isSingle && lIdx > 0) {
          sheetItems.push(`
            <div class="cut-guide">
              <span class="cut-scissor">✂</span>
              <span class="cut-dash"></span>
              <span class="cut-text">CUT HERE · ಇಲ್ಲಿ ಕತ್ತರಿಸಿ</span>
              <span class="cut-dash"></span>
              <span class="cut-scissor cut-flip">✂</span>
            </div>
          `);
        }

        const boxClass = isSingle ? 'label-box single-mode' : 'label-box batch-mode';

        sheetItems.push(`
          <div class="${boxClass}">
            <!-- 1. Header Banner -->
            <div class="label-header" style="padding: ${adaptive.headerPad};">
              <div style="width: 40px;"></div>
              <div style="text-align: center;">
                ${brandHeaderHtml}
              </div>
              <div class="sheet-meta">
                <div style="font-weight: 800;">SHEET ${sheetNum} / ${totalSheets} | BILL ${overallLabelNum}</div>
                <div>${printDateFormatted}</div>
              </div>
            </div>

            <!-- 2. SPEED POST row -->
            <div class="sub-row" style="font-size: ${adaptive.subRowSize}; padding: ${adaptive.carrierPad};">
              ${d.speedPostText}
            </div>

            <!-- 3. BILLER ID row -->
            <div class="sub-row" style="font-size: ${adaptive.billerSubSize}; padding: ${adaptive.subRowPad};">
              ${d.carrierSubheaderText}
            </div>

            <!-- 4. Language-aware Help Banner -->
            <div class="help-banner" style="font-size: ${adaptive.bannerSize}; padding: ${adaptive.helpPad};">
              ${d.helpBannerText}: ${d.telecallerName} - ${d.telecallerMobile}
            </div>

            <!-- 5. Two-Column Grid -->
            <div class="main-grid" style="grid-template-columns: ${adaptive.gridCols};">
              <!-- Left Column: Recipient Details -->
              <div class="col-left">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 4px; margin-bottom: 2px;">
                  <div class="cust-name" style="font-size: ${adaptive.nameSize};">${d.customerName}</div>
                  <div class="cod-badge" style="font-size: ${adaptive.codBadgeSize};">
                    ${d.isCOD ? `COD <strong style="font-size: ${adaptive.codAmtSize};">₹${d.payableAmount}</strong>` : `PREPAID`}
                  </div>
                </div>
                <div class="cust-phone" style="font-size: ${adaptive.phoneSize};">
                  <span style="font-size: ${isSingle ? '12px' : '10px'};">📞</span> ${d.mobile} ${d.altMobile ? `/ ${d.altMobile}` : ''}
                </div>
                ${d.fatherName ? `<div style="font-size: ${isSingle ? '9.5px' : '7.5px'}; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">C/O ${d.fatherName}</div>` : ''}
                <div class="cust-address" style="font-size: ${adaptive.addrSize};">${d.formattedAddress}</div>
              </div>

              <!-- Right Column: Tracking & Table -->
              <div class="col-right">
                <div class="article-box" style="padding: ${adaptive.artBoxPadding};">
                  <div class="art-title" style="font-size: ${adaptive.artTitleSize};">${d.trackingTitle}</div>
                  <div class="art-code" style="font-size: ${adaptive.artCodeSize};">${d.tracking}</div>
                </div>

                <table class="details-table">
                  <tbody>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; background: #f9fafb; font-weight: 800; font-size: ${adaptive.labelFont}; white-space: nowrap;">REFER BY</td>
                      <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; word-break: break-word; overflow-wrap: break-word;">${d.telecallerName}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #000;">
                      <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; background: #f9fafb; font-weight: 800; font-size: ${adaptive.labelFont}; white-space: nowrap;">WEIGHT</td>
                      <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; word-break: break-word; overflow-wrap: break-word;">${d.weightText} ${d.totalPieces} PCS</td>
                    </tr>
                    ${d.isTPC ? `
                      <tr style="border-bottom: 1px solid #000; background: #eff6ff;">
                        <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; font-weight: 800; font-size: ${adaptive.labelFont}; color: #1e40af; white-space: nowrap;">COURIER</td>
                        <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; color: #1e40af; word-break: break-word; overflow-wrap: break-word;">TPC EXPRESS LOGISTICS</td>
                      </tr>
                    ` : (d.isOtherCourier ? `
                      <tr style="border-bottom: 1px solid #000; background: #eff6ff;">
                        <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; font-weight: 800; font-size: ${adaptive.labelFont}; color: #1e40af; white-space: nowrap;">COURIER</td>
                        <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; color: #1e40af; word-break: break-word; overflow-wrap: break-word;">${(d.order.courierName || 'COURIER').toUpperCase()}</td>
                      </tr>
                    ` : (d.isIndiaPost && d.isKarnataka ? `
                      <tr style="border-bottom: 1px solid #000; background: #eff6ff;">
                        <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; font-weight: 800; font-size: ${adaptive.labelFont}; color: #1e40af; white-space: nowrap;">POSTAL CODE</td>
                        <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; color: #1e40af; word-break: break-word; overflow-wrap: break-word;">${d.knPincode} (BILLER: ${d.billerId})</td>
                      </tr>
                    ` : ''))}
                    ${d.advanceAmount > 0 ? `
                      <tr style="border-bottom: 1px solid #000; background: #f0fdf4;">
                        <td style="padding: ${adaptive.padTableY} 4px; border-right: 1px solid #000; width: ${adaptive.labelWidth}; font-weight: 800; font-size: ${adaptive.labelFont}; color: #166534; white-space: nowrap;">ADVANCE</td>
                        <td style="padding: ${adaptive.padTableY} 5px; font-weight: 900; font-size: ${adaptive.prodFont}; line-height: ${adaptive.lineHeight}; color: #166534; word-break: break-word; overflow-wrap: break-word;">₹${d.advanceAmount} ${d.advanceUtr ? `· ${d.advanceUtr}` : ''}</td>
                      </tr>
                    ` : ''}
                    ${productRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 6. Sender Details -->
            <div class="footer-sender" style="font-size: ${adaptive.senderSize}; padding: ${adaptive.senderPad};">
              <div>${d.fromAddressText}</div>
              <div>${d.senderMobileText}</div>
            </div>

            <!-- 7. Emergency Medicine Banner -->
            <div class="emergency-banner" style="font-size: ${adaptive.emergencySize}; padding: ${adaptive.emergencyPad};">
              EMERGENCY MEDICINE - HANDLE WITH CARE AND DELIVERY IMMEDIATELY
            </div>
          </div>
        `);
      });

      // Cut guide on batch sheet if fewer than 3 labels
      if (!isSingle && sheetOrders.length < 3) {
        sheetItems.push(`
          <div class="cut-guide">
            <span class="cut-scissor">✂</span>
            <span class="cut-dash"></span>
            <span class="cut-text">CUT HERE · ಇಲ್ಲಿ ಕತ್ತರಿಸಿ</span>
            <span class="cut-dash"></span>
            <span class="cut-scissor cut-flip">✂</span>
          </div>
        `);
      }

      const pageClass = isSingle ? 'sheet-page single-mode' : 'sheet-page batch-mode';

      return `
        <div class="${pageClass}">
          <div class="labels-container-3">
            ${sheetItems.join('')}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shipping Bills (${expandedOrders.length}) — Shanthi Ayurvedas</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            size: A4 portrait;
            margin: ${isSingle ? '8mm 8mm' : '5mm 6mm'};
          }
          html, body {
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #000;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet-page {
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            overflow: hidden;
            margin: 0 auto;
            width: 196mm;
          }
          .sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .sheet-page.batch-mode {
            height: auto;
            max-height: 287mm;
          }
          .sheet-page.single-mode {
            height: auto;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 5mm;
          }

          .labels-container-3 {
            display: flex;
            flex-direction: column;
            width: 100%;
          }

          .label-box {
            border: 1.5px solid #000;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            background: #fff;
            overflow: hidden;
            color: #000;
            line-height: 1.15;
            width: 196mm;
            height: auto;
          }
          .label-box.batch-mode {
            width: 196mm;
            height: auto;
            max-height: 90mm;
          }
          .label-box.single-mode {
            width: 196mm;
            height: auto;
            border: 1.5px solid #000;
          }

          .cut-guide {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 196mm;
            height: 3.5mm;
            margin: 1mm 0;
            color: #6b7280;
            font-size: 7.5px;
            font-family: monospace;
          }
          .cut-dash {
            flex: 1;
            border-top: 1px dashed #9ca3af;
            height: 0;
          }
          .cut-text {
            font-weight: 800;
            letter-spacing: 0.5px;
            font-size: 7.5px;
          }
          .cut-scissor {
            font-size: 9px;
            color: #4b5563;
          }
          .cut-flip {
            transform: scaleX(-1);
            display: inline-block;
          }

          .label-header {
            background-color: #362115 !important;
            color: #fff !important;
            padding: ${isSingle ? '3px 8px' : '2px 6px'};
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .sheet-meta {
            text-align: right;
            font-family: monospace;
            font-size: ${isSingle ? '8.5px' : '7.5px'};
            line-height: 1.15;
            color: #f3f4f6;
          }
          .sub-row {
            border-bottom: 1px solid #000;
            padding: ${isSingle ? '2.5px 8px' : '1.5px 6px'};
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.15;
            background: #fff;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .help-banner {
            background-color: #166534 !important;
            color: #ffffff !important;
            text-align: center;
            padding: ${isSingle ? '2.5px 8px' : '1.5px 5px'};
            font-weight: 800;
            border-bottom: 1px solid #000;
            letter-spacing: 0.1px;
            line-height: 1.15;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .main-grid {
            display: grid;
            border-bottom: 1px solid #000;
            height: auto;
          }
          .col-left {
            border-right: 1px solid #000;
            padding: ${isSingle ? '3.5px 8px' : '2.5px 6px'};
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            min-width: 0;
          }
          .cust-name {
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1px;
            line-height: 1.1;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .cod-badge {
            border: 1.2px solid #dc2626;
            color: #dc2626;
            font-weight: 900;
            padding: ${isSingle ? '1px 5px' : '0.5px 3.5px'};
            border-radius: 2px;
            white-space: nowrap;
          }
          .cust-phone {
            font-weight: 900;
            color: #000;
            margin: 1px 0;
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
          }
          .cust-address {
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.15;
            color: #111;
            word-break: break-word;
            overflow-wrap: break-word;
            margin-top: 1px;
          }
          .col-right {
            padding: ${isSingle ? '3px 8px' : '2px 5px'};
            display: flex;
            flex-direction: column;
            gap: 2px;
            justify-content: flex-start;
            min-width: 0;
          }
          .article-box {
            border: 1px dashed #737373;
            padding: ${isSingle ? '2px 4px' : '1.5px 3px'};
            text-align: center;
            background: #fafafa;
          }
          .art-title {
            font-weight: 800;
            text-transform: uppercase;
            color: #525252;
          }
          .art-code {
            font-family: monospace;
            font-weight: 900;
            letter-spacing: 0.8px;
            margin-top: 0.5px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            font-weight: 800;
            text-transform: uppercase;
            table-layout: fixed;
          }
          }
          .footer-sender {
            padding: ${isSingle ? '2.5px 8px' : '1.5px 6px'};
            font-size: ${isSingle ? '9px' : fs.senderSize};
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.15;
            background: #fff;
          }
          .emergency-banner {
            background-color: #dc2626 !important;
            color: #ffffff !important;
            text-align: center;
            padding: ${isSingle ? '2px 6px' : '1px 4px'};
            font-size: ${isSingle ? '8.5px' : fs.emergencySize};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            line-height: 1.15;
          }
        </style>
      </head>
      <body>
        ${renderedSheets}
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const fullHtml = generatePrintHtml();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    } else if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      }, 500);
    }
  };

  // Helper to adjust font scale via buttons
  const stepFontScale = (delta) => {
    const keys = ['compact', 'normal', 'large', 'xlarge'];
    const currIdx = keys.indexOf(fontScale);
    const nextIdx = Math.max(0, Math.min(keys.length - 1, currIdx + delta));
    setFontScale(keys[nextIdx]);
  };

  const fs = FONT_SCALES[fontScale] || FONT_SCALES.normal;
  const isSingle = layoutMode === 'SINGLE';

  // Render Label Card for preview (shared between Single and 3-per-sheet modes)
  const renderLabelCard = (ord, labelNumber, isSingleCard = false) => {
    const d = getOrderData(ord);
    const adaptive = getAdaptiveLayout(d.products.length, isSingleCard, fontScale, d.formattedAddress?.length || 0);

    return (
      <div className="w-full border-[1.5px] border-black bg-white flex flex-col justify-start text-xs shadow-2xs">
        {/* 1. Header Banner */}
        <div
          className="bg-[#362115] text-white px-2.5 flex items-center justify-between shrink-0"
          style={{ padding: adaptive.headerPad }}
        >
          <div className="w-6"></div>
          <div className="text-center">
            {brandStyle === 'SHANTHI' ? (
              <div className={`font-black tracking-wider text-white uppercase ${isSingleCard ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'}`}>
                SHANTHI AYURVEDAS
              </div>
            ) : (
              <div className="bg-white rounded px-1.5 py-0.2 inline-flex items-center justify-center">
                <img src="/shanthi_logo.png" alt="Shanthi Ayurvedas" className={`${isSingleCard ? 'h-5 sm:h-6' : 'h-3.5 sm:h-4'} w-auto object-contain`} />
              </div>
            )}
          </div>
          <div className="text-right text-[6.5px] sm:text-[7.5px] font-mono leading-tight text-stone-200">
            <div className="font-bold">SHEET {currentSheetIndex + 1}/{totalSheets} | BILL {labelNumber}</div>
            <div>{printDateFormatted}</div>
          </div>
        </div>

        {/* 2. SPEED POST row */}
        <div
          className="border-b border-black font-black uppercase leading-tight bg-white shrink-0 break-words"
          style={{ fontSize: adaptive.subRowSize, padding: adaptive.carrierPad }}
        >
          {d.speedPostText}
        </div>

        {/* 3. BILLER ID row */}
        <div
          className="border-b border-black font-bold uppercase leading-tight bg-white shrink-0 break-words"
          style={{ fontSize: adaptive.billerSubSize, padding: adaptive.subRowPad }}
        >
          {d.carrierSubheaderText}
        </div>

        {/* 4. Language-aware Help Banner */}
        <div
          className="bg-[#166534] text-white text-center font-bold border-b border-black leading-tight shrink-0 break-words"
          style={{ fontSize: adaptive.bannerSize, padding: adaptive.helpPad }}
        >
          {d.helpBannerText}: {d.telecallerName} - {d.telecallerMobile}
        </div>

        {/* 5. Middle Two-Column Grid */}
        <div
          className="grid divide-x divide-black border-b border-black bg-white"
          style={{ gridTemplateColumns: adaptive.gridCols }}
        >
          {/* Left Column: Customer details */}
          <div className="p-1.5 flex flex-col justify-start min-w-0">
            <div>
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div
                  className="font-black uppercase leading-tight text-black break-words"
                  style={{ fontSize: adaptive.previewNameSize }}
                >
                  {d.customerName}
                </div>
                <div
                  className="border border-red-600 text-red-600 font-black px-1.5 py-0.2 rounded-xs shrink-0 whitespace-nowrap"
                  style={{ fontSize: adaptive.previewCodBadgeSize }}
                >
                  {d.isCOD ? <><span>COD </span><strong style={{ fontWeight: '900', fontSize: adaptive.previewCodAmtSize }}>₹{d.payableAmount}</strong></> : 'PREPAID'}
                </div>
              </div>
              <div
                className="font-black text-black flex items-center gap-1 my-0.5 whitespace-nowrap"
                style={{ fontSize: adaptive.previewPhoneSize }}
              >
                <span className="text-purple-700">📞</span> {d.mobile} {d.altMobile ? `/ ${d.altMobile}` : ''}
              </div>
              {d.fatherName && (
                <div
                  className="font-bold text-neutral-800 uppercase mb-0.5 break-words"
                  style={{ fontSize: isSingleCard ? '9.5px' : '7.5px' }}
                >
                  C/O {d.fatherName}
                </div>
              )}
              <div
                className="font-bold uppercase leading-tight text-neutral-900 break-words mt-0.5"
                style={{ fontSize: adaptive.previewAddrSize, lineHeight: 1.15 }}
              >
                {d.formattedAddress}
              </div>
            </div>
          </div>

          {/* Right Column: Tracking Box & Table */}
          <div className="p-1 flex flex-col gap-0.5 justify-start min-w-0">
            <div
              className={`border border-dashed border-neutral-400 text-center bg-neutral-50 rounded-xs ${adaptive.articleBoxClass}`}
              style={{ padding: adaptive.artBoxPadding }}
            >
              <div
                className="font-bold text-neutral-500 uppercase tracking-wider"
                style={{ fontSize: adaptive.artTitleSize }}
              >
                {d.trackingTitle}
              </div>
              <div
                className="font-mono font-black tracking-wider text-black"
                style={{ fontSize: adaptive.artCodeSize }}
              >
                {d.tracking}
              </div>
            </div>

            <table
              className="w-full border-collapse border border-black font-bold uppercase table-fixed"
            >
              <tbody>
                <tr className="border-b border-black">
                  <td
                    className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap`}
                    style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                  >
                    REFER BY
                  </td>
                  <td
                    className={`px-1.5 ${adaptive.tablePadClass} font-black text-black break-words leading-tight`}
                    style={{ fontSize: adaptive.previewProdFont }}
                  >
                    {d.telecallerName}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td
                    className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap`}
                    style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                  >
                    WEIGHT
                  </td>
                  <td
                    className={`px-1.5 ${adaptive.tablePadClass} font-black text-black break-words leading-tight`}
                    style={{ fontSize: adaptive.previewProdFont }}
                  >
                    {d.weightText} {d.totalPieces} PCS
                  </td>
                </tr>
                {d.isTPC ? (
                  <tr className="border-b border-black bg-blue-50/70">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black font-bold text-blue-900 whitespace-nowrap`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      COURIER
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-blue-900 break-words leading-tight`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      TPC EXPRESS LOGISTICS
                    </td>
                  </tr>
                ) : d.isOtherCourier ? (
                  <tr className="border-b border-black bg-blue-50/70">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black font-bold text-blue-900 whitespace-nowrap`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      COURIER
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-blue-900 break-words leading-tight`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      {(d.order.courierName || 'COURIER').toUpperCase()}
                    </td>
                  </tr>
                ) : (d.isIndiaPost && d.isKarnataka) ? (
                  <tr className="border-b border-black bg-blue-50/70">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black font-bold text-blue-900 whitespace-nowrap`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      POSTAL CODE
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-blue-900 break-words leading-tight`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      {d.knPincode} (BILLER: {d.billerId})
                    </td>
                  </tr>
                ) : null}
                {d.advanceAmount > 0 && (
                  <tr className="border-b border-black bg-emerald-50/60">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black font-bold text-emerald-800 whitespace-nowrap`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      ADVANCE
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-emerald-800 break-words leading-tight`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      ₹{d.advanceAmount} {d.advanceUtr ? `· ${d.advanceUtr}` : ''}
                    </td>
                  </tr>
                )}
                {/* Render ALL products without hiding any */}
                {d.products.map((prod, pIdx) => (
                  <tr key={pIdx} className={pIdx !== d.products.length - 1 ? 'border-b border-black' : ''}>
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      PRODUCT
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-black leading-tight break-words whitespace-normal`}
                      style={{ fontSize: adaptive.previewProdFont, lineHeight: adaptive.lineHeight }}
                    >
                      {prod.name} X{prod.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Sender Bottom Details */}
        <div
          className="px-2 font-bold uppercase leading-tight bg-white text-black shrink-0 break-words"
          style={{ fontSize: adaptive.previewSender, padding: adaptive.senderPad }}
        >
          <div>{d.fromAddressText}</div>
          <div>{d.senderMobileText}</div>
        </div>

        {/* 7. Bottom Emergency Medicine Banner */}
        <div
          className="bg-[#dc2626] text-white text-center font-black uppercase tracking-wider shrink-0"
          style={{ fontSize: adaptive.previewEmergency, padding: adaptive.emergencyPad }}
        >
          EMERGENCY MEDICINE - HANDLE WITH CARE AND DELIVERY IMMEDIATELY
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh] h-[92vh]">
        {/* Top Purple Toolbar */}
        <div className="bg-[#4a154b] text-white px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-purple-800 shrink-0">
          {/* Sheet counter info */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm tracking-wide text-purple-100">
              Sheet {currentSheetIndex + 1} of {totalSheets} ({expandedOrders.length} {expandedOrders.length === 1 ? 'bill' : 'bills'})
            </span>
          </div>

          {/* Controls: Layout Selector & Text Size Adjuster & Header Style & Navigation */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
            {/* Layout Mode Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-purple-200 font-medium hidden md:inline">Layout:</span>
              <select
                value={layoutMode}
                onChange={(e) => {
                  setLayoutMode(e.target.value);
                  setCurrentPage(0);
                }}
                className="bg-purple-950/90 text-white font-bold text-xs px-2.5 py-1 rounded border border-purple-400/40 focus:outline-none cursor-pointer"
                title="Select shipping bill layout mode"
              >
                <option value="BATCH_3">3 Different Bills / Sheet (Batch)</option>
                <option value="SINGLE">1 Bill / Page (Full Single Label)</option>
                <option value="COPIES_3">3 Copies of Same Bill / Sheet</option>
              </select>
            </div>

            {/* Text Size Scale Adjuster */}
            <div className="flex items-center gap-1 bg-purple-950/80 px-2 py-1 rounded border border-purple-400/40">
              <span className="text-purple-200 font-medium hidden sm:inline text-xs">Text:</span>
              <button
                type="button"
                title="Decrease Font Size (A-)"
                onClick={() => stepFontScale(-1)}
                disabled={fontScale === 'compact'}
                className="w-5 h-5 rounded bg-purple-900/90 hover:bg-purple-800 disabled:opacity-30 text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
              >
                A-
              </button>
              <select
                value={fontScale}
                onChange={(e) => setFontScale(e.target.value)}
                className="bg-purple-950 text-white font-bold text-xs px-1 py-0.5 rounded border-none focus:outline-none cursor-pointer"
                title="Adjust label text size"
              >
                <option value="compact">Compact (90%)</option>
                <option value="normal">Normal (100%)</option>
                <option value="large">Large (115%)</option>
                <option value="xlarge">Extra Large (130%)</option>
              </select>
              <button
                type="button"
                title="Increase Font Size (A+)"
                onClick={() => stepFontScale(1)}
                disabled={fontScale === 'xlarge'}
                className="w-5 h-5 rounded bg-purple-900/90 hover:bg-purple-800 disabled:opacity-30 text-white font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
              >
                A+
              </button>
            </div>

            {/* Header Brand Selector */}
            <div className="flex items-center gap-1.5 hidden lg:flex">
              <span className="text-purple-200 font-medium">Header:</span>
              <select
                value={brandStyle}
                onChange={(e) => setBrandStyle(e.target.value)}
                className="bg-purple-950/80 text-white font-bold text-xs px-2 py-1 rounded border border-purple-400/40 focus:outline-none cursor-pointer"
              >
                <option value="LOGO">Shanthi Logo</option>
                <option value="SHANTHI">Shanthi Text</option>
              </select>
            </div>

            {/* Sheet Pagination */}
            <div className="flex items-center gap-1 bg-purple-950/60 p-0.5 rounded border border-purple-400/30">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentSheetIndex === 0}
                className="px-2 py-0.5 rounded text-xs font-semibold text-purple-200 hover:text-white disabled:opacity-30 disabled:hover:text-purple-200 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-1.5 text-[11px] text-purple-300 font-mono">
                {currentSheetIndex + 1}/{totalSheets}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalSheets - 1, p + 1))}
                disabled={currentSheetIndex >= totalSheets - 1}
                className="px-2 py-0.5 rounded text-xs font-semibold text-purple-200 hover:text-white disabled:opacity-30 disabled:hover:text-purple-200 transition-colors cursor-pointer flex items-center gap-0.5"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Green Print All & Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer transition-all transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print All</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-purple-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gray Preview Canvas Area */}
        <div className="flex-1 bg-slate-300 p-2 sm:p-4 overflow-y-auto flex flex-col items-center justify-start min-h-0">
          {/* White A4 Sheet Container */}
          <div
            className="bg-white rounded-sm shadow-2xl border border-slate-400 w-full max-w-[500px] p-2.5 text-black select-none my-auto flex flex-col shrink-0"
            style={{
              aspectRatio: '210 / 297'
            }}
          >
            {isSingle ? (
              /* Single Bill on Page Preview */
              <div className="flex flex-col justify-start items-center pt-2 sm:pt-4">
                {currentOrdersOnSheet[0] && (
                  <div className="w-full">
                    {renderLabelCard(currentOrdersOnSheet[0], currentSheetIndex + 1, true)}
                    <div className="mt-4 p-3 border border-dashed border-slate-300 rounded text-center text-slate-400 text-xs">
                      Single Bill Page Mode (Clean Single Label on A4)
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 3 Bills Stacked Vertically with Cutting Guides */
              <div className="flex flex-col justify-start gap-1">
                {[0, 1, 2].map((slotIdx) => {
                  const ord = currentOrdersOnSheet[slotIdx];
                  const labelNumber = currentSheetIndex * 3 + slotIdx + 1;

                  return (
                    <React.Fragment key={ord?._id ? `${ord._id}-slot-${slotIdx}` : `slot-${slotIdx}`}>
                      {/* Cut guideline between slots */}
                      {slotIdx > 0 && (
                        <div className="flex items-center gap-1.5 py-0.5 text-neutral-400 select-none shrink-0">
                          <span className="text-[9px] text-neutral-500">✂</span>
                          <div className="flex-1 border-t border-dashed border-neutral-300"></div>
                          <span className="text-[7.5px] font-mono font-bold tracking-wider text-neutral-500 uppercase">
                            Cut Line · ಇಲ್ಲಿ ಕತ್ತರಿಸಿ
                          </span>
                          <div className="flex-1 border-t border-dashed border-neutral-300"></div>
                          <span className="text-[9px] text-neutral-500 transform scale-x-[-1] inline-block">✂</span>
                        </div>
                      )}

                      {ord ? (
                        renderLabelCard(ord, labelNumber, false)
                      ) : (
                        /* Empty slot card */
                        <div className="w-full flex-1 min-h-0 border-2 border-dashed border-slate-300 rounded-sm bg-slate-50/70 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-0.5 select-none py-1.5">
                          <span className="text-base">🏷️</span>
                          <span className="font-bold text-slate-500 text-[10px] sm:text-[11px]">Empty Label Slot ({slotIdx + 1}/3)</span>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal">Available for next label</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Hidden iframe fallback for print */}
        <iframe ref={iframeRef} title="print-frame" className="hidden" />
      </div>
    </div>
  );
}

export default ShippingLabelLandscapeModal;
