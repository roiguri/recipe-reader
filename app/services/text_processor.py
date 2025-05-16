import time
import re
from datetime import datetime
import uuid
from typing import Dict, Any, List, Tuple, Optional
from ..models.recipe import Recipe, Stage, Ingredient, RecipeResponse


class TextProcessor:
    """Service for processing text into structured recipe data."""
    
    def __init__(self):
        """Initialize the text processor with regex patterns and other utilities."""
        # Regex patterns for extracting recipe components
        self.title_patterns = [
            r"^\s*#\s*(.+)$",  # Markdown title
            r"^\s*(.+?)\s*\n[-=]+$",  # Underlined title
            r"^\s*(.+?)\s*$",  # First non-empty line of text
        ]
        
        self.time_patterns = {
            "prep": [
                r"prep(?:aration)?\s*time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
                r"prep(?:aration)?:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
            ],
            "cook": [
                r"cook(?:ing)?\s*time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
                r"cook(?:ing)?:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
            ],
            "total": [
                r"total\s*time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
                r"time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
            ],
            "wait": [
                r"wait(?:ing)?\s*time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
                r"rest(?:ing)?\s*time:?\s*(\d+)[-\s]*(min|minutes|hour|hours|hr|hrs)",
            ],
        }
        
        self.serving_patterns = [
            r"(?:serves|servings|yield)(?:\s*:|)(?:\s*about)?\s*(\d+)(?:\s*-\s*(\d+))?",
            r"for\s*(\d+)(?:\s*-\s*(\d+))?\s*(?:people|servings)",
            r"makes(?:\s*about)?\s*(\d+)",
        ]
        
        self.ingredient_patterns = [
            # Common ingredient format: "2 cups flour"
            r"(?:^|\n)(?:\*|-|–|\d+[\).]|•)?\s*(?:(?P<amount>\d+(?:[./]\d+)?(?:\s*-\s*\d+(?:[./]\d+)?)?)\s*(?P<unit>cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|bunch|bunches|clove|cloves|pinch|pinches|handful|piece|pieces|slice|slices|dash|dashes|sprig|sprigs)s?\s+)?(?P<item>[a-zA-Z].+?)(?:,|$|\n)",
            
            # Format with amount and unit separated by parentheses or commas
            r"(?:^|\n)(?:\*|-|–|\d+[\).]|•)?\s*(?P<item>[a-zA-Z].+?)(?:\s*[(,]\s*(?P<amount>\d+(?:[./]\d+)?(?:\s*-\s*\d+(?:[./]\d+)?)?)\s*(?P<unit>cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters|bunch|bunches|clove|cloves|pinch|pinches|handful|piece|pieces|slice|slices|dash|dashes|sprig|sprigs)s?[),])",
            
            # Basic bullet or numbered list items that look like ingredients
            r"(?:^|\n)(?:\*|-|–|\d+[\).]|•)\s*(?P<item>[a-zA-Z].+?)(?:,|$|\n)",
        ]

        self.ingredient_section_patterns = [
            r'(?:^|\n)\s*(?:##\s*)?(?:ingredients?)(?:\s*:|)(?:\s*$|\n)',
            r'(?:^|\n)\s*(?:what\s+you(?:\'ll| will)\s+need)(?:\s*:|)(?:\s*$|\n)',
            r'(?:^|\n)\s*(?:you(?:\'ll| will)\s+need)(?:\s*:|)(?:\s*$|\n)',
        ]

        self.step_section_patterns = [
            r'(?:^|\n)\s*(?:##\s*)?(?:instructions|directions|method|preparation|steps)(?:\s*:|)(?:\s*$|\n)',
            r'(?:^|\n)\s*(?:to prepare|to make)(?:\s*:|)(?:\s*$|\n)',
        ]

        self.stage_title_patterns = [
            r'(?:^|\n)\s*##\s*(.+)$',  # Markdown subheadings
            r'(?:^|\n)\s*([A-Z][A-Z\s]+):',  # ALL CAPS followed by colon
            r'(?:^|\n)\s*Step\s*\d+:?\s*(.+)$',  # Step X: title
            r'(?:^|\n)\s*For\s+the\s+(.+):$',  # "For the X:" pattern
        ]
    
    async def process_text(self, text: str, options: Dict[str, Any] = None) -> RecipeResponse:
        """
        Process recipe text and extract structured data.
        
        Args:
            text: The recipe text to process
            options: Optional processing parameters
            
        Returns:
            RecipeResponse object with extracted recipe and metadata
        """
        if options is None:
            options = {}
            
        # Record start time for processing time calculation
        start_time = time.time()
        
        # Generate a unique ID for the recipe
        recipe_id = str(uuid.uuid4())
        
        # Clean the text
        cleaned_text = self._clean_text(text)
        
        # Extract title
        title = self._extract_title(cleaned_text) or "Untitled Recipe"
        
        # Extract times
        prep_time = self._extract_time(cleaned_text, "prep")
        cook_time = self._extract_time(cleaned_text, "cook")
        total_time = self._extract_time(cleaned_text, "total")
        wait_time = self._extract_time(cleaned_text, "wait")
        
        # If total time wasn't found but prep and cook were, calculate it
        if total_time is None and (prep_time is not None or cook_time is not None):
            total_time = (prep_time or 0) + (cook_time or 0)
        
        # Extract servings
        servings = self._extract_servings(cleaned_text)
        
        # Extract ingredients
        ingredients = self._extract_ingredients(cleaned_text)
        
        # Determine main ingredient (just use the first one for now)
        main_ingredient = ingredients[0].item if ingredients else None
        
        # Extract instructions and determine if we need stages
        instructions, stages = self._extract_instructions(cleaned_text)
        
        # Create the recipe object
        if stages:
            recipe = Recipe(
                id=recipe_id,
                name=title,
                description=self._generate_description(title, ingredients),
                stages=stages,
                ingredients=ingredients,
                prepTime=prep_time,
                cookTime=cook_time,
                totalTime=total_time,
                waitTime=wait_time,
                servings=servings,
                mainIngredient=main_ingredient,
                tags=self._generate_tags(title, ingredients),
                creationTime=datetime.now()
            )
        else:
            recipe = Recipe(
                id=recipe_id,
                name=title,
                description=self._generate_description(title, ingredients),
                instructions=instructions,
                ingredients=ingredients,
                prepTime=prep_time,
                cookTime=cook_time,
                totalTime=total_time,
                waitTime=wait_time,
                servings=servings,
                mainIngredient=main_ingredient,
                tags=self._generate_tags(title, ingredients),
                creationTime=datetime.now()
            )
        
        # Calculate confidence score based on extraction completeness
        confidence_score = self._calculate_confidence(recipe)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Return response
        return RecipeResponse(
            recipe=recipe,
            confidence_score=confidence_score,
            processing_time=processing_time
        )
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize the text for easier processing."""
        # Remove leading/trailing whitespace from lines while preserving line breaks
        cleaned_lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(cleaned_lines)
        
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove duplicate line breaks
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text
    
    def _extract_title(self, text: str) -> Optional[str]:
        """Extract the recipe title from the text."""
        # Get non-empty lines
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return None
        
        # Try to find a title using various patterns
        for pattern in self.title_patterns:
            for line in lines[:5]:  # Only check first few lines
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(1).strip()
        
        # If no pattern matches, use the first non-empty line
        return lines[0].strip()
    
    def _extract_time(self, text: str, time_type: str) -> Optional[int]:
        """Extract preparation, cooking, or total time in minutes."""
        text = text.lower()
        
        for pattern in self.time_patterns.get(time_type, []):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = int(match.group(1))
                unit = match.group(2).lower()
                
                # Convert to minutes
                if 'hour' in unit or unit in ['hr', 'hrs']:
                    return amount * 60
                return amount
        
        return None
    
    def _extract_servings(self, text: str) -> Optional[int]:
        """Extract number of servings."""
        text = text.lower()
        
        for pattern in self.serving_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # If a range is given, use the lower number
                return int(match.group(1))
        
        return None
    
    def _extract_ingredients(self, text: str) -> List[Ingredient]:
        """Extract ingredients from the text."""
        ingredients = []
        
        # First try to find a specific ingredients section
        ingredients_section = None
        for pattern in self.ingredient_section_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                section_start = match.end()
                # Find either the next section or the end of the text
                next_section = float('inf')
                for p in self.step_section_patterns + self.stage_title_patterns:
                    m = re.search(p, text[section_start:], re.IGNORECASE)
                    if m:
                        next_section = min(next_section, section_start + m.start())
                
                if next_section < float('inf'):
                    ingredients_section = text[section_start:next_section]
                else:
                    # If no next section, limit to a reasonable number of lines
                    section_lines = text[section_start:].split('\n')[:20]
                    ingredients_section = '\n'.join(section_lines)
                break
        
        # If ingredients section header is in Markdown style (##), look for that explicitly
        if not ingredients_section:
            match = re.search(r'##\s*ingredients', text, re.IGNORECASE)
            if match:
                section_start = match.end()
                section_end = text.find('##', section_start)
                if section_end > 0:
                    ingredients_section = text[section_start:section_end]
                else:
                    section_lines = text[section_start:].split('\n')[:20]
                    ingredients_section = '\n'.join(section_lines)
        
        # Look for lists with bullets or numbers that resemble ingredients
        if not ingredients_section:
            # Try to find a section that has a concentration of bullet/number patterns
            lines = text.split('\n')
            ingredient_line_counts = []
            for i in range(len(lines)):
                # Look ahead 5 lines to see if they look like ingredients
                count = 0
                for j in range(i, min(i+5, len(lines))):
                    if re.match(r'^\s*(?:\*|-|\d+\.|•)\s+', lines[j]):
                        count += 1
                ingredient_line_counts.append(count)
            
            # Find the start of the section with the most ingredient-like lines
            if max(ingredient_line_counts, default=0) >= 3:
                start_idx = ingredient_line_counts.index(max(ingredient_line_counts))
                # Find the end of this section
                end_idx = start_idx
                while end_idx < len(lines) and (
                    re.match(r'^\s*(?:\*|-|\d+\.|•)\s+', lines[end_idx]) or not lines[end_idx].strip()
                ):
                    end_idx += 1
                ingredients_section = '\n'.join(lines[start_idx:end_idx])
        
        # If an ingredients section was found, use that, otherwise scan the entire text
        scan_text = ingredients_section if ingredients_section else text
        
        # Enhanced ingredient patterns to better match test cases
        enhanced_patterns = [
            # Match list items with quantities, units and ingredients
            r'(?:^|\n)\s*(?:\*|-|\d+\.|•)?\s*(?:(?P<amount>\d+(?:[./]\d+)?)\s*(?P<unit>cups?|tbsps?|tsps?|tablespoons?|teaspoons?|ozs?|ounces?|lbs?|pounds?|grams?|kgs?|milliliters?|liters?|bunche?s?|cloves?|pinche?s?|handfuls?|pieces?|slices?|dashes?|sprigs?))\s+(?P<item>[^,\n]+)',
            # Simple bulleted items
            r'(?:^|\n)\s*(?:\*|-|\d+\.|•)\s+(?P<amount>\d+(?:[./]\d+)?(?:\s*-\s*\d+(?:[./]\d+)?)?)\s+(?P<item>[^,\n]+)',
            # Ingredients with amount and unit in parentheses
            r'(?:^|\n)\s*(?:\*|-|\d+\.|•)?\s*(?P<item>[a-zA-Z].+?)\s*\(\s*(?P<amount>\d+(?:[./]\d+)?)\s*(?P<unit>[^)]+)\s*\)',
            # Simple ingredient list items without measurements
            r'(?:^|\n)\s*(?:\*|-|\d+\.|•)\s+(?P<item>[a-zA-Z][^,\n]+)',
        ]
        
        # Look for ingredient patterns
        for pattern in enhanced_patterns + self.ingredient_patterns:
            for match in re.finditer(pattern, scan_text, re.MULTILINE | re.IGNORECASE):
                groups = match.groupdict()
                item = groups.get('item', '').strip()
                
                if item and len(item) > 1:  # Avoid single characters
                    # Skip items that look like stage titles
                    if not re.match(r'^[A-Z\s:]+$', item) and not item.endswith(':'):
                        ingredient = Ingredient(
                            item=item,
                            amount=groups.get('amount', '1') if groups.get('amount') else '1',
                            unit=groups.get('unit', '') if groups.get('unit') else ''
                        )
                        ingredients.append(ingredient)
        
        return ingredients

    def _extract_instructions(self, text: str) -> Tuple[List[str], Optional[List[Stage]]]:
        """
        Extract instructions from the text.
        Returns both a flat list of instructions and structured stages if detected.
        """
        instructions = []
        stages = []
        
        # Try to find an instructions section
        instructions_section = None
        for pattern in self.step_section_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                section_start = match.end()
                instructions_section = text[section_start:]
                break
        
        # If an instructions section was found, use that, otherwise use the second half of the text
        scan_text = instructions_section if instructions_section else text.split('\n', 1)[1] if '\n' in text else text
        
        # Split into lines
        lines = scan_text.split('\n')
        
        # Check if there are potential stage titles
        potential_stages = []
        current_stage = {"title": None, "instructions": []}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check if this line looks like a stage title
            is_stage_title = False
            for pattern in self.stage_title_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    # If we already have a stage, add it to the list
                    if current_stage["title"] and current_stage["instructions"]:
                        potential_stages.append(current_stage)
                    
                    # Start a new stage
                    current_stage = {
                        "title": match.group(1),
                        "instructions": []
                    }
                    is_stage_title = True
                    break
            
            if not is_stage_title:
                # This is an instruction line
                # Check if it starts with a number or bullet
                clean_line = re.sub(r'^(\d+\.)|\*|-|•|\+', '', line).strip()
                if clean_line:
                    if current_stage["title"]:
                        current_stage["instructions"].append(clean_line)
                    else:
                        instructions.append(clean_line)
        
        # Add the last stage if there is one
        if current_stage["title"] and current_stage["instructions"]:
            potential_stages.append(current_stage)
        
        # If we found stages, convert them to the Stage model
        if potential_stages:
            for stage_dict in potential_stages:
                stages.append(Stage(
                    title=stage_dict["title"],
                    instructions=stage_dict["instructions"]
                ))
            # Return empty instructions since we're using stages
            return [], stages
        
        # If we didn't find stages, filter out any lines that don't look like instructions
        filtered_instructions = []
        for instr in instructions:
            # Skip very short lines or lines that look like headers
            if len(instr) > 5 and not instr.isupper() and not instr.endswith(':'):
                filtered_instructions.append(instr)
        
        return filtered_instructions, None
    
    def _generate_description(self, title: str, ingredients: List[Ingredient]) -> str:
        """Generate a simple description based on the title and ingredients."""
        if not ingredients:
            return f"Recipe for {title}"
        
        main_ingredients = [ing.item for ing in ingredients[:3]]
        if len(main_ingredients) == 1:
            return f"Recipe for {title} made with {main_ingredients[0]}"
        elif len(main_ingredients) == 2:
            return f"Recipe for {title} made with {main_ingredients[0]} and {main_ingredients[1]}"
        else:
            return f"Recipe for {title} made with {main_ingredients[0]}, {main_ingredients[1]}, and more"
    
    def _generate_tags(self, title: str, ingredients: List[Ingredient]) -> List[str]:
        """Generate tags based on the title and ingredients."""
        tags = []
        
        # Add ingredients-based tags
        for ingredient in ingredients[:5]:  # Use only first few ingredients
            # Extract the main part of the ingredient (e.g., "fresh tomatoes" -> "tomatoes")
            words = ingredient.item.lower().split()
            if len(words) > 1:
                # Skip common adjectives
                skip_words = ['fresh', 'dried', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'ground']
                main_word = next((word for word in words if word not in skip_words), words[-1])
                tags.append(main_word)
            else:
                tags.append(ingredient.item.lower())
        
        # Add tags based on the title
        title_words = title.lower().split()
        food_types = [
            'soup', 'salad', 'cake', 'bread', 'pie', 'curry', 'stew', 'pasta', 'pizza',
            'sandwich', 'casserole', 'roast', 'dessert', 'cookie', 'muffin', 'pancake'
        ]
        for food_type in food_types:
            if food_type in title_words:
                tags.append(food_type)
        
        # Make tags unique and limit to 10
        unique_tags = list(set(tags))
        return unique_tags[:10]
    
    def _calculate_confidence(self, recipe: Recipe) -> float:
        """Calculate a confidence score for the extraction."""
        score = 0.5  # Start with a baseline
        
        # Add points for having essential elements
        if recipe.name and recipe.name != "Untitled Recipe":
            score += 0.1
        
        # Add points for having ingredients
        if recipe.ingredients:
            score += min(0.2, len(recipe.ingredients) * 0.02)  # Up to 0.2 points
        
        # Add points for having instructions/stages
        if recipe.instructions:
            score += min(0.2, len(recipe.instructions) * 0.02)  # Up to 0.2 points
        elif recipe.stages:
            score += min(0.2, len(recipe.stages) * 0.05)  # Up to 0.2 points
        
        # Add points for having time information
        if recipe.prepTime is not None:
            score += 0.05
        if recipe.cookTime is not None:
            score += 0.05
        if recipe.totalTime is not None:
            score += 0.05
        
        # Add points for having servings information
        if recipe.servings is not None:
            score += 0.05
        
        return min(score, 1.0)  # Cap at 1.0
