#[test_only]
module tideform::form_tests;

use sui::clock;
use sui::test_scenario as ts;
use tideform::form::{Self, Form};
use tideform::submission::{Self, Submission};

const OWNER: address = @0xA;
const ALICE: address = @0xB;
const BOB: address = @0xC;

#[test]
fun create_form_succeeds() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());

    form::create(b"schema_blob_1", false, false, &clk, scenario.ctx());

    scenario.next_tx(OWNER);
    let form = scenario.take_shared<Form>();
    assert!(form::owner(&form) == OWNER, 0);
    assert!(form::version(&form) == 1, 0);
    assert!(form::status(&form) == form::status_open(), 0);
    assert!(form::is_admin(&form, OWNER), 0);
    assert!(form::submissions_count(&form) == 0, 0);
    ts::return_shared(form);

    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
fun add_and_remove_admin() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());

    form::create(b"schema", false, false, &clk, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut form = scenario.take_shared<Form>();
    form::add_admin(&mut form, ALICE, scenario.ctx());
    assert!(form::is_admin(&form, ALICE), 0);

    form::remove_admin(&mut form, ALICE, scenario.ctx());
    assert!(!form::is_admin(&form, ALICE), 0);

    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = tideform::form::ENotOwner)]
fun add_admin_non_owner_fails() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());
    form::create(b"schema", false, false, &clk, scenario.ctx());

    scenario.next_tx(ALICE);
    let mut form = scenario.take_shared<Form>();
    form::add_admin(&mut form, BOB, scenario.ctx());

    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = tideform::form::ECannotRemoveOwner)]
fun cannot_remove_owner() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());
    form::create(b"schema", false, false, &clk, scenario.ctx());

    scenario.next_tx(OWNER);
    let mut form = scenario.take_shared<Form>();
    form::remove_admin(&mut form, OWNER, scenario.ctx());

    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
fun submit_and_admin_actions() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());

    form::create(b"schema", false, false, &clk, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut form = scenario.take_shared<Form>();
    scenario.next_tx(ALICE);
    submission::submit(&mut form, b"submission_1", &clk, scenario.ctx());
    assert!(form::submissions_count(&form) == 1, 0);

    scenario.next_tx(OWNER);
    let mut sub = scenario.take_shared<Submission>();
    submission::set_status(&form, &mut sub, submission::status_resolved(), scenario.ctx());
    assert!(submission::status(&sub) == submission::status_resolved(), 0);

    submission::set_priority(&form, &mut sub, submission::priority_high(), scenario.ctx());
    assert!(submission::priority(&sub) == submission::priority_high(), 0);

    submission::attach_notes(&form, &mut sub, b"notes_blob", scenario.ctx());
    assert!(submission::has_notes(&sub), 0);

    ts::return_shared(sub);
    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = tideform::form::EFormClosed)]
fun cannot_submit_to_closed_form() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());

    form::create(b"schema", false, false, &clk, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut form = scenario.take_shared<Form>();
    form::set_status(&mut form, form::status_closed(), scenario.ctx());

    scenario.next_tx(ALICE);
    submission::submit(&mut form, b"sub", &clk, scenario.ctx());

    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}

#[test]
#[expected_failure(abort_code = tideform::form::ENotAdmin)]
fun non_admin_cannot_set_status() {
    let mut scenario = ts::begin(OWNER);
    let clk = clock::create_for_testing(scenario.ctx());
    form::create(b"schema", false, false, &clk, scenario.ctx());
    scenario.next_tx(OWNER);

    let mut form = scenario.take_shared<Form>();
    scenario.next_tx(ALICE);
    submission::submit(&mut form, b"sub", &clk, scenario.ctx());

    scenario.next_tx(BOB);
    let mut sub = scenario.take_shared<Submission>();
    submission::set_status(&form, &mut sub, submission::status_resolved(), scenario.ctx());

    ts::return_shared(sub);
    ts::return_shared(form);
    clock::destroy_for_testing(clk);
    scenario.end();
}
