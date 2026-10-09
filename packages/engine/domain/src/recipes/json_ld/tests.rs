use super::*;
use crate::recipes::kinds::Aisle;
use crate::shared::error::ErrorCode;

const VIETNAMESE_BLOG: &str = r#"{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Gà kho gừng",
  "description": "Món <b>kho</b> đưa cơm, nấu trong 40 phút.",
  "prepTime": "PT15M",
  "cookTime": "PT40M",
  "totalTime": "PT55M",
  "recipeYield": "4 người ăn",
  "recipeCategory": "Món chính",
  "keywords": "gà kho, món kho, đưa cơm",
  "nutrition": { "@type": "NutritionInformation", "calories": "420 kcal" },
  "recipeIngredient": [
    "600 g đùi gà",
    "50 g gừng",
    "3 củ hành tím",
    "2 muỗng canh nước mắm",
    "1/2 muỗng cà phê tiêu xay"
  ],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Rửa gà, chặt miếng vừa ăn." },
    { "@type": "HowToStep", "text": "Phi thơm hành và gừng, cho gà vào xào." },
    { "@type": "HowToStep", "text": "Kho liu riu đến khi nước sệt." }
  ]
}"#;

const YOAST_GRAPH: &str = r#"{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "name": "Kitchen Notes", "url": "https://example.test/" },
    { "@type": "Article", "headline": "The best pancakes" },
    {
      "@type": ["Recipe"],
      "name": "Fluffy Pancakes &amp; Syrup",
      "description": "Light pancakes for a lazy weekend.",
      "prepTime": "PT10M",
      "cookTime": "PT20M",
      "recipeYield": ["4", "4 servings"],
      "recipeCategory": ["Breakfast", "Dessert"],
      "recipeCuisine": ["American"],
      "keywords": "pancakes, breakfast, Breakfast",
      "recipeIngredient": [
        "1 ½ cups all-purpose flour",
        "3 1/2 tsp baking powder",
        "1 tbsp white sugar",
        "1 1/4 cups milk",
        "1 egg",
        "3 tbsp butter, melted"
      ],
      "recipeInstructions": [
        { "@type": "HowToSection", "name": "Batter", "itemListElement": [
          { "@type": "HowToStep", "text": "Sift the flour, baking powder and sugar." },
          { "@type": "HowToStep", "text": "Whisk in the milk, egg and butter." }
        ]},
        { "@type": "HowToSection", "name": "Cook", "itemListElement": [
          { "@type": "HowToStep", "text": "Pour 1/4 cup of batter on a hot griddle." }
        ]}
      ],
      "nutrition": { "@type": "NutritionInformation", "calories": 270 }
    }
  ]
}"#;

const PLAIN_TEXT_STEPS: &str = r#"[
  { "@type": "BreadcrumbList", "itemListElement": [] },
  {
    "@type": "Recipe",
    "name": "Rau muống xào tỏi",
    "totalTime": "PT10M",
    "recipeYield": 2,
    "recipeIngredient": ["1 bó rau muống", "5 tép tỏi", "Hạt nêm", "  "],
    "recipeInstructions": "Nhặt và rửa rau.\nPhi thơm tỏi.\n<p>Xào lửa lớn.</p>"
  }
]"#;

fn parse(json: &str) -> RecipeInput {
    parse_recipe(json).unwrap().expect("a recipe")
}

fn ingredient_summary(input: &RecipeInput) -> Vec<(f64, &str, &str)> {
    let summary = input.ingredients.iter();
    summary.map(|item| (item.quantity, item.unit.as_str(), item.name.as_str())).collect()
}

#[test]
fn reads_a_vietnamese_recipe_page() {
    let recipe = parse(VIETNAMESE_BLOG);
    assert_eq!(recipe.body.name, "Gà kho gừng");
    assert_eq!(recipe.body.note, "Món kho đưa cơm, nấu trong 40 phút.");
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (15, 40));
    assert_eq!(recipe.body.servings, 4);
    assert_eq!(recipe.body.kcal, Some(420));
    assert_eq!(recipe.body.tags, ["Món chính", "gà kho", "món kho", "đưa cơm"]);
    assert_eq!(recipe.steps.len(), 3);
    assert_eq!(recipe.steps[0].text, "Rửa gà, chặt miếng vừa ăn.");
}

