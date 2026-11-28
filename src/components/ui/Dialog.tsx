import React from 'react';
import { Modal, type ModalSize } from '../common/Modal';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxWidth?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  maxWidth = 'xl',
  children,
  footer,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      size={maxWidth}
      footer={footer}
    >
      {children}
    </Modal>
  );
};
