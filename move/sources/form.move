module tideform::form;

use sui::clock::Clock;
use sui::vec_set::{Self, VecSet};
use tideform::events;

const STATUS_OPEN: u8 = 0;
const STATUS_CLOSED: u8 = 1;
const STATUS_ARCHIVED: u8 = 2;

const ENotOwner: u64 = 1;
const ENotAdmin: u64 = 2;
const EAlreadyAdmin: u64 = 3;
const ENotAdminMember: u64 = 4;
const ECannotRemoveOwner: u64 = 5;
const EFormClosed: u64 = 6;
const EInvalidStatus: u64 = 7;

public struct Form has key {
    id: UID,
    owner: address,
    admins: VecSet<address>,
    schema_blob_id: vector<u8>,
    created_at_ms: u64,
    updated_at_ms: u64,
    version: u64,
    status: u8,
    submissions_count: u64,
    require_wallet: bool,
    one_per_wallet: bool,
}

public fun create(
    schema_blob_id: vector<u8>,
    require_wallet: bool,
    one_per_wallet: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let owner = ctx.sender();
    let now = clock.timestamp_ms();
    let mut admins = vec_set::empty<address>();
    admins.insert(owner);

    let form = Form {
        id: object::new(ctx),
        owner,
        admins,
        schema_blob_id,
        created_at_ms: now,
        updated_at_ms: now,
        version: 1,
        status: STATUS_OPEN,
        submissions_count: 0,
        require_wallet,
        one_per_wallet,
    };

    events::emit_form_created(object::id(&form), owner, schema_blob_id);
    transfer::share_object(form);
}

public fun update_schema(
    form: &mut Form,
    new_schema_blob_id: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == form.owner, ENotOwner);
    form.schema_blob_id = new_schema_blob_id;
    form.version = form.version + 1;
    form.updated_at_ms = clock.timestamp_ms();
    events::emit_form_updated(object::id(form), new_schema_blob_id, form.version);
}

public fun set_status(form: &mut Form, status: u8, ctx: &TxContext) {
    assert!(ctx.sender() == form.owner, ENotOwner);
    assert!(status <= STATUS_ARCHIVED, EInvalidStatus);
    form.status = status;
    events::emit_form_status_changed(object::id(form), status);
}

public fun add_admin(form: &mut Form, admin: address, ctx: &TxContext) {
    assert!(ctx.sender() == form.owner, ENotOwner);
    assert!(!form.admins.contains(&admin), EAlreadyAdmin);
    form.admins.insert(admin);
    events::emit_admin_added(object::id(form), admin);
}

public fun remove_admin(form: &mut Form, admin: address, ctx: &TxContext) {
    assert!(ctx.sender() == form.owner, ENotOwner);
    assert!(admin != form.owner, ECannotRemoveOwner);
    assert!(form.admins.contains(&admin), ENotAdminMember);
    form.admins.remove(&admin);
    events::emit_admin_removed(object::id(form), admin);
}

public(package) fun bump_submission_count(form: &mut Form) {
    form.submissions_count = form.submissions_count + 1;
}

public fun assert_open(form: &Form) {
    assert!(form.status == STATUS_OPEN, EFormClosed);
}

public fun assert_admin(form: &Form, who: address) {
    assert!(form.admins.contains(&who), ENotAdmin);
}

public fun id(form: &Form): ID { object::id(form) }
public fun owner(form: &Form): address { form.owner }
public fun admins(form: &Form): &VecSet<address> { &form.admins }
public fun is_admin(form: &Form, who: address): bool { form.admins.contains(&who) }
public fun status(form: &Form): u8 { form.status }
public fun version(form: &Form): u64 { form.version }
public fun schema_blob_id(form: &Form): &vector<u8> { &form.schema_blob_id }
public fun submissions_count(form: &Form): u64 { form.submissions_count }
public fun require_wallet(form: &Form): bool { form.require_wallet }
public fun one_per_wallet(form: &Form): bool { form.one_per_wallet }

public fun status_open(): u8 { STATUS_OPEN }
public fun status_closed(): u8 { STATUS_CLOSED }
public fun status_archived(): u8 { STATUS_ARCHIVED }
