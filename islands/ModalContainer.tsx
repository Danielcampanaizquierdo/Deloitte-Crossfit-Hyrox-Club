import { useState } from "preact/hooks";

interface ModalContainerProps {
  id: string;
  title: string;
  children?: any;
}

export default function ModalContainer({
  id,
  title,
  children,
}: ModalContainerProps) {
  const closeModal = () => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = "none";
    }
  };

  return (
    <div id={id} class="modal-back">
      <div class="modal">
        <div class="modal-head">
          <h3>{title}</h3>
          <button class="close" onClick={closeModal}>
            ×
          </button>
        </div>
        <div class="form">{children}</div>
      </div>
    </div>
  );
}
