/**
 * Centralized Error Resolution Engine
 * Provides user-friendly error messages, actionable "How to solve" guidance,
 * detailed diagnostic telemetry, and direct page routing links for all errors across the CRM.
 */

export const STANDARD_ROUTES = [
  { label: 'Overview Dashboard', path: '/dashboard?tab=overview', key: 'dashboard', primary: true },
  { label: 'Orders Management', path: '/orders', key: 'orders' },
  { label: 'Leads & Enquiries', path: '/leads', key: 'leads' },
  { label: 'Counter Sale / Billing', path: '/orders/counter-sale', key: 'counterSale' },
  { label: 'Packing & Operations', path: '/operations', key: 'operations' },
  { label: 'Customer Directory', path: '/customers', key: 'customers' }
];

/**
 * Normalizes any error (AxiosError, Error, string, or plain object) into a rich resolution payload.
 *
 * @param {Error|Object|string} error The raw error object or message
 * @param {Object} [options] Custom overrides or context
 * @returns {Object} Structured error resolution object
 */
export function formatErrorResolution(error, options = {}) {
  const isAxios = Boolean(error?.isAxiosError || error?.response || error?.config);
  const status = Number(options.status || error?.response?.status || error?.status || 0);
  const statusText = error?.response?.statusText || (status ? `HTTP ${status}` : 'Unknown');
  const endpoint = error?.config?.url || options.endpoint || (typeof window !== 'undefined' ? window.location.pathname : '');
  const method = (error?.config?.method || options.method || 'GET').toUpperCase();
  const requestId = error?.response?.data?.requestId || error?.response?.headers?.['x-request-id'] || options.requestId || null;
  const timestamp = new Date().toISOString();

  // Extract raw backend message
  const backendMsg = error?.response?.data?.message || error?.response?.data?.error || (typeof error?.response?.data === 'string' ? error?.response?.data : null);
  const rawMsg = options.message || backendMsg || error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred.');

  // Extract field validation details if provided
  let validationDetails = null;
  if (error?.response?.data?.errors) {
    validationDetails = error.response.data.errors;
  } else if (Array.isArray(error?.response?.data?.details)) {
    validationDetails = error.response.data.details;
  }

  // Base classification
  let title = 'Operation Failed';
  let userMessage = rawMsg;
  let howToSolve = [];
  let routingLinks = [...STANDARD_ROUTES];

  // 1. Connection / Timeout / Offline
  const isNetworkOffline = !navigator?.onLine || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error');
  if (isNetworkOffline) {
    title = 'Connection Interrupted or Offline';
    userMessage = 'Unable to communicate with the CRM server. Your network connection may have dropped or timed out.';
    howToSolve = [
      'Check your Wi-Fi, Ethernet, or mobile data connection to verify internet access.',
      'Ensure other web pages can load properly on your device.',
      'If you are using a VPN or mobile hotspot, check if the connection is active and stable.',
      'Once connected, click "Try Again" or reload the page to resume work.'
    ];
    routingLinks = [
      { label: 'Reload Page', path: '#reload', isAction: true, primary: true },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' },
      { label: 'Go to Orders', path: '/orders' }
    ];
  }
  // 2. HTTP 400 Bad Request & HTTP 422 Unprocessable Entity
  else if (status === 400 || status === 422) {
    title = status === 422 ? 'Unprocessable Request (422)' : 'Validation & Input Error (400)';
    userMessage = backendMsg || 'The submitted information is incomplete or does not meet the required format.';
    howToSolve = [
      'Review the form fields carefully for missing required values (e.g. customer name, address, phone).',
      'Verify that mobile numbers have exactly 10 digits and postal PIN codes have 6 digits.',
      'Ensure product quantities and prices are positive numbers greater than 0.',
      'Check the detailed validation errors below, correct the highlighted fields, and submit again.'
    ];
    routingLinks = [
      { label: 'Return to Orders', path: '/orders', primary: true },
      { label: 'Return to Leads', path: '/leads' },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' }
    ];
  }
  // 3. HTTP 401 Unauthorized / Session Expired
  else if (status === 401) {
    title = 'Session Expired or Unauthorized (401)';
    userMessage = 'Your login session has expired or your security credentials are no longer valid.';
    howToSolve = [
      'Click the "Sign In Again" button below to log back into your CRM workspace.',
      'Make sure your account password was not recently updated on another device.',
      'Avoid running multiple active CRM sessions in different incognito tabs.'
    ];
    routingLinks = [
      { label: 'Sign In Again', path: '/login', primary: true },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' }
    ];
  }
  // 4. HTTP 403 Forbidden / Access Restricted
  else if (status === 403) {
    title = 'Access Restricted (403)';
    userMessage = backendMsg || 'You do not have the required permissions to perform this action or view this page.';
    howToSolve = [
      'Verify that your user role has been granted permission for this module or action.',
      'If you are reviewing another branch (e.g., Hosur, Krishnagiri), switch back to your designated branch.',
      'If you are an Owner/Manager, ensure your desk switch view matches the required permissions.',
      'Contact your System Administrator or Branch Head to request access.'
    ];
    routingLinks = [
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview', primary: true },
      { label: 'Go to Orders', path: '/orders' },
      { label: 'Go to Leads', path: '/leads' }
    ];
  }
  // 5. HTTP 404 Not Found
  else if (status === 404) {
    title = 'Resource Not Found (404)';
    userMessage = backendMsg || 'The requested order, customer, product, lead, or route could not be found.';
    howToSolve = [
      'Verify that the order number, customer ID, or URL path was typed correctly.',
      'The record may have been deleted, archived, or transferred to another branch location.',
      'Use the search filter on the listing page to find the record by phone number or name.',
      'Navigate back to your main workspace using one of the routing links below.'
    ];
    routingLinks = [
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview', primary: true },
      { label: 'Go to Orders', path: '/orders' },
      { label: 'Go to Leads', path: '/leads' }
    ];
  }
  // 6. HTTP 409 Conflict
  else if (status === 409) {
    title = 'Data Conflict (409)';
    userMessage = backendMsg || 'The record has already been modified elsewhere or a duplicate entry exists.';
    howToSolve = [
      'Another user or background process may have updated this order or customer at the same time.',
      'If registering a customer or order, check whether the phone number or order ID is already registered.',
      'Refresh the screen to load the latest state, then make your changes again.'
    ];
    routingLinks = [
      { label: 'Return to Orders', path: '/orders', primary: true },
      { label: 'Return to Leads', path: '/leads' },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' }
    ];
  }
  // 7. HTTP 429 Rate Limit
  else if (status === 429) {
    title = 'Too Many Requests (429)';
    userMessage = 'Too many requests were sent in a short period. The system is temporarily cooling down.';
    howToSolve = [
      'Wait 10 to 15 seconds before clicking the button or submitting again.',
      'Avoid rapidly clicking buttons or repeatedly refreshing data tables.',
      'If running an automated task or batch export, space out the operations.'
    ];
    routingLinks = [
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview', primary: true },
      { label: 'Go to Orders', path: '/orders' }
    ];
  }
  // 8. HTTP 500, 502, 503, 504 Server / Service Errors
  else if (status >= 500) {
    title = `Server Processing Error (${status})`;
    userMessage = backendMsg || 'The server encountered an internal error or database timeout while processing your request.';
    howToSolve = [
      'Wait 20 to 30 seconds and click "Try Again" or refresh the page.',
      'If you were performing a bulk action or large export, try selecting fewer items.',
      'Click "Copy Error Details" below and share the diagnostic reference ID with CRM technical support.'
    ];
    routingLinks = [
      { label: 'Reload Page', path: '#reload', isAction: true, primary: true },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' },
      { label: 'Go to Orders', path: '/orders' }
    ];
  }
  // 9. Client-side Render / Error Boundary
  else if (options.isRenderError || error?.name === 'ChunkLoadError' || (!isAxios && error instanceof Error)) {
    title = options.title || 'Screen Rendering Issue';
    userMessage = rawMsg || 'A visual component encountered an unexpected problem while displaying this page.';
    howToSolve = [
      'Click "Reload Screen" below to re-initialize components and clear temporary display caches.',
      'If a new software update was published recently, press Ctrl + Shift + R to force a hard reload.',
      'Use the direct page routing buttons below to navigate safely to an active workspace.',
      'If the error persists, copy the error details below and report it to the technical team.'
    ];
    routingLinks = [
      { label: 'Reload Screen', path: '#reload', isAction: true, primary: true },
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview' },
      { label: 'Go to Orders', path: '/orders' },
      { label: 'Go to Leads', path: '/leads' }
    ];
  }
  // Default fallback
  else {
    title = options.title || 'Action Could Not Be Completed';
    userMessage = rawMsg;
    howToSolve = [
      'Double check your inputs and try the action again.',
      'Ensure you have an active network connection and are logged in with valid permissions.',
      'If the issue persists, review the technical error details below or contact technical support.'
    ];
    routingLinks = [
      { label: 'Go to Dashboard', path: '/dashboard?tab=overview', primary: true },
      { label: 'Go to Orders', path: '/orders' },
      { label: 'Go to Leads', path: '/leads' }
    ];
  }

  // Merge custom overrides if passed
  if (options.title) title = options.title;
  if (options.message) userMessage = options.message;
  if (Array.isArray(options.howToSolve) && options.howToSolve.length > 0) howToSolve = options.howToSolve;
  if (Array.isArray(options.routingLinks) && options.routingLinks.length > 0) routingLinks = options.routingLinks;

  return {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: status || (isNetworkOffline ? 'NETWORK' : 'CLIENT_ERROR'),
    statusText,
    title,
    message: userMessage,
    howToSolve,
    routingLinks,
    technical: {
      status,
      statusText,
      endpoint,
      method,
      requestId,
      timestamp,
      validationDetails,
      rawMessage: rawMsg,
      stack: error?.stack || null
    }
  };
}