#[test]
fn splits_vietnamese_ingredient_lines_into_quantity_unit_and_name() {
    let recipe = parse(VIETNAMESE_BLOG);
    assert_eq!(
        ingredient_summary(&recipe),
        [
            (600.0, "g", "đùi gà"),
            (50.0, "g", "gừng"),
            (3.0, "củ", "hành tím"),
            (2.0, "muỗng canh", "nước mắm"),
            (0.5, "muỗng cà phê", "tiêu xay"),
        ]
    );
}

#[test]
fn finds_the_recipe_inside_a_graph_next_to_other_nodes() {
    let recipe = parse(YOAST_GRAPH);
    assert_eq!(recipe.body.name, "Fluffy Pancakes & Syrup");
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (10, 20));
    assert_eq!(recipe.body.servings, 4);
    assert_eq!(recipe.body.kcal, Some(270));
}

#[test]
fn reads_english_ingredients_with_mixed_numbers() {
    let recipe = parse(YOAST_GRAPH);
    assert_eq!(
        ingredient_summary(&recipe),
        [
            (1.5, "cups", "all-purpose flour"),
            (3.5, "tsp", "baking powder"),
            (1.0, "tbsp", "white sugar"),
            (1.25, "cups", "milk"),
            (1.0, "phần", "egg"),
            (3.0, "tbsp", "butter, melted"),
        ]
    );
}

#[test]
fn flattens_instruction_sections_in_order() {
    let steps: Vec<_> = parse(YOAST_GRAPH).steps.into_iter().map(|step| step.text).collect();
    assert_eq!(
        steps,
        [
            "Sift the flour, baking powder and sugar.",
            "Whisk in the milk, egg and butter.",
            "Pour 1/4 cup of batter on a hot griddle.",
        ]
    );
}

#[test]
fn merges_category_and_keywords_without_case_duplicates() {
    assert_eq!(parse(YOAST_GRAPH).body.tags, ["Breakfast", "Dessert", "pancakes"]);
}

#[test]
fn finds_the_recipe_in_a_top_level_array() {
    let recipe = parse(PLAIN_TEXT_STEPS);
    assert_eq!(recipe.body.name, "Rau muống xào tỏi");
    assert_eq!(recipe.body.servings, 2);
}

#[test]
fn a_total_time_alone_counts_as_cooking_time() {
    let recipe = parse(PLAIN_TEXT_STEPS);
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (0, 10));
}

#[test]
fn a_total_time_is_ignored_when_prep_or_cook_is_known() {
    let json = r#"{"@type":"Recipe","name":"A","prepTime":"PT5M","totalTime":"PT30M"}"#;
    let recipe = parse(json);
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (5, 0));
}

#[test]
fn text_instructions_become_one_step_per_line_and_blank_ingredients_are_skipped() {
    let recipe = parse(PLAIN_TEXT_STEPS);
    let steps: Vec<_> = recipe.steps.iter().map(|step| step.text.as_str()).collect();
    assert_eq!(steps, ["Nhặt và rửa rau.", "Phi thơm tỏi.", "Xào lửa lớn."]);
    assert_eq!(recipe.ingredients.len(), 3);
    assert_eq!(recipe.ingredients[2].name, "Hạt nêm");
    assert_eq!(recipe.ingredients[2].unit, "phần");
}

