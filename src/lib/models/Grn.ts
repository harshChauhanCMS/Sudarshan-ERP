import mongoose, { Schema } from "mongoose";

/**
 * Goods Receipt Note — the record that goods physically arrived.
 *
 * One GRN per verified vendor invoice, created only when that invoice passes
 * verification. Never created for an invoice that was merely raised, failed or
 * sent back. Rows are immutable history: a correction is a new receipt, never
 * an edit, and a number is never reused.
 *
 * Two unique indexes carry the integrity rules the flow depends on:
 *  - `grnNo`     — numbers are unique for all time.
 *  - `invoiceId` — an invoice can only ever have one GRN, so a repeated or
 *                  retried verification cannot mint a second one.
 */
const GrnSchema = new Schema(
  {
    grnNo: { type: String, required: true, unique: true, trim: true },
    /** Internal invoice id (INV-<po>-<n>) this receipt was raised from. */
    invoiceId: { type: String, required: true, unique: true, trim: true, index: true },
    /** The vendor's own invoice number, for the printed document. */
    invoiceNo: { type: String, trim: true, default: "" },
    poId: { type: String, required: true, trim: true, index: true },
    vendor: { type: String, trim: true, default: "" },

    materialCode: { type: String, trim: true, default: "" },
    materialName: { type: String, trim: true, default: "" },
    receivedQty: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: "" },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },

    receivedAt: { type: Date, required: true },
    receivedByEmail: { type: String, trim: true, default: "" },
    receivedByName: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },

    /**
     * Claimed once, by whichever request got there first — this is what keeps
     * stock from being added twice when a verification is retried.
     */
    stockApplied: { type: Boolean, default: false },
    stockCode: { type: String, trim: true, default: "" },
    stockKind: { type: String, trim: true, default: "" },
    stockPrevious: { type: Number },
    stockNew: { type: Number },
  },
  { timestamps: true },
);

GrnSchema.index({ poId: 1, receivedAt: -1 });

// Next.js HMR can cache a stale schema across reloads in dev.
if (mongoose.models.Grn && !mongoose.models.Grn.schema.path("stockApplied")) {
  mongoose.deleteModel("Grn");
}

export default mongoose.models.Grn || mongoose.model("Grn", GrnSchema);
