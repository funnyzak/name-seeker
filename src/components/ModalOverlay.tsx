import { useEffect, useRef, type ReactNode } from 'react';

export default function ModalOverlay({
  label,
  children,
  onDismiss,
}: {
  label: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal-overlay"
      aria-label={label}
      onCancel={event => {
        event.preventDefault();
        onDismiss?.();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onDismiss?.();
      }}
    >
      {children}
    </dialog>
  );
}
