"use client";

import { Btn, Modal } from "@/components/erp/ui";
import { FieldVisitCreateForm } from "@/components/field-sales/field-visit-create-form";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function FieldVisitCreateModal({ open, onClose, onCreated }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New field visit"
      sub="Log field sales and employee visits — customer, vendor, market, collection. The assigned employee receives a notification with all details."
      footer={
        <Btn variant="ghost" size="sm" onClick={onClose}>
          Close
        </Btn>
      }
    >
      <FieldVisitCreateForm
        showCancel
        onCancel={onClose}
        onSuccess={() => {
          onCreated?.();
          onClose();
        }}
      />
    </Modal>
  );
}
