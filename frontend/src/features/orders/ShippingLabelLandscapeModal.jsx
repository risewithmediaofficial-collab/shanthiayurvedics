import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Printer, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { convertNumberToIndianWords } from '../../utils/numberToWords.js';
import { useBranch } from '../../context/BranchContext.jsx';

// Font scales for adjusting text size on shipping labels
const FONT_SCALES = {
  compact: {
    key: 'compact',
    label: 'Compact (90%)',
    scale: 0.9,
    // Print 3-per-sheet sizing:
    nameSize: '18px',
    phoneSize: '15px',
    addrSize: '13px',
    trackSize: '16.5px',
    artTitleSize: '10px',
    codBadgeSize: '14px',
    codAmtSize: '17px',
    subRowSize: '11.8px',
    billerSubSize: '11.2px',
    bannerSize: '11.8px',
    tableLabelSize: '11.2px',
    tableValSize: '12.5px',
    senderSize: '10.8px',
    emergencySize: '9.8px',
    // Preview JSX inline font sizes:
    previewName: '15px',
    previewPhone: '13px',
    previewAddr: '11px',
    previewTrack: '14px',
    previewCod: '12px',
    previewCodAmt: '15px',
    previewTableLabel: '10px',
    previewTableVal: '11px',
    previewSub: '10.5px',
    previewSender: '10px',
    previewEmergency: '9px'
  },
  normal: {
    key: 'normal',
    label: 'Normal (Large Text - Fills Label)',
    scale: 1.0,
    // Print 3-per-sheet sizing (Large text, fills entire label):
    nameSize: '21px',
    phoneSize: '16.5px',
    addrSize: '14.5px',
    trackSize: '18px',
    artTitleSize: '11px',
    codBadgeSize: '15.5px',
    codAmtSize: '19px',
    subRowSize: '12.8px',
    billerSubSize: '12px',
    bannerSize: '12.8px',
    tableLabelSize: '12px',
    tableValSize: '13.8px',
    senderSize: '11.5px',
    emergencySize: '10.5px',
    // Preview JSX inline font sizes:
    previewName: '17.5px',
    previewPhone: '14.5px',
    previewAddr: '12.5px',
    previewTrack: '15.5px',
    previewCod: '13.5px',
    previewCodAmt: '17px',
    previewTableLabel: '11px',
    previewTableVal: '12.5px',
    previewSub: '11.5px',
    previewSender: '11px',
    previewEmergency: '10px'
  },
  large: {
    key: 'large',
    label: 'Large (115%)',
    scale: 1.15,
    nameSize: '23px',
    phoneSize: '18px',
    addrSize: '15.5px',
    trackSize: '19.5px',
    artTitleSize: '12px',
    codBadgeSize: '17px',
    codAmtSize: '21px',
    subRowSize: '13.8px',
    billerSubSize: '12.8px',
    bannerSize: '13.5px',
    tableLabelSize: '13px',
    tableValSize: '14.8px',
    senderSize: '12.5px',
    emergencySize: '11.5px',
    // Preview JSX inline font sizes:
    previewName: '19px',
    previewPhone: '15.5px',
    previewAddr: '13.5px',
    previewTrack: '17px',
    previewCod: '14.5px',
    previewCodAmt: '18.5px',
    previewTableLabel: '12px',
    previewTableVal: '13.5px',
    previewSub: '12.5px',
    previewSender: '12px',
    previewEmergency: '11px'
  },
  xlarge: {
    key: 'xlarge',
    label: 'Extra Large (130%)',
    scale: 1.3,
    nameSize: '25px',
    phoneSize: '19.5px',
    addrSize: '16.5px',
    trackSize: '21px',
    artTitleSize: '13px',
    codBadgeSize: '18.5px',
    codAmtSize: '23px',
    subRowSize: '14.8px',
    billerSubSize: '13.8px',
    bannerSize: '14.5px',
    tableLabelSize: '14px',
    tableValSize: '15.8px',
    senderSize: '13.5px',
    emergencySize: '12.5px',
    // Preview JSX inline font sizes:
    previewName: '20.5px',
    previewPhone: '17px',
    previewAddr: '14.5px',
    previewTrack: '18.5px',
    previewCod: '16px',
    previewCodAmt: '20.5px',
    previewTableLabel: '13px',
    previewTableVal: '14.5px',
    previewSub: '13.5px',
    previewSender: '13px',
    previewEmergency: '12px'
  }
};

