module tideform::acl;

use tideform::form::{Self, Form};

const ENotAdmin: u64 = 1;
const EIdentityMismatch: u64 = 2;

/// Seal `seal_approve*` entry function.
///
/// Key servers dry-run this PTB before releasing decryption keys.
/// We approve iff:
///   1. The first 32 bytes of `id` are the form's object ID bytes (binds the
///      ciphertext to this specific form — prevents replaying keys across forms).
///   2. The caller is in `form.admins`.
public fun seal_approve(form: &Form, id: vector<u8>, ctx: &TxContext) {
    let form_id_bytes = object::id(form).to_bytes();
    let id_len = id.length();
    let prefix_len = form_id_bytes.length();
    assert!(id_len >= prefix_len, EIdentityMismatch);

    let mut i = 0;
    while (i < prefix_len) {
        assert!(id[i] == form_id_bytes[i], EIdentityMismatch);
        i = i + 1;
    };

    assert!(form::is_admin(form, ctx.sender()), ENotAdmin);
}
