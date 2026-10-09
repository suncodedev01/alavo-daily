use alavo_domain::shared::error::ErrorCode;
use alavo_infrastructure::persistence::repositories::recipes::photos::find_photo;

use super::*;
use crate::recipes::catalog::{self, delete};
use crate::recipes::test_support::{
    all_event_count, assert_code, create_recipe, event_count, recipe_input,
    with_ctx,
};

const PHOTO: &str = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
const OTHER_PHOTO: &str = "data:image/png;base64,iVBORw0KGgo=";

fn photo_of(ctx: &Ctx, id: &str) -> Option<String> {
    catalog::get(ctx, id).unwrap().photo
}

#[test]
fn a_recipe_starts_without_a_photo() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        assert_eq!(photo_of(ctx, &id), None);
    });
}

#[test]
fn set_photo_returns_the_recipe_with_the_photo_and_get_keeps_it() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let recipe = set_photo(ctx, &id, Some(PHOTO)).unwrap();
        assert_eq!(recipe.photo.as_deref(), Some(PHOTO));
        assert_eq!(photo_of(ctx, &id).as_deref(), Some(PHOTO));
    });
}

#[test]
fn the_first_photo_is_an_insert_event_and_a_replacement_an_update_event() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        assert_eq!(event_count(ctx, "photo", "insert"), 1);
        set_photo(ctx, &id, Some(OTHER_PHOTO)).unwrap();
        assert_eq!(event_count(ctx, "photo", "update"), 1);
        assert_eq!(photo_of(ctx, &id).as_deref(), Some(OTHER_PHOTO));
    });
}

#[test]
fn setting_the_same_photo_again_records_nothing() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        let events = all_event_count(ctx);
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn removing_the_photo_soft_deletes_it_with_one_delete_event() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        let recipe = set_photo(ctx, &id, None).unwrap();
        assert_eq!(recipe.photo, None);
        assert_eq!(event_count(ctx, "photo", "delete"), 1);
        let rows = ctx.db.query("SELECT deleted_at FROM recipes_photos", &[]).unwrap();
        assert!(rows[0].opt_int("deleted_at").unwrap().is_some());
    });
}

#[test]
fn removing_a_photo_that_is_not_there_does_nothing() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        let events = all_event_count(ctx);
        set_photo(ctx, &id, None).unwrap();
        assert_eq!(all_event_count(ctx), events);
    });
}

#[test]
fn a_photo_can_be_set_again_after_it_was_removed() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        set_photo(ctx, &id, None).unwrap();
        set_photo(ctx, &id, Some(OTHER_PHOTO)).unwrap();
        assert_eq!(photo_of(ctx, &id).as_deref(), Some(OTHER_PHOTO));
    });
}

#[test]
fn a_bad_photo_is_rejected_and_the_old_one_stays() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        assert_code(set_photo(ctx, &id, Some("https://example.com/a.jpg")), ErrorCode::Validation);
        let too_big = format!("data:image/jpeg;base64,{}", "A".repeat(500 * 1024));
        assert_code(set_photo(ctx, &id, Some(&too_big)), ErrorCode::Validation);
        assert_eq!(photo_of(ctx, &id).as_deref(), Some(PHOTO));
    });
}

#[test]
fn a_photo_for_an_unknown_recipe_is_not_found() {
    with_ctx(|ctx| assert_code(set_photo(ctx, "nope", Some(PHOTO)), ErrorCode::NotFound));
}

#[test]
fn updating_the_recipe_keeps_its_photo() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        let input = recipe_input("Gà rang");
        catalog::update(ctx, &id, input).unwrap();
        assert_eq!(photo_of(ctx, &id).as_deref(), Some(PHOTO));
    });
}

#[test]
fn deleting_the_recipe_deletes_its_photo_too() {
    with_ctx(|ctx| {
        let id = create_recipe(ctx, "Gà kho").summary.id;
        set_photo(ctx, &id, Some(PHOTO)).unwrap();
        delete(ctx, &id).unwrap();
        assert_eq!(event_count(ctx, "photo", "delete"), 1);
        assert_eq!(find_photo(ctx.db, &id).unwrap(), None);
    });
}
