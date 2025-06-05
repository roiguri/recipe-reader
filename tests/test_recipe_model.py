import pytest
from pydantic import ValidationError
from app.models.recipe import (
    Ingredient, Stage, ImageDetails, RecipeBase, 
    RecipeCreate, Recipe, TextProcessRequest
)
from datetime import datetime


def test_ingredient_model():
    """Test the Ingredient model creation and validation."""
    # Valid ingredient
    ingredient = Ingredient(item="Salt", amount="1", unit="tsp")
    assert ingredient.item == "Salt"
    assert ingredient.amount == "1"
    assert ingredient.unit == "tsp"
    
    # Valid ingredient with all fields
    ingredient = Ingredient(
        item="Flour",
        amount="2.5",
        unit="cups",
        stage_id=1
    )
    assert ingredient.item == "Flour"
    assert ingredient.amount == "2.5"
    assert ingredient.unit == "cups"
    assert ingredient.stage_id == 1


def test_stage_model():
    """Test the Stage model creation and validation."""
    stage = Stage(
        title="Preparation", 
        instructions=["Chop vegetables", "Measure ingredients"]
    )
    assert stage.title == "Preparation"
    assert len(stage.instructions) == 2
    assert stage.instructions[0] == "Chop vegetables"


def test_recipe_with_stages():
    """Test creating a recipe with stages."""
    recipe = RecipeBase(
        name="Chocolate Cake",
        stages=[
            Stage(
                title="Preparation", 
                instructions=["Preheat oven", "Prepare pans"]
            ),
            Stage(
                title="Mix ingredients", 
                instructions=["Mix dry ingredients", "Add wet ingredients"]
            )
        ],
        ingredients=[
            Ingredient(item="Flour", amount="2", unit="cups"),
            Ingredient(item="Sugar", amount="1", unit="cup")
        ]
    )
    assert recipe.name == "Chocolate Cake"
    assert len(recipe.stages) == 2
    assert recipe.stages[0].title == "Preparation"
    assert len(recipe.ingredients) == 2


def test_recipe_with_flat_instructions():
    """Test creating a recipe with flat instructions."""
    recipe = RecipeBase(
        name="Simple Salad",
        instructions=["Wash vegetables", "Chop everything", "Mix with dressing"],
        ingredients=[
            Ingredient(item="Lettuce", amount="1", unit="head"),
            Ingredient(item="Tomato", amount="2", unit="medium")
        ]
    )
    assert recipe.name == "Simple Salad"
    assert len(recipe.instructions) == 3
    assert recipe.instructions[0] == "Wash vegetables"
    assert len(recipe.ingredients) == 2


def test_recipe_validation():
    """Test that recipes validate correctly."""
    # Should fail: no stages or instructions
    with pytest.raises(ValidationError):
        RecipeBase(
            name="Invalid Recipe",
            ingredients=[Ingredient(item="Something", amount="1")]
        )
    
    # Should fail: both stages and instructions provided
    with pytest.raises(ValidationError):
        RecipeBase(
            name="Invalid Recipe",
            stages=[Stage(title="Stage", instructions=["Do something"])],
            instructions=["Instruction"],
            ingredients=[Ingredient(item="Something", amount="1")]
        )


def test_full_recipe_model():
    """Test a complete recipe with all fields."""
    now = datetime.now()
    recipe = Recipe(
        id="recipe123",
        name="Full Test Recipe",
        description="A test recipe with all fields",
        category="desserts",
        difficulty="easy",
        prepTime=15,
        cookTime=30,
        waitTime=0,
        totalTime=45,
        servings=4,
        stages=[
            Stage(
                title="Preparation", 
                instructions=["Step 1", "Step 2"]
            ),
        ],
        ingredients=[
            Ingredient(item="Ingredient1", amount="1", unit="cup"),
            Ingredient(item="Ingredient2", amount="2", unit="tbsp"),
        ],
        mainIngredient="Ingredient1",
        tags=["tag1", "tag2"],
        image="image123.jpg",
        images=[
            ImageDetails(
                id="img1",
                access="public",
                compressed="path/to/compressed.jpg",
                full="path/to/full.jpg",
                isPrimary=True,
                uploadedAt=now,
                uploadedBy="system"
            )
        ],
        allowImageSuggestions=True,
        approved=True,
        source_url="https://example.com/recipe",
        creationTime=now,
        updatedAt=now
    )
    
    assert recipe.id == "recipe123"
    assert recipe.name == "Full Test Recipe"
    assert recipe.prepTime == 15
    assert recipe.totalTime == 45
    assert len(recipe.stages) == 1
    assert len(recipe.ingredients) == 2
    assert recipe.mainIngredient == "Ingredient1"
    assert len(recipe.tags) == 2
    assert recipe.images[0].isPrimary is True
    assert recipe.approved is True


def test_text_process_request():
    """Test the TextProcessRequest model."""
    request = TextProcessRequest(text="Recipe for chocolate cake...")
    assert request.text == "Recipe for chocolate cake..."
    assert request.options == {}
    
    request = TextProcessRequest(
        text="Recipe text...",
        options={"extract_timing": True}
    )
    assert request.options["extract_timing"] is True