// Dynamic adaptive layout helper calculating proportions, column ratios, paddings, and font sizes based on product count
const getAdaptiveLayout = (prodCount, isSingle, fontScale, addressLength = 0) => {
  const fs = FONT_SCALES[fontScale] || FONT_SCALES.normal;
  const isScaleUp = fontScale === 'large' || fontScale === 'xlarge';

  if (isSingle) {
    return {
      gridCols: '1.08fr 0.92fr',
      labelWidth: '28%',
      padTableY: '7px',
      prodFont: isScaleUp ? '14.5px' : '13.5px',
      labelFont: isScaleUp ? '13px' : '12px',
      previewProdFont: isScaleUp ? '13px' : '12px',
      previewLabelFont: isScaleUp ? '12px' : '11px',
      lineHeight: '1.35',
      artBoxPadding: '4px 8px',
      artTitleSize: '11.5px',
      artCodeSize: '19px',
      nameSize: isScaleUp ? '24px' : '22px',
      previewNameSize: isScaleUp ? '19px' : '17.5px',
      addrSize: addressLength > 150 ? '13.5px' : '15px',
      previewAddrSize: addressLength > 150 ? '12px' : '13px',
      phoneSize: '17px',
      previewPhoneSize: '15px',
      codBadgeSize: '16px',
      previewCodBadgeSize: '14px',
      codAmtSize: '20px',
      previewCodAmtSize: '17.5px',
      headerPad: '4px 10px',
      carrierPad: '4px 10px',
      subRowPad: '3.5px 10px',
      helpPad: '4px 10px',
      senderPad: '4px 10px',
      emergencyPad: '3.5px 8px',
      subRowSize: '13.5px',
      billerSubSize: '12.5px',
      bannerSize: '13px',
      senderSize: '12px',
      emergencySize: '11px',
      previewSub: '12px',
      previewSender: '11px',
      previewEmergency: '10px',
      articleBoxClass: 'py-1 px-2'
    };
  }

  // 3-per-sheet Mode: Adaptively adjust according to product count
  if (prodCount <= 2) {
    return {
      gridCols: '1.05fr 0.95fr',
      labelWidth: '28%',
      padTableY: '7px',
      prodFont: fs.tableValSize,
      labelFont: fs.tableLabelSize,
      previewProdFont: fs.previewTableVal,
      previewLabelFont: fs.previewTableLabel,
      lineHeight: '1.35',
      artBoxPadding: '3.5px 6px',
      artTitleSize: fs.artTitleSize,
      artCodeSize: fs.trackSize,
      nameSize: fs.nameSize,
      previewNameSize: fs.previewName,
      addrSize: addressLength > 150 ? '13px' : fs.addrSize,
      previewAddrSize: addressLength > 150 ? '11.5px' : fs.previewAddr,
      phoneSize: fs.phoneSize,
      previewPhoneSize: fs.previewPhone,
      codBadgeSize: fs.codBadgeSize,
      previewCodBadgeSize: fs.previewCod,
      codAmtSize: fs.codAmtSize,
      previewCodAmtSize: fs.previewCodAmt,
      headerPad: '3.5px 8px',
      carrierPad: '3.5px 8px',
      subRowPad: '3px 8px',
      helpPad: '3.5px 8px',
      senderPad: '3.5px 8px',
      emergencyPad: '3px 6px',
      subRowSize: fs.subRowSize,
      billerSubSize: fs.billerSubSize,
      bannerSize: fs.bannerSize,
      senderSize: fs.senderSize,
      emergencySize: fs.emergencySize,
      previewSub: fs.previewSub,
      previewSender: fs.previewSender,
      previewEmergency: fs.previewEmergency,
      articleBoxClass: 'py-1 px-2'
    };
  } else if (prodCount === 3) {
    return {
      gridCols: '1.02fr 0.98fr',
      labelWidth: '27%',
      padTableY: '5px',
      prodFont: fontScale === 'xlarge' ? '14.5px' : (fontScale === 'large' ? '13.8px' : '13px'),
      labelFont: '11.5px',
      previewProdFont: fontScale === 'xlarge' ? '13px' : (fontScale === 'large' ? '12.2px' : '11.5px'),
      previewLabelFont: '10.5px',
      lineHeight: '1.25',
      artBoxPadding: '3px 5px',
      artTitleSize: fs.artTitleSize,
      artCodeSize: fs.trackSize,
      nameSize: fs.nameSize,
      previewNameSize: fs.previewName,
      addrSize: addressLength > 140 ? '12.5px' : fs.addrSize,
      previewAddrSize: addressLength > 140 ? '11px' : fs.previewAddr,
      phoneSize: fs.phoneSize,
      previewPhoneSize: fs.previewPhone,
      codBadgeSize: fs.codBadgeSize,
      previewCodBadgeSize: fs.previewCod,
      codAmtSize: fs.codAmtSize,
      previewCodAmtSize: fs.previewCodAmt,
      headerPad: '3px 8px',
      carrierPad: '3px 8px',
      subRowPad: '2.5px 8px',
      helpPad: '3px 8px',
      senderPad: '3px 8px',
      emergencyPad: '2.5px 6px',
      subRowSize: fs.subRowSize,
      billerSubSize: fs.billerSubSize,
      bannerSize: fs.bannerSize,
      senderSize: fs.senderSize,
      emergencySize: fs.emergencySize,
      previewSub: fs.previewSub,
      previewSender: fs.previewSender,
      previewEmergency: fs.previewEmergency,
      articleBoxClass: 'py-0.8 px-1.5'
    };
  } else if (prodCount === 4) {
    return {
      gridCols: '0.98fr 1.02fr',
      labelWidth: '26%',
      padTableY: '3.5px',
      prodFont: '12px',
      labelFont: '10.8px',
      previewProdFont: '10.8px',
      previewLabelFont: '9.6px',
      lineHeight: '1.2',
      artBoxPadding: '2.5px 5px',
      artTitleSize: '9.5px',
      artCodeSize: '16.5px',
      nameSize: '18px',
      previewNameSize: '16px',
      addrSize: addressLength > 140 ? '12px' : '13px',
      previewAddrSize: addressLength > 140 ? '10.8px' : '11.8px',
      phoneSize: '15px',
      previewPhoneSize: '13.5px',
      codBadgeSize: '14px',
      previewCodBadgeSize: '12.5px',
      codAmtSize: '16.5px',
      previewCodAmtSize: '15px',
      headerPad: '2.5px 8px',
      carrierPad: '2.5px 8px',
      subRowPad: '2.5px 8px',
      helpPad: '2.5px 7px',
      senderPad: '2.5px 8px',
      emergencyPad: '2px 6px',
      subRowSize: '12px',
      billerSubSize: '11px',
      bannerSize: '11.8px',
      senderSize: '10.8px',
      emergencySize: '9.8px',
      previewSub: '11px',
      previewSender: '10px',
      previewEmergency: '9.2px',
      articleBoxClass: 'py-0.5 px-1'
    };
  } else {
    // 5+ products: Ultra-compact adaptive pack
    return {
      gridCols: '0.95fr 1.05fr',
      labelWidth: '24%',
      padTableY: '2px',
      prodFont: '10.8px',
      labelFont: '9.6px',
      previewProdFont: '9.8px',
      previewLabelFont: '8.8px',
      lineHeight: '1.14',
      artBoxPadding: '1.8px 3px',
      artTitleSize: '8.8px',
      artCodeSize: '14.5px',
      nameSize: '16px',
      previewNameSize: '14.5px',
      addrSize: '11.5px',
      previewAddrSize: '10.5px',
      phoneSize: '13.5px',
      previewPhoneSize: '12.5px',
      codBadgeSize: '12px',
      previewCodBadgeSize: '11px',
      codAmtSize: '14.5px',
      previewCodAmtSize: '13.5px',
      headerPad: '2px 7px',
      carrierPad: '2px 7px',
      subRowPad: '2px 7px',
      helpPad: '2px 6px',
      senderPad: '2px 7px',
      emergencyPad: '1.5px 5px',
      subRowSize: '11px',
      billerSubSize: '10.2px',
      bannerSize: '10.8px',
      senderSize: '10px',
      emergencySize: '9.2px',
      previewSub: '10px',
      previewSender: '9.2px',
      previewEmergency: '8.5px',
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
  const { allBranches, availableBranches, selectedBranchId } = useBranch();
  const branchList = allBranches?.length ? allBranches : availableBranches;

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

    const isCOD = (order.paymentMethod || 'COD') === 'COD';
    const advanceAmount = Number(order.advanceAmount || 0);
    const advanceUtr = order.advanceUtr || '';
    const payableAmount = Math.round(Number(
      isCOD
        ? (order.codAmount !== undefined && order.codAmount !== null && order.codAmount !== '' ? order.codAmount : Math.max(0, (order.grandTotal || 0) - advanceAmount))
        : order.grandTotal
    ) || 0);
    const amountWords = convertNumberToIndianWords(payableAmount);

    // 1. Top Carrier Line (Line 2) - Standard Speed Post header (no courier brand/name)
    const carrierBannerText = isCOD
      ? `SPEED POST : Rs ${payableAmount} | ${amountWords} RUPEES ONLY`
      : `SPEED POST : PREPAID (Rs ${payableAmount}) | ${amountWords} RUPEES ONLY`;
    const speedPostText = carrierBannerText;

    // Tracking / Article Number
    const cleanOrderNum = order.orderNumber?.replace(/[^0-9]/g, '').slice(-9) || Date.now().toString().slice(-9);
    const trackingTitle = 'ARTICLE NUMBER';
    const tracking = order.trackingNumber || order.awbNumber || `EM${cleanOrderNum}IN`;
    
    // Dynamic Branch Sender & Return / From Address
    const branch = (() => {
      if (
        order.branchId &&
        typeof order.branchId === 'object' &&
        (order.branchId.name || order.branchId.address || order.branchId.postalPickupDetails)
      ) {
        return order.branchId;
      }

      const bId = typeof order.branchId === 'string'
        ? order.branchId
        : (order.branchId?._id || order.branchId?.id);

      if (bId && Array.isArray(branchList)) {
        const found = branchList.find((b) => String(b._id || b.id) === String(bId));
        if (found) return found;
      }

      if (selectedBranchId && selectedBranchId !== 'ALL' && Array.isArray(branchList)) {
        const current = branchList.find((b) => String(b._id || b.id) === String(selectedBranchId));
        if (current) return current;
      }

      return branchList?.[0] || {};
    })();

    const pickup = branch.postalPickupDetails || {};
    const knPickup = branch.karnatakaPostalDetails || {};
    const branchAddr = branch.address || {};

    const senderTitle = (pickup.senderName || branch.name || 'SHANTHI AYURVEDAS').toUpperCase();

    // 1. Resolve cities & pincodes:
    const knCity = (knPickup.city || 'BENGALURU').toUpperCase();
    const knPin = (knPickup.pincode === '560001' ? '562106' : (knPickup.pincode || '562106')).trim();
    const knPincodeVal = knPin;
    const defaultCity = (pickup.city || branchAddr.city || 'HOSUR').toUpperCase();
    const defaultPin = (pickup.pincode || branchAddr.pincode || '635110').trim();

    const senderCity = isKarnataka ? knCity : defaultCity;
    const senderPincode = isKarnataka ? knPin : defaultPin;
    const knPoNumber = (knPickup.postOfficeNumber || branch.karnatakaPostOfficeNumber || knPickup.phone || '').trim();

    // 2. Resolve From / Return Address:
    const pStreet = (pickup.street || branchAddr.street || '').trim();
    const pCity = (pickup.city || branchAddr.city || '').trim();
    const pState = (pickup.state || branchAddr.state || '').trim();
    const pPincode = (pickup.pincode || branchAddr.pincode || '').trim();

    let branchAddrParts = [];
    if (pStreet) branchAddrParts.push(pStreet);
    if (pCity && !pStreet.toLowerCase().includes(pCity.toLowerCase())) branchAddrParts.push(pCity);
    if (pState && !pStreet.toLowerCase().includes(pState.toLowerCase())) branchAddrParts.push(pState);

    let resolvedBranchAddr = branchAddrParts.join(', ');
    if (pPincode && !resolvedBranchAddr.includes(pPincode)) {
      resolvedBranchAddr = resolvedBranchAddr ? `${resolvedBranchAddr} - ${pPincode}` : pPincode;
    }

    let fromAddressText;
    if (isKarnataka) {
      const knStreet = (knPickup.street || '').trim();
      if (knStreet) {
        let knParts = [knStreet];
        if (knCity && !knStreet.toLowerCase().includes(knCity.toLowerCase())) knParts.push(knCity);
        const knState = (knPickup.state || 'KARNATAKA').trim();
        if (knState && !knStreet.toLowerCase().includes(knState.toLowerCase())) knParts.push(knState);
        fromAddressText = `FROM : ${senderTitle}, ${knParts.join(', ').toUpperCase()} - ${knPin}`;
      } else {
        fromAddressText = `FROM : ${senderTitle}, 156, SRR EXBHURIA, ANEKAL, BENGALURU DISTRICT - 562106`;
      }
    } else if (resolvedBranchAddr) {
      fromAddressText = `FROM : ${senderTitle}, ${resolvedBranchAddr.toUpperCase()}`;
    } else {
      fromAddressText = `FROM : ${senderTitle}, NO15, JAYPEE GATEWAY, ANTHIVADI, HOSUR - 635110`;
    }

    // 3. Resolve Sender Contact Numbers:
    const orderPlacerPhone = String(
      order.assignedTo?.phone ||
      order.telecallerPhone ||
      order.createdBy?.phone ||
      order.assignedToPhone ||
      ''
    ).replace(/^\+91\s*/, '').replace(/[^0-9]/g, '').trim();

    const branchPhone1 = String(pickup.phone || branch.phone || (isKarnataka ? knPickup.phone : '') || '')
      .replace(/^\+91\s*/, '')
      .replace(/[^0-9]/g, '')
      .trim();
    const branchPhone2 = String(pickup.alternatePhone || branch.alternatePhone || '')
      .replace(/^\+91\s*/, '')
      .replace(/[^0-9]/g, '')
      .trim();

    const phonesList = [orderPlacerPhone, branchPhone1, branchPhone2]
      .filter((p, idx, arr) => Boolean(p) && arr.indexOf(p) === idx);

    const senderMobileText = `MOBILE : ${phonesList.length > 0 ? phonesList.join(' / ') : '8884747209 / 8884113629'}`;

    // 4. Resolve Subheader (Line 3: Biller ID & Booking Post Office):
    let billerId = branch.billerId || '1000058077';
    let bookingLocation = '';
    let carrierSubheaderText;

    if (isKarnataka) {
      billerId = knPickup.billerId || branch.karnatakaBillerId || '1000054429';
      let knRawOffice = (knPickup.bookingOffice || `BENGALURU BPC POST - ${knPin}`).toUpperCase();
      knRawOffice = knRawOffice.replace(/560001/g, '562106');
      bookingLocation = knRawOffice.includes('562106') ? knRawOffice : `${knRawOffice} - 562106`;
      const poNumTag = knPoNumber ? ` · PO NO: ${knPoNumber}` : '';
      carrierSubheaderText = `BILLER ID : ${billerId} (BOOKED AT ${bookingLocation}${poNumTag})`;
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

    const telecallerName = (
      order.assignedTo?.name ||
      order.telecallerName ||
      pickup.contactPerson ||
      branch.managerName ||
      'SHANTHI CLINIC'
    ).toUpperCase();
    const telecallerMobile =
      order.assignedTo?.phone ||
      order.telecallerPhone ||
      pickup.phone ||
      branch.managerPhone ||
      branchPhone1 ||
      '8925744369';

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
      knPincode: knPincodeVal,
      knPincodeVal: knPin,
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
                <div class="cust-divider"></div>
                <div class="cust-address" style="font-size: ${adaptive.addrSize};">${d.formattedAddress}</div>
              </div>

              <!-- Right Column: Tracking & Table -->
              <div class="col-right">
                <div class="article-box" style="padding: ${adaptive.artBoxPadding};">
                  <div class="art-title" style="font-size: ${adaptive.artTitleSize};">${d.trackingTitle}</div>
                  <div class="art-code" style="font-size: ${adaptive.artCodeSize};">${d.tracking}</div>
                </div>

                <div class="table-wrapper">
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
            margin: ${isSingle ? '8mm 8mm' : '4mm 6mm'};
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
            width: 198mm;
          }
          .sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .sheet-page.batch-mode {
            height: auto;
            max-height: 289mm;
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
            justify-content: space-between;
            background: #fff;
            overflow: hidden;
            color: #000;
            line-height: 1.2;
            width: 100%;
          }
          .label-box.batch-mode {
            width: 100%;
            height: 90.5mm;
            min-height: 90.5mm;
            max-height: 91.5mm;
          }
          .label-box.single-mode {
            width: 100%;
            min-height: 125mm;
            border: 1.5px solid #000;
          }

          .cut-guide {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            height: 3.5mm;
            margin: 0.5mm 0;
            color: #6b7280;
            font-size: 8px;
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
            font-size: 8px;
          }
          .cut-scissor {
            font-size: 9.5px;
            color: #4b5563;
          }
          .cut-flip {
            transform: scaleX(-1);
            display: inline-block;
          }

          .label-header {
            background-color: #362115 !important;
            color: #fff !important;
            padding: ${isSingle ? '3.5px 8px' : '2.5px 6px'};
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .sheet-meta {
            text-align: right;
            font-family: monospace;
            font-size: ${isSingle ? '9px' : '8px'};
            line-height: 1.15;
            color: #f3f4f6;
          }
          .sub-row {
            border-bottom: 1px solid #000;
            padding: ${isSingle ? '3px 8px' : '2px 6px'};
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
            padding: ${isSingle ? '3px 8px' : '2px 5px'};
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
            flex: 1;
            min-height: 0;
            height: 100%;
          }
          .col-left {
            border-right: 1px solid #000;
            padding: ${isSingle ? '6px 12px' : '5px 10px'};
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
            min-width: 0;
            height: 100%;
            box-sizing: border-box;
          }
          .cust-name {
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1px;
            line-height: 1.15;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .cod-badge {
            border: 1.5px solid #dc2626;
            color: #dc2626;
            font-weight: 900;
            padding: ${isSingle ? '2px 7px' : '1.5px 6px'};
            border-radius: 3px;
            white-space: nowrap;
          }
          .cust-phone {
            font-weight: 900;
            color: #000;
            margin: 2px 0;
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          }
          .cust-divider {
            border-top: 1.5px solid #000;
            width: 100%;
            margin: 2.5px 0 3px 0;
            flex-shrink: 0;
          }
          .cust-address {
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.35;
            color: #111;
            word-break: break-word;
            overflow-wrap: break-word;
            margin-top: 2px;
            flex: 1;
          }
          .col-right {
            padding: ${isSingle ? '5px 10px' : '4px 7px'};
            display: flex;
            flex-direction: column;
            gap: 3px;
            justify-content: flex-start;
            min-width: 0;
            height: 100%;
            box-sizing: border-box;
          }
          .article-box {
            border: 1px dashed #737373;
            padding: ${isSingle ? '3px 6px' : '2.5px 5px'};
            text-align: center;
            background: #fafafa;
            flex-shrink: 0;
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
          .table-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
          }
          .details-table {
            width: 100%;
            height: 100%;
            flex: 1;
            border-collapse: collapse;
            border: 1px solid #000;
            font-weight: 800;
            text-transform: uppercase;
            table-layout: fixed;
          }
          .details-table tbody {
            height: 100%;
          }
          .details-table tr {
            height: auto;
          }
          .details-table td {
            vertical-align: middle;
          }
          .footer-sender {
            padding: ${isSingle ? '3px 8px' : '3px 8px'};
            font-size: ${isSingle ? '11px' : fs.senderSize};
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.25;
            background: #fff;
            flex-shrink: 0;
          }
          .emergency-banner {
            background-color: #dc2626 !important;
            color: #ffffff !important;
            text-align: center;
            padding: ${isSingle ? '2.5px 6px' : '2.5px 6px'};
            font-size: ${isSingle ? '10px' : fs.emergencySize};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.15;
            flex-shrink: 0;
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
      <div className={`w-full border-[1.5px] border-black bg-white flex flex-col justify-between text-xs shadow-2xs ${isSingleCard ? '' : 'flex-1 min-h-0'}`}>
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
          className="grid divide-x divide-black border-b border-black bg-white flex-1 min-h-0"
          style={{ gridTemplateColumns: adaptive.gridCols }}
        >
          {/* Left Column: Customer details */}
          <div className="p-2 sm:p-2.5 flex flex-col justify-start gap-1 min-w-0 h-full">
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
                style={{ fontSize: isSingleCard ? '10px' : '8.5px' }}
              >
                C/O {d.fatherName}
              </div>
            )}
            {/* Divider Line between name/phone and address */}
            <div className="border-t-[1.5px] border-black w-full my-1 shrink-0" />
            <div
              className="font-bold uppercase leading-tight text-neutral-900 break-words flex-1"
              style={{ fontSize: adaptive.previewAddrSize, lineHeight: 1.25 }}
            >
              {d.formattedAddress}
            </div>
          </div>

          {/* Right Column: Tracking Box & Table */}
          <div className="p-1.5 sm:p-2 flex flex-col gap-1 justify-start min-w-0 h-full">
            <div
              className={`border border-dashed border-neutral-400 text-center bg-neutral-50 rounded-xs shrink-0 ${adaptive.articleBoxClass}`}
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

            <div className="flex-1 flex flex-col min-h-0 h-full">
              <table
                className="w-full h-full flex-1 border-collapse border border-black font-bold uppercase table-fixed"
              >
                <tbody className="h-full">
                  <tr className="border-b border-black">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap align-middle`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      REFER BY
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-black break-words leading-tight align-middle`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      {d.telecallerName}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td
                      className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap align-middle`}
                      style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                    >
                      WEIGHT
                    </td>
                    <td
                      className={`px-1.5 ${adaptive.tablePadClass} font-black text-black break-words leading-tight align-middle`}
                      style={{ fontSize: adaptive.previewProdFont }}
                    >
                      {d.weightText} {d.totalPieces} PCS
                    </td>
                  </tr>
                  {d.advanceAmount > 0 && (
                    <tr className="border-b border-black bg-emerald-50/60">
                      <td
                        className={`px-1 ${adaptive.tablePadClass} border-r border-black font-bold text-emerald-800 whitespace-nowrap align-middle`}
                        style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                      >
                        ADVANCE
                      </td>
                      <td
                        className={`px-1.5 ${adaptive.tablePadClass} font-black text-emerald-800 break-words leading-tight align-middle`}
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
                        className={`px-1 ${adaptive.tablePadClass} border-r border-black bg-gray-50 text-gray-700 font-bold whitespace-nowrap align-middle`}
                        style={{ width: adaptive.labelWidth, fontSize: adaptive.previewLabelFont }}
                      >
                        PRODUCT
                      </td>
                      <td
                        className={`px-1.5 ${adaptive.tablePadClass} font-black text-black leading-tight break-words whitespace-normal align-middle`}
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
              <div className="flex flex-col justify-between h-full flex-1 gap-1">
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
