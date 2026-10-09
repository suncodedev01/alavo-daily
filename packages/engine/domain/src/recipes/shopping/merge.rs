use std::collections::HashMap;

use crate::recipes::kinds::Aisle;
use crate::recipes::recipe::Ingredient;
use crate::recipes::shopping::{shopping_key, CustomItem, ShoppingItem, ShoppingList};
use crate::shared::money::Money;

const QUANTITY_DECIMALS: f64 = 10_000.0;

/// One plan entry with the recipe it points to, ready to be scaled.
#[derive(Debug, Clone)]
pub struct PlannedMeal {
    pub recipe_name: String,
    pub recipe_servings: i64,
    pub servings: i64,
    pub ingredients: Vec<Ingredient>,
}

/// Everything the list is built from. Meals must already be in plan order (date, then slot):
/// that order decides the aisle and the `from` order of a merged line.
#[derive(Debug, Clone, Default)]
pub struct ShoppingSources {
    pub meals: Vec<PlannedMeal>,
    pub custom_items: Vec<CustomItem>,
    pub have_flags: HashMap<String, bool>,
}

pub fn build_shopping_list(from: &str, to: &str, sources: &ShoppingSources) -> ShoppingList {
    let mut lines = Lines::default();
    for meal in &sources.meals {
        meal.ingredients.iter().for_each(|ingredient| lines.add(planned_part(meal, ingredient)));
    }
    sources.custom_items.iter().for_each(|item| lines.add(custom_part(item)));
    let mut items = lines.into_items(&sources.have_flags);
    items.sort_by_cached_key(sort_key);
    summarize(from, to, items)
}

struct Part<'a> {
    name: &'a str,
    unit: &'a str,
    aisle: Aisle,
    quantity: f64,
    cost: f64,
    recipe: Option<&'a str>,
    custom: bool,
}

fn planned_part<'a>(meal: &'a PlannedMeal, ingredient: &'a Ingredient) -> Part<'a> {
    let factor = meal.servings as f64 / meal.recipe_servings.max(1) as f64;
    Part {
        name: &ingredient.name,
        unit: &ingredient.unit,
        aisle: ingredient.aisle,
        quantity: ingredient.quantity * factor,
        cost: ingredient.cost_vnd.vnd() as f64 * factor,
        recipe: Some(&meal.recipe_name),
        custom: false,
    }
}

fn custom_part(item: &CustomItem) -> Part<'_> {
    Part {
        name: &item.name,
        unit: &item.unit,
        aisle: item.aisle,
        quantity: item.quantity,
        cost: 0.0,
        recipe: None,
        custom: true,
    }
}

struct Line {
    key: String,
    name: String,
    unit: String,
    aisle: Aisle,
    quantity: f64,
    cost: f64,
    from: Vec<String>,
    custom: bool,
}

#[derive(Default)]
struct Lines {
    lines: Vec<Line>,
    index: HashMap<String, usize>,
}

impl Lines {
    fn add(&mut self, part: Part) {
        let key = shopping_key(part.name, part.unit);
        let position = match self.index.get(&key) {
            Some(position) => *position,
            None => self.start_line(key, &part),
        };
        let line = &mut self.lines[position];
        line.quantity += part.quantity;
        line.cost += part.cost;
        line.custom |= part.custom;
        if let Some(recipe) = part.recipe.filter(|recipe| !line.from.iter().any(|n| n == recipe)) {
            line.from.push(recipe.to_string());
        }
    }

    fn start_line(&mut self, key: String, part: &Part) -> usize {
        self.lines.push(Line {
            key: key.clone(),
            name: part.name.trim().to_string(),
            unit: part.unit.trim().to_string(),
            aisle: part.aisle,
            quantity: 0.0,
            cost: 0.0,
            from: Vec::new(),
            custom: false,
        });
        self.index.insert(key, self.lines.len() - 1);
        self.lines.len() - 1
    }

    fn into_items(self, have_flags: &HashMap<String, bool>) -> Vec<ShoppingItem> {
        self.lines.into_iter().map(|line| finish_line(line, have_flags)).collect()
    }
}

fn finish_line(line: Line, have_flags: &HashMap<String, bool>) -> ShoppingItem {
    let have = have_flags.get(&line.key).copied().unwrap_or(line.aisle == Aisle::Spices);
    ShoppingItem {
        quantity: (line.quantity * QUANTITY_DECIMALS).round() / QUANTITY_DECIMALS,
        cost_vnd: Money(line.cost.round() as i64),
        key: line.key,
        name: line.name,
        unit: line.unit,
        aisle: line.aisle,
        from: line.from,
        have,
        custom: line.custom,
    }
}

fn sort_key(item: &ShoppingItem) -> (Aisle, String, String) {
    (item.aisle, item.name.to_lowercase(), item.key.clone())
}

fn summarize(from: &str, to: &str, items: Vec<ShoppingItem>) -> ShoppingList {
    let needed = items.iter().filter(|item| !item.have);
    let needed_count = needed.clone().count() as i64;
    let needed_cost_vnd = needed.map(|item| item.cost_vnd).sum();
    ShoppingList { from: from.to_string(), to: to.to_string(), items, needed_count, needed_cost_vnd }
}

#[cfg(test)]
mod tests;
