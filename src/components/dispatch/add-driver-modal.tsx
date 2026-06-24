"use client";

import { useState } from "react";
import { message } from "antd";
import { EntityFormModal } from "@/components/forms/entity-form-modal";
import { FormField, FormGrid, FormInput } from "@/components/forms/field";
import { useFormState } from "@/components/forms/use-form-state";
import { createDriver } from "@/lib/driver-api";
import {
  normalizeDriverPayload,
  sanitizeDriverMobile,
  sanitizeDriverName,
  sanitizeVehicleNumber,
  validateDriverForm,
} from "@/lib/driver-validation";

type DriverFormValues = {
  name: string;
  email: string;
  mobile: string;
  vehicleNumber: string;
  vehicleCategory: string;
};

const INITIAL: DriverFormValues = {
  name: "",
  email: "",
  mobile: "",
  vehicleNumber: "",
  vehicleCategory: "",
};

type AddDriverModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export function AddDriverModal({ open, onClose, onSaved }: AddDriverModalProps) {
  const form = useFormState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const validationError = validateDriverForm(form.values);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = normalizeDriverPayload(form.values);

    setSaving(true);
    setError(null);
    try {
      await createDriver(payload);
      message.success("Driver saved successfully");
      form.reset();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormModal
      open={open}
      onClose={handleClose}
      title="Add driver"
      sub="Register a driver with vehicle details for dispatch assignment"
      wide
      submitLabel="Save driver"
      saving={saving}
      error={error}
      onSubmit={handleSubmit}
    >
      <FormGrid>
        <FormField label="Name">
          <FormInput
            value={form.values.name}
            onChange={(v) => form.setField("name", sanitizeDriverName(v))}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Email">
          <FormInput
            type="email"
            value={form.values.email}
            onChange={(v) => form.setField("email", v)}
            placeholder="driver@example.com"
          />
        </FormField>
        <FormField label="Mobile number">
          <FormInput
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={form.values.mobile}
            onChange={(v) => form.setField("mobile", sanitizeDriverMobile(v))}
            placeholder="9876543210"
          />
        </FormField>
        <FormField label="Vehicle number">
          <FormInput
            value={form.values.vehicleNumber}
            onChange={(v) => form.setField("vehicleNumber", sanitizeVehicleNumber(v))}
            placeholder="GJ-01-AB-1234"
          />
        </FormField>
        <FormField label="Vehicle category">
          <FormInput
            value={form.values.vehicleCategory}
            onChange={(v) => form.setField("vehicleCategory", v)}
            placeholder="e.g. 12 MT truck, tanker, trailer"
          />
        </FormField>
      </FormGrid>
    </EntityFormModal>
  );
}
