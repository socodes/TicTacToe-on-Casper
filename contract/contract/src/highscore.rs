#![no_main]
#![no_std]

extern crate alloc;

use alloc::string::ToString;
use alloc::vec;
use casper_contract::{
    contract_api::{
        runtime::{self, get_caller},
        storage::{self, dictionary_get, dictionary_put},
    },
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::{
    CLType, CLTyped, EntryPoint, EntryPointAccess, EntryPointType, EntryPoints, Parameter, U512,
};

#[no_mangle]
pub extern "C" fn add_highscore() {
    let dictionary_uref = match runtime::get_key("highscore_dictionary") {
        Some(uref_key) => uref_key.into_uref().unwrap_or_revert(),
        None => storage::new_dictionary("highscore_dictionary").unwrap_or_revert(),
    };
    let score: U512 = runtime::get_named_arg("score");
    if score
        > dictionary_get::<U512>(dictionary_uref, &get_caller().to_string())
            .unwrap_or_revert()
            .unwrap_or_default()
    {
        dictionary_put(dictionary_uref, &get_caller().to_string(), score);
    }
}

#[no_mangle]
pub extern "C" fn call() {
    let mut entry_points = EntryPoints::new();
    entry_points.add_entry_point(EntryPoint::new(
        "add_highscore",
        vec![Parameter::new("score", U512::cl_type())],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        None,
        Some("contract_package_hash".to_string()),
        Some("access_token".to_string()),
    );
    runtime::put_key("highscore_contract", contract_hash.into());
    runtime::put_key("highscore_contract_wrapped", storage::new_uref(contract_hash).into());
}
