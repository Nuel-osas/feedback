import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID } from "./sui";

const CLOCK_ID = "0x6";

export function txCreateForm(args: {
  schemaBlobId: string;
  requireWallet: boolean;
  onePerWallet: boolean;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form::create`,
    arguments: [
      tx.pure.vector("u8", new TextEncoder().encode(args.schemaBlobId)),
      tx.pure.bool(args.requireWallet),
      tx.pure.bool(args.onePerWallet),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function txUpdateSchema(args: {
  formId: string;
  newSchemaBlobId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form::update_schema`,
    arguments: [
      tx.object(args.formId),
      tx.pure.vector("u8", new TextEncoder().encode(args.newSchemaBlobId)),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function txSetFormStatus(args: { formId: string; status: 0 | 1 | 2 }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form::set_status`,
    arguments: [tx.object(args.formId), tx.pure.u8(args.status)],
  });
  return tx;
}

export function txAddAdmin(args: { formId: string; admin: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form::add_admin`,
    arguments: [tx.object(args.formId), tx.pure.address(args.admin)],
  });
  return tx;
}

export function txRemoveAdmin(args: { formId: string; admin: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::form::remove_admin`,
    arguments: [tx.object(args.formId), tx.pure.address(args.admin)],
  });
  return tx;
}

export function txSubmit(args: { formId: string; blobId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission::submit`,
    arguments: [
      tx.object(args.formId),
      tx.pure.vector("u8", new TextEncoder().encode(args.blobId)),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function txSubmissionStatus(args: {
  formId: string;
  submissionId: string;
  status: 0 | 1 | 2 | 3;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission::set_status`,
    arguments: [
      tx.object(args.formId),
      tx.object(args.submissionId),
      tx.pure.u8(args.status),
    ],
  });
  return tx;
}

export function txSubmissionPriority(args: {
  formId: string;
  submissionId: string;
  priority: 0 | 1 | 2 | 3;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission::set_priority`,
    arguments: [
      tx.object(args.formId),
      tx.object(args.submissionId),
      tx.pure.u8(args.priority),
    ],
  });
  return tx;
}

export function txAttachNotes(args: {
  formId: string;
  submissionId: string;
  notesBlobId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission::attach_notes`,
    arguments: [
      tx.object(args.formId),
      tx.object(args.submissionId),
      tx.pure.vector("u8", new TextEncoder().encode(args.notesBlobId)),
    ],
  });
  return tx;
}

export function txAddTag(args: {
  formId: string;
  submissionId: string;
  tag: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::submission::add_tag`,
    arguments: [
      tx.object(args.formId),
      tx.object(args.submissionId),
      tx.pure.string(args.tag),
    ],
  });
  return tx;
}
