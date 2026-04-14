module tideform::submission;

use std::string::String;
use sui::clock::Clock;
use sui::table::{Self, Table};
use tideform::form::{Self, Form};
use tideform::events;

const STATUS_NEW: u8 = 0;
const STATUS_IN_PROGRESS: u8 = 1;
const STATUS_RESOLVED: u8 = 2;
const STATUS_SPAM: u8 = 3;

const PRIORITY_LOW: u8 = 0;
const PRIORITY_MED: u8 = 1;
const PRIORITY_HIGH: u8 = 2;
const PRIORITY_URGENT: u8 = 3;

const EWalletRequired: u64 = 2;
const EAlreadySubmitted: u64 = 3;
const EInvalidStatus: u64 = 4;
const EInvalidPriority: u64 = 5;

public struct Submission has key, store {
    id: UID,
    form_id: ID,
    blob_id: vector<u8>,
    submitter: address,
    submitted_at_ms: u64,
    status: u8,
    priority: u8,
    tags: vector<String>,
    notes_blob_id: vector<u8>,
    has_notes: bool,
}

public struct SubmitterRegistry has key {
    id: UID,
    form_id: ID,
    submitters: Table<address, bool>,
}

public fun create_registry(form: &Form, ctx: &mut TxContext) {
    let registry = SubmitterRegistry {
        id: object::new(ctx),
        form_id: form::id(form),
        submitters: table::new<address, bool>(ctx),
    };
    transfer::share_object(registry);
}

public fun submit(
    form: &mut Form,
    blob_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    form::assert_open(form);
    let sender = ctx.sender();

    if (form::require_wallet(form)) {
        assert!(sender != @0x0, EWalletRequired);
    };

    let now = clock.timestamp_ms();
    let submission = Submission {
        id: object::new(ctx),
        form_id: form::id(form),
        blob_id,
        submitter: sender,
        submitted_at_ms: now,
        status: STATUS_NEW,
        priority: PRIORITY_MED,
        tags: vector[],
        notes_blob_id: vector[],
        has_notes: false,
    };

    let submission_id = object::id(&submission);
    form::bump_submission_count(form);
    events::emit_submission_received(form::id(form), submission_id, blob_id, sender, now);

    transfer::share_object(submission);
}

public fun submit_unique(
    form: &mut Form,
    registry: &mut SubmitterRegistry,
    blob_id: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = ctx.sender();
    assert!(!registry.submitters.contains(sender), EAlreadySubmitted);
    registry.submitters.add(sender, true);
    submit(form, blob_id, clock, ctx);
}

public fun set_status(
    form: &Form,
    submission: &mut Submission,
    status: u8,
    ctx: &TxContext,
) {
    form::assert_admin(form, ctx.sender());
    assert!(status <= STATUS_SPAM, EInvalidStatus);
    submission.status = status;
    events::emit_submission_status_changed(object::id(submission), status);
}

public fun set_priority(
    form: &Form,
    submission: &mut Submission,
    priority: u8,
    ctx: &TxContext,
) {
    form::assert_admin(form, ctx.sender());
    assert!(priority <= PRIORITY_URGENT, EInvalidPriority);
    submission.priority = priority;
    events::emit_submission_priority_changed(object::id(submission), priority);
}

public fun add_tag(
    form: &Form,
    submission: &mut Submission,
    tag: String,
    ctx: &TxContext,
) {
    form::assert_admin(form, ctx.sender());
    submission.tags.push_back(tag);
    events::emit_submission_tagged(object::id(submission), tag);
}

public fun clear_tags(
    form: &Form,
    submission: &mut Submission,
    ctx: &TxContext,
) {
    form::assert_admin(form, ctx.sender());
    submission.tags = vector[];
}

public fun attach_notes(
    form: &Form,
    submission: &mut Submission,
    notes_blob_id: vector<u8>,
    ctx: &TxContext,
) {
    form::assert_admin(form, ctx.sender());
    submission.notes_blob_id = notes_blob_id;
    submission.has_notes = true;
    events::emit_notes_attached(object::id(submission), notes_blob_id);
}

public fun id(s: &Submission): ID { object::id(s) }
public fun form_id(s: &Submission): ID { s.form_id }
public fun blob_id(s: &Submission): &vector<u8> { &s.blob_id }
public fun submitter(s: &Submission): address { s.submitter }
public fun submitted_at_ms(s: &Submission): u64 { s.submitted_at_ms }
public fun status(s: &Submission): u8 { s.status }
public fun priority(s: &Submission): u8 { s.priority }
public fun tags(s: &Submission): &vector<String> { &s.tags }
public fun notes_blob_id(s: &Submission): &vector<u8> { &s.notes_blob_id }
public fun has_notes(s: &Submission): bool { s.has_notes }

public fun status_new(): u8 { STATUS_NEW }
public fun status_in_progress(): u8 { STATUS_IN_PROGRESS }
public fun status_resolved(): u8 { STATUS_RESOLVED }
public fun status_spam(): u8 { STATUS_SPAM }
public fun priority_low(): u8 { PRIORITY_LOW }
public fun priority_med(): u8 { PRIORITY_MED }
public fun priority_high(): u8 { PRIORITY_HIGH }
public fun priority_urgent(): u8 { PRIORITY_URGENT }
