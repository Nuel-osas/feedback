module tideform::events;

use sui::event;
use std::string::String;

public struct FormCreated has copy, drop {
    form_id: ID,
    owner: address,
    schema_blob_id: vector<u8>,
}

public struct FormUpdated has copy, drop {
    form_id: ID,
    new_schema_blob_id: vector<u8>,
    version: u64,
}

public struct FormStatusChanged has copy, drop {
    form_id: ID,
    status: u8,
}

public struct AdminAdded has copy, drop {
    form_id: ID,
    admin: address,
}

public struct AdminRemoved has copy, drop {
    form_id: ID,
    admin: address,
}

public struct SubmissionReceived has copy, drop {
    form_id: ID,
    submission_id: ID,
    blob_id: vector<u8>,
    submitter: address,
    submitted_at_ms: u64,
}

public struct SubmissionStatusChanged has copy, drop {
    submission_id: ID,
    status: u8,
}

public struct SubmissionPriorityChanged has copy, drop {
    submission_id: ID,
    priority: u8,
}

public struct SubmissionTagged has copy, drop {
    submission_id: ID,
    tag: String,
}

public struct NotesAttached has copy, drop {
    submission_id: ID,
    notes_blob_id: vector<u8>,
}

public(package) fun emit_form_created(form_id: ID, owner: address, schema_blob_id: vector<u8>) {
    event::emit(FormCreated { form_id, owner, schema_blob_id });
}

public(package) fun emit_form_updated(form_id: ID, new_schema_blob_id: vector<u8>, version: u64) {
    event::emit(FormUpdated { form_id, new_schema_blob_id, version });
}

public(package) fun emit_form_status_changed(form_id: ID, status: u8) {
    event::emit(FormStatusChanged { form_id, status });
}

public(package) fun emit_admin_added(form_id: ID, admin: address) {
    event::emit(AdminAdded { form_id, admin });
}

public(package) fun emit_admin_removed(form_id: ID, admin: address) {
    event::emit(AdminRemoved { form_id, admin });
}

public(package) fun emit_submission_received(
    form_id: ID,
    submission_id: ID,
    blob_id: vector<u8>,
    submitter: address,
    submitted_at_ms: u64,
) {
    event::emit(SubmissionReceived { form_id, submission_id, blob_id, submitter, submitted_at_ms });
}

public(package) fun emit_submission_status_changed(submission_id: ID, status: u8) {
    event::emit(SubmissionStatusChanged { submission_id, status });
}

public(package) fun emit_submission_priority_changed(submission_id: ID, priority: u8) {
    event::emit(SubmissionPriorityChanged { submission_id, priority });
}

public(package) fun emit_submission_tagged(submission_id: ID, tag: String) {
    event::emit(SubmissionTagged { submission_id, tag });
}

public(package) fun emit_notes_attached(submission_id: ID, notes_blob_id: vector<u8>) {
    event::emit(NotesAttached { submission_id, notes_blob_id });
}