#[test]
fn accepts_full_url_and_prefixed_recipe_types() {
    for kind in ["https://schema.org/Recipe", "schema:Recipe", "http://schema.org/Recipe"] {
        let json = format!(r#"{{"@type":"{kind}","name":"A"}}"#);
        assert_eq!(parse(&json).body.name, "A", "{kind}");
    }
}

#[test]
fn accepts_a_type_list_that_contains_recipe() {
    let json = r#"{"@type":["Thing","Recipe"],"name":"A"}"#;
    assert_eq!(parse(json).body.name, "A");
}

#[test]
fn yield_formats_are_understood() {
    let cases = [
        ("4", 4),
        (r#""6""#, 6),
        (r#""4 servings""#, 4),
        (r#""Makes 12 cookies""#, 12),
        (r#"["8", "8 servings"]"#, 8),
        ("3.0", 3),
    ];
    for (value, expected) in cases {
        let json = format!(r#"{{"@type":"Recipe","name":"A","recipeYield":{value}}}"#);
        assert_eq!(parse(&json).body.servings, expected, "{value}");
    }
}

#[test]
fn a_missing_or_unreadable_yield_defaults_to_two_servings() {
    for json in [
        r#"{"@type":"Recipe","name":"A"}"#,
        r#"{"@type":"Recipe","name":"A","recipeYield":"a few"}"#,
        r#"{"@type":"Recipe","name":"A","recipeYield":null}"#,
    ] {
        assert_eq!(parse(json).body.servings, 2, "{json}");
    }
}

#[test]
fn an_extreme_yield_is_clamped_to_the_allowed_servings() {
    let zero = r#"{"@type":"Recipe","name":"A","recipeYield":0}"#;
    let huge = r#"{"@type":"Recipe","name":"A","recipeYield":"100 cookies"}"#;
    assert_eq!(parse(zero).body.servings, 1);
    assert_eq!(parse(huge).body.servings, 50);
}

#[test]
fn unreadable_times_are_zero() {
    let json = r#"{"@type":"Recipe","name":"A","prepTime":"half an hour","cookTime":30}"#;
    let recipe = parse(json);
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (0, 0));
}

#[test]
fn hours_and_minutes_are_added_up() {
    let json = r#"{"@type":"Recipe","name":"A","cookTime":"PT2H30M","prepTime":"PT1H"}"#;
    let recipe = parse(json);
    assert_eq!((recipe.body.prep_min, recipe.body.cook_min), (60, 150));
}

#[test]
fn a_recipe_with_only_a_name_is_still_a_draft() {
    let recipe = parse(r#"{"@type":"Recipe","name":"Just a name"}"#);
    assert!(recipe.ingredients.is_empty() && recipe.steps.is_empty());
    assert_eq!(recipe.body.kcal, None);
    assert_eq!(recipe.body.level, RecipeLevel::Medium);
    assert_eq!(recipe.body.icon, "cooking-pot");
}

#[test]
fn the_legacy_ingredients_field_is_read_when_recipe_ingredient_is_absent() {
    let json = r#"{"@type":"Recipe","name":"A","ingredients":["2 cups rice"]}"#;
    assert_eq!(ingredient_summary(&parse(json)), [(2.0, "cups", "rice")]);
}

#[test]
fn parsed_ingredients_default_to_the_other_aisle_with_no_cost() {
    let recipe = parse(VIETNAMESE_BLOG);
    assert!(recipe.ingredients.iter().all(|item| item.aisle == Aisle::Other));
    assert!(recipe.ingredients.iter().all(|item| item.cost_vnd.vnd() == 0));
}

#[test]
fn at_most_ten_tags_are_kept() {
    let words: Vec<String> = (1..=15).map(|n| format!("tag{n}")).collect();
    let json = format!(r#"{{"@type":"Recipe","name":"A","keywords":"{}"}}"#, words.join(", "));
    assert_eq!(parse(&json).body.tags.len(), 10);
}

#[test]
fn no_recipe_means_none() {
    let documents = [
        r#"{"@type":"Article","headline":"Hi"}"#,
        r#"{"@graph":[{"@type":"WebSite"}]}"#,
        r#"[]"#,
        r#"{}"#,
        r#""just a string""#,
        r#"42"#,
        r#"null"#,
        r#"{"@type":"RecipeCollection","name":"A"}"#,
        r#"{"@type":42,"name":"A"}"#,
    ];
    for document in documents {
        assert!(parse_recipe(document).unwrap().is_none(), "{document}");
    }
}

#[test]
fn text_that_is_not_json_is_a_validation_error() {
    for text in ["", "<html></html>", "{\"@type\": ", "not json"] {
        let error = parse_recipe(text).unwrap_err();
        assert_eq!(error.code, ErrorCode::Validation, "{text}");
    }
}

#[test]
fn the_draft_serializes_to_the_recipe_input_contract() {
    let value = serde_json::to_value(parse(VIETNAMESE_BLOG)).unwrap();
    assert_eq!(value["prepMin"], 15);
    assert_eq!(value["level"], "medium");
    assert_eq!(value["ingredients"][0]["aisle"], "other");
    assert_eq!(value["ingredients"][0]["costVnd"], 0);
    assert_eq!(value["steps"][0]["timerMin"], 0);
}
