# tests/test_url_processor.py

import pytest
import pytest_asyncio
from unittest.mock import Mock, patch, AsyncMock
import httpx
from app.services.url_processor import UrlProcessor


class TestUrlProcessor:
    """Test suite for UrlProcessor service."""

    @pytest_asyncio.fixture
    async def url_processor(self):
        """Create a UrlProcessor instance for testing with proper cleanup."""
        processor = UrlProcessor()
        yield processor
        # Cleanup: close the HTTP client after test
        await processor.http_client.aclose()

    @pytest.fixture
    def mock_html_recipe(self):
        """Mock HTML content with recipe data."""
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Chocolate Chip Cookies Recipe</title>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Chocolate Chip Cookies",
                "description": "Delicious homemade chocolate chip cookies",
                "prepTime": "PT15M",
                "cookTime": "PT12M",
                "totalTime": "PT27M",
                "recipeYield": "24",
                "recipeIngredient": [
                    "2 cups all-purpose flour",
                    "1 tsp baking soda",
                    "1 tsp salt",
                    "3/4 cup butter, softened",
                    "1 cup brown sugar",
                    "1/2 cup white sugar",
                    "2 large eggs",
                    "2 tsp vanilla extract",
                    "2 cups chocolate chips"
                ],
                "recipeInstructions": [
                    {
                        "@type": "HowToStep",
                        "text": "Preheat oven to 375°F (190°C)."
                    },
                    {
                        "@type": "HowToStep", 
                        "text": "In a bowl, whisk together flour, baking soda, and salt."
                    },
                    {
                        "@type": "HowToStep",
                        "text": "In another bowl, cream butter and sugars until fluffy."
                    },
                    {
                        "@type": "HowToStep",
                        "text": "Beat in eggs and vanilla extract."
                    },
                    {
                        "@type": "HowToStep",
                        "text": "Gradually mix in flour mixture, then fold in chocolate chips."
                    },
                    {
                        "@type": "HowToStep",
                        "text": "Drop rounded tablespoons of dough onto ungreased baking sheets."
                    },
                    {
                        "@type": "HowToStep",
                        "text": "Bake for 9-11 minutes or until golden brown."
                    }
                ],
                "recipeCategory": "Dessert",
                "recipeCuisine": "American",
                "keywords": ["cookies", "chocolate chip", "baking", "dessert"]
            }
            </script>
        </head>
        <body>
            <h1>Chocolate Chip Cookies Recipe</h1>
            <p>These are the best chocolate chip cookies you'll ever make!</p>
        </body>
        </html>
        '''

    @pytest.fixture
    def mock_html_microdata(self):
        """Mock HTML content with microdata recipe."""
        return '''
        <!DOCTYPE html>
        <html>
        <body>
            <div itemscope itemtype="http://schema.org/Recipe">
                <h1 itemprop="name">Simple Pancakes</h1>
                <p itemprop="description">Fluffy homemade pancakes</p>
                
                <h2>Ingredients:</h2>
                <ul>
                    <li itemprop="recipeIngredient">2 cups flour</li>
                    <li itemprop="recipeIngredient">2 tbsp sugar</li>
                    <li itemprop="recipeIngredient">2 tsp baking powder</li>
                    <li itemprop="recipeIngredient">1 tsp salt</li>
                    <li itemprop="recipeIngredient">2 cups milk</li>
                    <li itemprop="recipeIngredient">2 eggs</li>
                </ul>
                
                <h2>Instructions:</h2>
                <ol>
                    <li itemprop="recipeInstructions">Mix dry ingredients in a bowl.</li>
                    <li itemprop="recipeInstructions">Whisk milk and eggs together.</li>
                    <li itemprop="recipeInstructions">Combine wet and dry ingredients.</li>
                    <li itemprop="recipeInstructions">Cook on griddle until golden.</li>
                </ol>
            </div>
        </body>
        </html>
        '''

    @pytest.fixture
    def mock_html_no_recipe(self):
        """Mock HTML content without recipe data."""
        return '''
        <!DOCTYPE html>
        <html>
        <head><title>Random Blog Post</title></head>
        <body>
            <h1>My Day at the Beach</h1>
            <p>Today I went to the beach and had a great time...</p>
            <p>The weather was sunny and warm.</p>
        </body>
        </html>
        '''

    def test_validate_url_valid(self, url_processor):
        """Test URL validation with valid URLs."""
        valid_urls = [
            "https://example.com",
            "http://example.com",
            "https://example.com/recipe/123",
            "http://subdomain.example.com/path"
        ]
        
        for url in valid_urls:
            assert url_processor.validate_url(url)

    def test_validate_url_invalid(self, url_processor):
        """Test URL validation with invalid URLs."""
        invalid_urls = [
            "",
            "not-a-url",
            "ftp://example.com",
            "javascript:alert('xss')",
            "file:///etc/passwd"
        ]
        
        for url in invalid_urls:
            assert not url_processor.validate_url(url)

    def test_normalize_url(self, url_processor):
        """Test URL normalization."""
        test_cases = [
            ("example.com", "https://example.com"),
            ("www.example.com/recipe", "https://www.example.com/recipe"),
            ("https://example.com", "https://example.com"),
            ("http://example.com", "http://example.com"),
            ("  example.com  ", "https://example.com")
        ]
        
        for input_url, expected in test_cases:
            result = url_processor.normalize_url(input_url)
            assert result == expected

    @pytest.mark.asyncio
    async def test_fetch_content_success(self, url_processor, mock_html_recipe):
        """Test successful content fetching."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html_recipe
        mock_response.url = "https://example.com/recipe"
        mock_response.headers = {"content-type": "text/html"}
        mock_response.encoding = "utf-8"

        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            
            result = await url_processor.fetch_content("https://example.com/recipe")
            
            assert result['success'] is True
            assert result['content'] == mock_html_recipe
            assert result['status_code'] == 200

    @pytest.mark.asyncio
    async def test_fetch_content_http_error(self, url_processor):
        """Test content fetching with HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.request = Mock()

        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.HTTPStatusError("404", request=mock_response.request, response=mock_response)
            
            with pytest.raises(Exception, match="Failed to fetch URL"):
                await url_processor.fetch_content("https://example.com/404")

    @pytest.mark.asyncio
    async def test_fetch_content_timeout(self, url_processor):
        """Test content fetching with timeout."""
        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.TimeoutException("Request timeout")
            
            with pytest.raises(Exception, match="Failed to fetch URL"):
                await url_processor.fetch_content("https://example.com/slow", {'max_retries': 1})

    def test_extract_json_ld_recipe(self, url_processor, mock_html_recipe):
        """Test JSON-LD recipe extraction."""
        result = url_processor.extract_recipe_content(mock_html_recipe, "https://example.com")
        
        assert result['extraction_method'] == 'json-ld'
        assert result['confidence'] == UrlProcessor.CONFIDENCE_JSON_LD
        
        content = result['content']
        assert "Chocolate Chip Cookies" in content
        assert "2 cups all-purpose flour" in content
        assert "Preheat oven to 375°F" in content
        assert "15 minutes" in content  # Converted from PT15M
        assert "12 minutes" in content  # Converted from PT12M

    def test_extract_microdata_recipe(self, url_processor, mock_html_microdata):
        """Test microdata recipe extraction."""
        result = url_processor.extract_recipe_content(mock_html_microdata, "https://example.com")
        
        assert result['extraction_method'] == 'microdata'
        assert result['confidence'] == 0.85
        
        content = result['content']
        assert "Simple Pancakes" in content
        assert "2 cups flour" in content
        assert "Mix dry ingredients" in content

    def test_extract_no_recipe_fallback(self, url_processor, mock_html_no_recipe):
        """Test fallback extraction when no recipe data is found."""
        result = url_processor.extract_recipe_content(mock_html_no_recipe, "https://example.com")
        
        assert result['extraction_method'] == 'full-text'
        assert result['confidence'] == 0.5
        
        content = result['content']
        assert "My Day at the Beach" in content

    def test_parse_duration(self, url_processor):
        """Test ISO 8601 duration parsing."""
        test_cases = [
            ("PT15M", 15),
            ("PT1H", 60),
            ("PT1H30M", 90),
            ("PT2H45M", 165),
            ("PT0M", 0),
            ("", None),
            (None, None),
            ("invalid", None)
        ]
        
        for duration, expected in test_cases:
            result = url_processor._parse_duration(duration)
            assert result == expected

    def test_score_recipe_content(self, url_processor):
        """Test recipe content scoring."""
        recipe_text = """
        Chocolate Chip Cookies Recipe
        
        Ingredients:
        - 2 cups flour
        - 1 cup sugar
        - 2 eggs
        
        Instructions:
        1. Mix ingredients together
        2. Bake for 15 minutes
        3. Serve warm
        """
        
        non_recipe_text = """
        This is just a regular blog post about my vacation.
        I went to the beach and had a great time.
        The weather was nice and sunny.
        """
        
        recipe_score = url_processor._score_recipe_content(recipe_text)
        non_recipe_score = url_processor._score_recipe_content(non_recipe_text)
        
        assert recipe_score > non_recipe_score
        assert recipe_score > 10  # Should be above minimum threshold

    def test_clean_extracted_text(self, url_processor):
        """Test text cleaning functionality."""
        dirty_text = """
        Recipe: Cookies    
        
        ADVERTISEMENT - Click here for deals!
        
        Subscribe to our newsletter for more recipes
        
        Ingredients:
        - 2 cups flour
        - 1 cup sugar
        
        Rate this recipe ★★★★★
        Print Recipe | Save Recipe
        """
        
        clean_text = url_processor._clean_extracted_text(dirty_text)
        
        assert "ADVERTISEMENT" not in clean_text
        assert "Subscribe to our newsletter" not in clean_text
        assert "Rate this recipe" not in clean_text
        assert "Print Recipe" not in clean_text
        
        # Should keep the actual recipe content
        assert "Recipe: Cookies" in clean_text
        assert "2 cups flour" in clean_text
        assert "1 cup sugar" in clean_text

    @pytest.mark.asyncio
    async def test_process_url_full_flow(self, url_processor, mock_html_recipe):
        """Test the complete URL processing flow."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html_recipe
        mock_response.url = "https://example.com/recipe"
        mock_response.headers = {"content-type": "text/html"}
        mock_response.encoding = "utf-8"

        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            
            result = await url_processor.process_url("https://example.com/recipe")
            
            assert result['success'] is True
            assert result['source_url'] == "https://example.com/recipe"
            assert result['extraction_method'] == 'json-ld'
            assert result['confidence'] == UrlProcessor.CONFIDENCE_JSON_LD
            assert "Chocolate Chip Cookies" in result['content']
            assert 'processing_time' in result
            assert 'metadata' in result

    @pytest.mark.asyncio
    async def test_process_url_failure(self, url_processor):
        """Test URL processing failure handling."""
        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = httpx.HTTPStatusError("404", request=Mock(), response=Mock(status_code=404))
            
            result = await url_processor.process_url("https://example.com/404", {'max_retries': 1})
            
            assert result['success'] is False
            assert 'error' in result
            assert result['source_url'] == "https://example.com/404"

    def test_hebrew_content_handling(self, url_processor):
        """Test handling of Hebrew recipe content."""
        hebrew_html = '''
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "עוגיות שוקולד צ'יפס",
            "description": "עוגיות שוקולד צ'יפס טעימות",
            "prepTime": "PT15M",
            "cookTime": "PT12M",
            "recipeIngredient": [
                "2 כוסות קמח",
                "1 כף סודה לשתייה",
                "1 כף מלח"
            ],
            "recipeInstructions": [
                {"text": "לחמם תנור ל-190 מעלות"},
                {"text": "לערבב את החומרים היבשים"}
            ]
        }
        </script>
        '''
        
        result = url_processor.extract_recipe_content(hebrew_html, "https://example.co.il")
        
        assert result['extraction_method'] == 'json-ld'
        content = result['content']
        assert "עוגיות שוקולד צ'יפס" in content
        assert "2 כוסות קמח" in content
        assert "לחמם תנור ל-190 מעלות" in content


class TestUrlProcessorEdgeCases:
    """Test edge cases and error scenarios."""

    @pytest.fixture
    def url_processor(self):
        return UrlProcessor()

    def test_malformed_json_ld(self, url_processor):
        """Test handling of malformed JSON-LD."""
        malformed_html = '''
        <script type="application/ld+json">
        { "name": "Recipe", "invalid": json }
        </script>
        '''
        
        result = url_processor.extract_recipe_content(malformed_html, "https://example.com")
        
        # Should fall back to other methods
        assert result['extraction_method'] != 'json-ld'

    def test_empty_content(self, url_processor):
        """Test handling of empty content."""
        result = url_processor.extract_recipe_content("", "https://example.com")
        
        assert result['extraction_method'] == 'full-text'
        assert result['confidence'] == 0.5

    def test_very_large_content(self, url_processor):
        """Test handling of very large content."""
        large_content = "x" * (url_processor.max_content_size + 1000)
        
        # This would be truncated in fetch_content, but we can test the cleaning
        cleaned = url_processor._clean_extracted_text(large_content)
        assert len(cleaned) <= len(large_content)

    @pytest.mark.asyncio
    async def test_rate_limiting_handling(self, url_processor):
        """Test handling of rate limiting (429 status)."""
        mock_response_429 = Mock()
        mock_response_429.status_code = 429
        mock_response_429.request = Mock()

        mock_response_200 = Mock()
        mock_response_200.status_code = 200
        mock_response_200.text = "<html><body>Success</body></html>"
        mock_response_200.url = "https://example.com"
        mock_response_200.headers = {"content-type": "text/html"}
        mock_response_200.encoding = "utf-8"

        # Mock the persistent HTTP client's get method
        with patch.object(url_processor.http_client, 'get', new_callable=AsyncMock) as mock_get:
            # First call returns 429 response, second call succeeds
            mock_get.side_effect = [
                mock_response_429,  # Return 429 response object
                mock_response_200   # Return 200 response object
            ]
            
            with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
                result = await url_processor.fetch_content("https://example.com", {'retry_delay': 0.1})
                
                assert result['success'] is True
                assert mock_sleep.called  # Should have slept before retry