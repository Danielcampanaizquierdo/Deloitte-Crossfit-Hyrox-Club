/** @jsxImportSource preact */
import { useState } from "preact/hooks";

type ModalType = 
  | "signupModal"
  | "eventModal"
  | "prModal"
  | "resultModal"
  | "memberModal"
  | "profileModal";

interface ModalManagerProps {
  buttonLabel: string;
  modalId: ModalType;
  buttonClass?: string;
}

export default function ModalManager({
  buttonLabel,
  modalId,
  buttonClass = "btn green",
}: ModalManagerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "flex";
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = "none";
    }
  };

  return (
    <button className={buttonClass} onClick={openModal}>
      {buttonLabel}
    </button>
  );
}