/**
 * Dispatches an enriched crm:error event to the global listener (AppFeedback modal/toast).
 *
 * @param {Error|Object|string} error
 * @param {Object} [options]
 * @returns {Object} The formatted resolution
 */
export function showErrorDetails(error, options = {}) {
  const resolution = formatErrorResolution(error, options);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:error', { detail: resolution }));
  }
  return resolution;
}

/**
 * Copies structured diagnostic details of an error to the clipboard.
 *
 * @param {Object} resolution Formatted resolution object
 * @returns {Promise<boolean>} Whether copy succeeded
 */
export async function copyErrorDetailsToClipboard(resolution) {
  if (!resolution) return false;
  const tech = resolution.technical || {};
  const report = [
    `=== SHANTHI AYURVEDAS CRM ERROR REPORT ===`,
    `Timestamp: ${tech.timestamp || new Date().toISOString()}`,
    `Title: ${resolution.title}`,
    `Message: ${resolution.message}`,
    `Status: ${resolution.status} (${tech.statusText || 'N/A'})`,
    `Endpoint: ${tech.method || 'GET'} ${tech.endpoint || 'N/A'}`,
    `Request ID: ${tech.requestId || 'None'}`,
    ``,
    `--- HOW TO SOLVE ---`,
    ...(Array.isArray(resolution.howToSolve) ? resolution.howToSolve.map((step, i) => `${i + 1}. ${step}`) : ['N/A']),
    ``,
    `--- TECHNICAL DETAILS ---`,
    `Raw Message: ${tech.rawMessage || 'N/A'}`,
    tech.validationDetails ? `Validation Errors: ${JSON.stringify(tech.validationDetails, null, 2)}` : null,
    tech.stack ? `Stack Trace:\n${tech.stack}` : null,
    `==========================================`
  ].filter(Boolean).join('\n');

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(report);
      return true;
    }
    // Fallback using textarea
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = report;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy error report to clipboard:', err);
    return false;
  }
}
