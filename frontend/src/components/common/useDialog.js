import { useLayoutEffect, useRef } from 'react';

const openDialogs = [];
let previousOverflow = '';
const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// Share focus and scroll ownership across drawers, including dialogs opened inside a drawer.
export function useDialog(isOpen, onClose, panelRef) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current) return undefined;
    const panel = panelRef.current;
    const returnFocus = document.activeElement;
    const entry = { panel, returnFocus };
    if (openDialogs.length === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openDialogs.push(entry);

    const isTopDialog = () => openDialogs[openDialogs.length - 1] === entry;
    const getFocusable = () => Array.from(panel.querySelectorAll(focusableSelector)).filter((element) => (
      element.tabIndex >= 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]')
      && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden'
    ));
    const focusFirst = () => (getFocusable()[0] || panel).focus({ preventScroll: true });
    const handleKeyDown = (event) => {
      if (!isTopDialog() || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onCloseRef.current?.();
      } else if (event.key === 'Tab') {
        const elements = getFocusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first) {
          event.preventDefault();
          panel.focus();
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handleFocus = (event) => {
      if (isTopDialog() && !panel.contains(event.target)) focusFirst();
    };
    if (!panel.contains(document.activeElement)) focusFirst();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      const wasTopDialog = isTopDialog();
      openDialogs.splice(openDialogs.indexOf(entry), 1);
      // If a parent is removed first, preserve its original return target for the child.
      openDialogs.forEach((dialog) => {
        if (panel.contains(dialog.returnFocus)) dialog.returnFocus = entry.returnFocus;
      });
      if (openDialogs.length === 0) document.body.style.overflow = previousOverflow;
      if (wasTopDialog && entry.returnFocus?.isConnected) entry.returnFocus.focus({ preventScroll: true });
    };
  }, [isOpen, panelRef]);
}
