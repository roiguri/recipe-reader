import pytest
from app.services.text_processor import TextProcessor


@pytest.fixture
def processor():
    return TextProcessor()


@pytest.mark.asyncio
async def test_basic_recipe_extraction(processor):
    """Test extracting a basic recipe using Vertex AI."""
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
    assert result.processing_time > 0
    
    # Check recipe details (allow for some AI variation)
    recipe = result.recipe
    assert "chocolate" in recipe.name.lower()
    assert recipe.prepTime is not None
    assert recipe.cookTime is not None
    assert recipe.totalTime is not None
    assert recipe.servings is not None
    
    # Check ingredients and instructions/stages
    assert len(recipe.ingredients) >= 5  # Should find most ingredients
    assert any("flour" in i.item.lower() for i in recipe.ingredients)
    assert recipe.instructions or recipe.stages


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
    
    recipe = result.recipe
    assert "pancake" in recipe.name.lower()
    assert len(recipe.ingredients) >= 2
    assert any("flour" in i.item.lower() for i in recipe.ingredients)
    assert recipe.instructions or recipe.stages
    
    # Should extract serving information if possible
    assert recipe.servings is None or recipe.servings >= 1


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
    
    recipe = result.recipe
    assert "lasagna" in recipe.name.lower()
    assert recipe.prepTime is not None
    assert recipe.cookTime is not None
    assert recipe.servings is not None
    assert len(recipe.ingredients) >= 5
    
    # This recipe should use stages if the AI recognizes them
    if recipe.stages:
        assert len(recipe.stages) >= 2
        stage_titles = [s.title.lower() for s in recipe.stages]
        assert any("sauce" in title for title in stage_titles)
        assert any("cheese" in title or "mixture" in title for title in stage_titles)
    else:
        assert recipe.instructions
