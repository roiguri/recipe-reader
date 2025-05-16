import pytest
from app.services.text_processor import TextProcessor


@pytest.fixture
def processor():
    return TextProcessor()


@pytest.mark.asyncio
async def test_basic_recipe_extraction(processor):
    """Test extracting a basic recipe."""
    recipe_text = """
    # Chocolate Chip Cookies
    
    Prep time: 15 minutes
    Cook time: 10 minutes
    Total time: 25 minutes
    Serves: 24
    
    ## Ingredients
    
    * 2 1/4 cups all-purpose flour
    * 1 tsp baking soda
    * 1 tsp salt
    * 1 cup butter, softened
    * 3/4 cup granulated sugar
    * 3/4 cup packed brown sugar
    * 2 large eggs
    * 2 tsp vanilla extract
    * 2 cups chocolate chips
    
    ## Instructions
    
    1. Preheat oven to 375°F.
    2. Combine flour, baking soda, and salt in a small bowl.
    3. Beat butter, granulated sugar, and brown sugar in a large mixer bowl.
    4. Add eggs one at a time, beating well after each addition.
    5. Stir in vanilla extract.
    6. Gradually beat in flour mixture.
    7. Stir in chocolate chips.
    8. Drop by rounded tablespoon onto ungreased baking sheets.
    9. Bake for 9 to 11 minutes or until golden brown.
    10. Let cool on baking sheets for 2 minutes, then remove to wire racks to cool completely.
    """
    
    result = await processor.process_text(recipe_text)
    
    # Check basic response structure
    assert result.recipe is not None
    assert result.confidence_score > 0.7  # Should be confident for this well-structured recipe
    assert result.processing_time > 0  # Should take some time to process
    
    # Check recipe details
    recipe = result.recipe
    assert recipe.name == "Chocolate Chip Cookies"
    assert recipe.prepTime == 15
    assert recipe.cookTime == 10
    assert recipe.totalTime == 25
    assert recipe.servings == 24
    
    # Check ingredients
    assert len(recipe.ingredients) >= 8  # Should find most ingredients
    flour_found = any(i.item.lower().find("flour") >= 0 for i in recipe.ingredients)
    assert flour_found, "Should find flour as an ingredient"
    
    # We should have stages since the recipe has clear sections
    if recipe.stages:
        assert len(recipe.stages) >= 1
        assert any(s.title.lower().find("instruction") >= 0 for s in recipe.stages) or \
               any(len(s.instructions) > 5 for s in recipe.stages), "Should have substantial instructions"
    else:
        assert len(recipe.instructions) >= 5, "Should have at least 5 instructions"


@pytest.mark.asyncio
async def test_simple_recipe_no_sections(processor):
    """Test extracting a simple recipe without clear sections."""
    recipe_text = """
    Easy Pancakes
    
    Mix 1 cup flour, 2 tbsp sugar, 1 tsp baking powder, and a pinch of salt.
    Whisk together 1 egg, 1 cup milk, and 2 tbsp melted butter.
    Combine wet and dry ingredients.
    Heat a skillet and pour 1/4 cup batter for each pancake.
    Cook until bubbles form, then flip and cook until golden.
    Serve with maple syrup.
    Makes about 8 pancakes.
    """
    
    result = await processor.process_text(recipe_text)
    
    # Check recipe details
    recipe = result.recipe
    assert recipe.name == "Easy Pancakes"
    
    # Check ingredients
    assert len(recipe.ingredients) >= 4  # Should find most ingredients
    assert any(i.item.lower().find("flour") >= 0 for i in recipe.ingredients)
    
    # This recipe should use flat instructions
    if not recipe.stages:
        assert len(recipe.instructions) >= 3
    
    # Should extract serving information
    assert recipe.servings == 8 or recipe.servings is None  # Might be hard to extract from this format


@pytest.mark.asyncio
async def test_recipe_with_stage_titles(processor):
    """Test extracting a recipe with clear stage titles."""
    recipe_text = """
    Lasagna
    
    Prep: 30 min
    Cook: 1 hour
    Serves: 12
    
    Ingredients:
    - 1 pound ground beef
    - 1 onion, chopped
    - 2 cloves garlic, minced
    - 1 can (28 oz) crushed tomatoes
    - 2 cans (6 oz each) tomato paste
    - 15 oz ricotta cheese
    - 1 egg
    - 12 lasagna noodles
    - 16 oz mozzarella cheese, shredded
    - 1/2 cup grated Parmesan cheese
    
    PREPARE THE SAUCE:
    Brown the ground beef, onion, and garlic. Add tomatoes and tomato paste.
    Simmer for 30 minutes.
    
    PREPARE THE CHEESE MIXTURE:
    Mix ricotta cheese with egg and 1/4 cup Parmesan.
    
    ASSEMBLY:
    Layer sauce, noodles, ricotta mixture, and mozzarella in a baking dish.
    Repeat layers, ending with sauce and remaining cheeses.
    
    BAKING:
    Cover with foil and bake at 375°F for 25 minutes.
    Remove foil and bake for 25 more minutes.
    Let stand for 15 minutes before serving.
    """
    
    result = await processor.process_text(recipe_text)
    
    # Check recipe details
    recipe = result.recipe
    assert recipe.name == "Lasagna"
    assert recipe.prepTime == 30
    assert recipe.cookTime == 60  # 1 hour
    assert recipe.servings == 12
    
    # Check ingredients
    assert len(recipe.ingredients) >= 8  # Should find most ingredients
    
    # This recipe should use stages
    assert recipe.stages is not None
    assert len(recipe.stages) >= 3  # Should identify at least 3 stages
    
    # Verify stage titles
    stage_titles = [s.title.upper() for s in recipe.stages]
    assert any("SAUCE" in title for title in stage_titles)
    assert any("CHEESE" in title for title in stage_titles) or any("MIXTURE" in title for title in stage_titles)
