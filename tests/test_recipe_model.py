import pytest
from pydantic import ValidationError
from app.models.recipe import (
    Ingredient, Stage, ImageDetails, RecipeBase, 
    RecipeCreate, Recipe, TextProcessRequest, RecipeCategory, RecipeDifficulty
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
        category=RecipeCategory.DESSERTS,
        difficulty=RecipeDifficulty.EASY,
        prepTime=15,
        cookTime=30,
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
        source_url="https://example.com/recipe",
        creationTime=now,
        updatedAt=now
    )
    
    assert recipe.id == "recipe123"
    assert recipe.name == "Full Test Recipe"
    assert recipe.prepTime == 15
    assert recipe.totalTime == 45  # 15 + 30
    assert len(recipe.stages) == 1
    assert len(recipe.ingredients) == 2
    assert recipe.mainIngredient == "Ingredient1"
    assert len(recipe.tags) == 2
    assert recipe.images[0].isPrimary is True


def test_recipe_category_validation():
    """Test that recipe categories are properly validated."""
    # Valid category should work
    recipe = RecipeBase(
        name="Valid Recipe",
        category=RecipeCategory.DESSERTS,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.category == RecipeCategory.DESSERTS
    
    # String value of valid category should work
    recipe = RecipeBase(
        name="Valid Recipe",
        category="main-courses",
        instructions=["Step 1"],  
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.category == RecipeCategory.MAIN_COURSES
    
    # None should work
    recipe = RecipeBase(
        name="Valid Recipe",
        category=None,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.category is None
    
    # Invalid category should fail
    with pytest.raises(ValidationError):
        RecipeBase(
            name="Invalid Recipe",
            category="invalid-category",
            instructions=["Step 1"],
            ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
        )


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


def test_recipe_difficulty_enum():
    """Test the RecipeDifficulty enum values and behavior."""
    # Test enum values
    assert RecipeDifficulty.EASY == "easy"
    assert RecipeDifficulty.MEDIUM == "medium"
    assert RecipeDifficulty.HARD == "hard"
    
    # Test value access
    assert RecipeDifficulty.EASY.value == "easy"
    assert RecipeDifficulty.MEDIUM.value == "medium"
    assert RecipeDifficulty.HARD.value == "hard"


def test_recipe_difficulty_validation():
    """Test that recipe difficulty is properly validated."""
    # Valid difficulty enum should work
    recipe = RecipeBase(
        name="Easy Recipe",
        difficulty=RecipeDifficulty.EASY,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.difficulty == RecipeDifficulty.EASY
    
    # String value of valid difficulty should work
    recipe = RecipeBase(
        name="Medium Recipe",
        difficulty="medium",
        instructions=["Step 1"],  
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.difficulty == RecipeDifficulty.MEDIUM
    
    # Hard difficulty should work
    recipe = RecipeBase(
        name="Hard Recipe",
        difficulty="hard",
        instructions=["Step 1"],  
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.difficulty == RecipeDifficulty.HARD
    
    # None should work
    recipe = RecipeBase(
        name="No Difficulty Recipe",
        difficulty=None,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.difficulty is None
    
    # Invalid difficulty should fail
    with pytest.raises(ValidationError):
        RecipeBase(
            name="Invalid Recipe",
            difficulty="impossible",
            instructions=["Step 1"],
            ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
        )


def test_recipe_difficulty_serialization():
    """Test Pydantic serialization and deserialization with difficulty enum."""
    # Test model to dict serialization
    recipe = RecipeBase(
        name="Test Recipe",
        difficulty=RecipeDifficulty.MEDIUM,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    
    recipe_dict = recipe.model_dump()
    assert recipe_dict["difficulty"] == "medium"
    
    # Test dict to model deserialization
    recipe_data = {
        "name": "Reconstructed Recipe",
        "difficulty": "hard",
        "instructions": ["Step 1"],
        "ingredients": [{"item": "Sugar", "amount": "1", "unit": "cup"}]
    }
    
    reconstructed_recipe = RecipeBase(**recipe_data)
    assert reconstructed_recipe.difficulty == RecipeDifficulty.HARD
    
    # Test JSON serialization/deserialization
    recipe_json = recipe.model_dump_json()
    assert '"difficulty":"medium"' in recipe_json
    
    reconstructed_from_json = RecipeBase.model_validate_json(recipe_json)
    assert reconstructed_from_json.difficulty == RecipeDifficulty.MEDIUM


def test_total_time_computed_field():
    """Test the totalTime computed field behavior."""
    # Test with both prep and cook times
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=15,
        cookTime=30,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.totalTime == 45  # 15 + 30
    
    # Test with only prep time
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=20,
        cookTime=None,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.totalTime == 20  # 20 + 0
    
    # Test with only cook time
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=None,
        cookTime=25,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.totalTime == 25  # 0 + 25
    
    # Test with both times as None
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=None,
        cookTime=None,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.totalTime is None
    
    # Test with zero values
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=0,
        cookTime=30,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    assert recipe.totalTime == 30  # 0 + 30


def test_total_time_not_settable():
    """Test that totalTime cannot be set directly and is always computed."""
    # totalTime input is ignored, computed value is used instead
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=15,
        cookTime=30,
        totalTime=50,  # This will be ignored
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    # Should compute 15 + 30 = 45, ignoring the passed value of 50
    assert recipe.totalTime == 45


def test_wait_time_field_removed():
    """Test that waitTime field no longer exists."""
    # waitTime input is ignored (field removed from model)
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=15,
        cookTime=30,
        waitTime=10,  # This will be ignored
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    # waitTime should not exist as an attribute
    assert not hasattr(recipe, 'waitTime')
    # Should not appear in serialized output
    recipe_dict = recipe.model_dump()
    assert "waitTime" not in recipe_dict


def test_total_time_serialization():
    """Test that totalTime appears in serialized output."""
    recipe = RecipeBase(
        name="Test Recipe",
        prepTime=15,
        cookTime=30,
        instructions=["Step 1"],
        ingredients=[Ingredient(item="Flour", amount="1", unit="cup")]
    )
    
    # Test model to dict serialization
    recipe_dict = recipe.model_dump()
    assert "totalTime" in recipe_dict
    assert recipe_dict["totalTime"] == 45
    assert "waitTime" not in recipe_dict
    
    # Test JSON serialization
    recipe_json = recipe.model_dump_json()
    assert '"totalTime":45' in recipe_json
    assert "waitTime" not in recipe_json
