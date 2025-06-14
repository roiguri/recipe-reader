# app/services/url_processor.py

import re
import json
import time
import logging
import asyncio
import ipaddress
from typing import Dict, Any, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import httpx


class UrlProcessor:
    """Service for processing recipe URLs and extracting content."""
    
    def __init__(self):
        """Initialize the URL processor with configuration."""
        self.logger = logging.getLogger(__name__)
        
        # Request configuration
        self.timeout = 30
        self.max_retries = 3
        self.retry_delay = 1.0
        
        # User agents for better success rates
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
        
        # Content size limits
        self.max_content_size = 5 * 1024 * 1024  # 5MB
        
    def validate_url(self, url: str) -> bool:
        """Validate URL with SSRF protection."""
        try:
            parsed = urlparse(url)
            if not all([parsed.scheme in ['http', 'https'], parsed.netloc]):
                return False
            
            # SSRF protection - block private/internal networks
            try:
                ip = ipaddress.ip_address(parsed.hostname)
                if ip.is_private or ip.is_loopback or ip.is_reserved:
                    self.logger.warning(f"Blocked private/internal IP: {parsed.hostname}")
                    return False
            except ValueError:
                # It's a domain name, not an IP - additional validation could be added
                pass
            
            # Block dangerous ports commonly used for internal services
            dangerous_ports = {22, 23, 25, 53, 135, 139, 445, 993, 995, 1433, 3306, 3389, 5432, 6379}
            if parsed.port and parsed.port in dangerous_ports:
                self.logger.warning(f"Blocked dangerous port: {parsed.port}")
                return False
            
            return True
        except Exception:
            return False
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL by adding protocol if missing."""
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        return url
    
    async def fetch_content(self, url: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Fetch content from URL with proper error handling and retries.
        
        Args:
            url: URL to fetch
            options: Optional processing parameters
            
        Returns:
            Dict containing content, metadata, and status information
        """
        options = options or {}
        url = self.normalize_url(url)
        
        if not self.validate_url(url):
            raise ValueError(f"Invalid URL format: {url}")
        
        headers = {
            'User-Agent': options.get('user_agent', self.user_agents[0]),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5,he;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        timeout = options.get('timeout', self.timeout)
        max_retries = options.get('max_retries', self.max_retries)
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Fetching URL (attempt {attempt + 1}/{max_retries}): {url}")
                
                async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                    response = await client.get(url, headers=headers)
                    
                    # Check response status
                    if response.status_code == 200:
                        content = response.text
                        
                        # Check content size
                        if len(content) > self.max_content_size:
                            self.logger.warning(f"Content too large ({len(content)} bytes), truncating")
                            content = content[:self.max_content_size]
                        
                        return {
                            'content': content,
                            'url': str(response.url),  # Final URL after redirects
                            'status_code': response.status_code,
                            'headers': dict(response.headers),
                            'encoding': response.encoding,
                            'success': True
                        }
                    
                    elif response.status_code == 429:  # Rate limited
                        wait_time = self.retry_delay * (2 ** attempt)
                        self.logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                        await asyncio.sleep(wait_time)
                        continue
                        
                    else:
                        raise httpx.HTTPStatusError(
                            f"HTTP {response.status_code}", 
                            request=response.request, 
                            response=response
                        )
                        
            except Exception as e:
                last_error = e
                self.logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                
                if attempt < max_retries - 1:
                    wait_time = self.retry_delay * (2 ** attempt)
                    self.logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
        
        # All attempts failed
        raise Exception(f"Failed to fetch URL after {max_retries} attempts. Last error: {str(last_error)}")
    
    def extract_recipe_content(self, html_content: str, source_url: str) -> Dict[str, Any]:
        """
        Extract recipe content from HTML using multiple strategies.
        
        Args:
            html_content: Raw HTML content
            url: Source URL for context
            
        Returns:
            Dict containing extracted content and metadata
        """
        soup = BeautifulSoup(html_content, 'lxml')
        
        # Strategy 1: Try JSON-LD structured data
        json_ld_content = self._extract_json_ld(soup)
        if json_ld_content:
            self.logger.info(f"Successfully extracted content from JSON-LD for {source_url}")
            return {
                'content': json_ld_content,
                'extraction_method': 'json-ld',
                'confidence': 0.95
            }
        
        # Strategy 2: Try microdata
        microdata_content = self._extract_microdata(soup)
        if microdata_content:
            self.logger.info(f"Successfully extracted content from microdata for {source_url}")
            return {
                'content': microdata_content,
                'extraction_method': 'microdata',
                'confidence': 0.85
            }
        
        # Strategy 3: Try common recipe selectors
        selector_content = self._extract_by_selectors(soup)
        if selector_content:
            self.logger.info(f"Successfully extracted content using CSS selectors for {source_url}")
            return {
                'content': selector_content,
                'extraction_method': 'css-selectors',
                'confidence': 0.75
            }
        
        # Strategy 4: Fallback to full text extraction
        self.logger.info(f"Using fallback text extraction for {source_url}")
        text_content = self._extract_full_text(soup)
        return {
            'content': text_content,
            'extraction_method': 'full-text',
            'confidence': 0.5
        }
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract recipe content from JSON-LD structured data."""
        try:
            scripts = soup.find_all('script', type='application/ld+json')
            
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    
                    # Handle both single objects and arrays
                    if isinstance(data, list):
                        data = data[0] if data else {}
                    
                    # Look for Recipe schema
                    if self._is_recipe_schema(data):
                        return self._format_json_ld_recipe(data)
                        
                    # Check nested @graph
                    if '@graph' in data:
                        for item in data['@graph']:
                            if self._is_recipe_schema(item):
                                return self._format_json_ld_recipe(item)
                                
                except json.JSONDecodeError:
                    continue
                    
        except Exception as e:
            self.logger.warning(f"Error extracting JSON-LD: {str(e)}")
        
        return None
    
    def _is_recipe_schema(self, data: Dict) -> bool:
        """Check if data contains Recipe schema."""
        type_val = data.get('@type', '')
        return 'Recipe' in type_val if isinstance(type_val, (str, list)) else False
    
    def _format_json_ld_recipe(self, data: Dict) -> str:
        """Format JSON-LD recipe data into readable text."""
        lines = []
        
        # Recipe name
        name = data.get('name', '')
        if name:
            lines.append(f"Recipe: {name}")
            lines.append("")
        
        # Description
        description = data.get('description', '')
        if description:
            lines.append(f"Description: {description}")
            lines.append("")
        
        # Times
        prep_time = self._parse_duration(data.get('prepTime'))
        cook_time = self._parse_duration(data.get('cookTime'))
        total_time = self._parse_duration(data.get('totalTime'))
        
        if prep_time or cook_time or total_time:
            lines.append("Times:")
            if prep_time:
                lines.append(f"- Prep time: {prep_time} minutes")
            if cook_time:
                lines.append(f"- Cook time: {cook_time} minutes")
            if total_time:
                lines.append(f"- Total time: {total_time} minutes")
            lines.append("")
        
        # Servings
        recipe_yield = data.get('recipeYield') or data.get('yield')
        if recipe_yield:
            lines.append(f"Servings: {recipe_yield}")
            lines.append("")
        
        # Ingredients
        ingredients = data.get('recipeIngredient', [])
        if ingredients:
            lines.append("Ingredients:")
            for ingredient in ingredients:
                lines.append(f"- {ingredient}")
            lines.append("")
        
        # Instructions
        instructions = data.get('recipeInstructions', [])
        if instructions:
            lines.append("Instructions:")
            for i, instruction in enumerate(instructions, 1):
                if isinstance(instruction, dict):
                    text = instruction.get('text', '')
                else:
                    text = str(instruction)
                
                if text:
                    lines.append(f"{i}. {text}")
            lines.append("")
        
        # Additional metadata
        category = data.get('recipeCategory')
        cuisine = data.get('recipeCuisine')
        keywords = data.get('keywords')
        
        if category or cuisine or keywords:
            lines.append("Additional Info:")
            if category:
                lines.append(f"- Category: {category}")
            if cuisine:
                lines.append(f"- Cuisine: {cuisine}")
            if keywords:
                if isinstance(keywords, list):
                    lines.append(f"- Keywords: {', '.join(keywords)}")
                else:
                    lines.append(f"- Keywords: {keywords}")
        
        return '\n'.join(lines)
    
    def _parse_duration(self, duration: Optional[str]) -> Optional[int]:
        """Parse ISO 8601 duration to minutes."""
        if not duration:
            return None
        
        try:
            # Simple regex for PT format (PT30M, PT1H30M, etc.)
            match = re.search(r'PT(?:(\d+)H)?(?:(\d+)M)?', duration)
            if match:
                hours = int(match.group(1) or 0)
                minutes = int(match.group(2) or 0)
                return hours * 60 + minutes
        except:
            pass
        
        return None
    
    def _extract_microdata(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract recipe content from microdata."""
        try:
            # Look for itemtype="http://schema.org/Recipe"
            recipe_elements = soup.find_all(attrs={"itemtype": re.compile(r".*Recipe.*")})
            
            if not recipe_elements:
                return None
            
            recipe_elem = recipe_elements[0]
            lines = []
            
            # Extract name
            name_elem = recipe_elem.find(attrs={"itemprop": "name"})
            if name_elem:
                lines.append(f"Recipe: {name_elem.get_text().strip()}")
                lines.append("")
            
            # Extract description
            desc_elem = recipe_elem.find(attrs={"itemprop": "description"})
            if desc_elem:
                lines.append(f"Description: {desc_elem.get_text().strip()}")
                lines.append("")
            
            # Extract ingredients
            ingredient_elems = recipe_elem.find_all(attrs={"itemprop": "recipeIngredient"})
            if ingredient_elems:
                lines.append("Ingredients:")
                for elem in ingredient_elems:
                    lines.append(f"- {elem.get_text().strip()}")
                lines.append("")
            
            # Extract instructions
            instruction_elems = recipe_elem.find_all(attrs={"itemprop": "recipeInstructions"})
            if instruction_elems:
                lines.append("Instructions:")
                for i, elem in enumerate(instruction_elems, 1):
                    lines.append(f"{i}. {elem.get_text().strip()}")
                lines.append("")
            
            return '\n'.join(lines) if lines else None
            
        except Exception as e:
            self.logger.warning(f"Error extracting microdata: {str(e)}")
        
        return None
    
    def _extract_by_selectors(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract recipe content using common CSS selectors."""
        try:
            # Common recipe content selectors
            selectors = [
                '.recipe-content',
                '.recipe-card',
                '.recipe-details',
                '.entry-content',
                '.post-content',
                '[class*="recipe"]',
                '.instructions',
                '.ingredients'
            ]
            
            best_content = None
            best_score = 0
            
            for selector in selectors:
                elements = soup.select(selector)
                for elem in elements:
                    text = elem.get_text()
                    score = self._score_recipe_content(text)
                    
                    if score > best_score:
                        best_score = score
                        best_content = text
            
            if best_content and best_score > 10:  # Minimum threshold
                return self._clean_extracted_text(best_content)
                
        except Exception as e:
            self.logger.warning(f"Error extracting by selectors: {str(e)}")
        
        return None
    
    def _extract_full_text(self, soup: BeautifulSoup) -> str:
        """Extract and clean full text content as fallback."""
        try:
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                element.decompose()
            
            text = soup.get_text()
            return self._clean_extracted_text(text)
            
        except Exception as e:
            self.logger.warning(f"Error extracting full text: {str(e)}")
            return "Failed to extract content from webpage."
    
    def _score_recipe_content(self, text: str) -> int:
        """Score text content based on recipe-related keywords."""
        if not text:
            return 0
        
        text_lower = text.lower()
        score = 0
        
        # Recipe indicators
        recipe_keywords = [
            'ingredients', 'instructions', 'directions', 'recipe', 'cooking',
            'bake', 'cook', 'preparation', 'prep time', 'cook time',
            'servings', 'serves', 'yield', 'minutes', 'hours',
            'מרכיבים', 'הוראות', 'מתכון', 'בישול', 'הכנה'  # Hebrew
        ]
        
        for keyword in recipe_keywords:
            score += text_lower.count(keyword) * 2
        
        # Common cooking verbs
        cooking_verbs = [
            'mix', 'stir', 'add', 'combine', 'heat', 'boil', 'simmer',
            'chop', 'slice', 'dice', 'pour', 'serve', 'season',
            'לערבב', 'להוסיף', 'לחמם', 'לבשל', 'לחתוך'  # Hebrew
        ]
        
        for verb in cooking_verbs:
            score += text_lower.count(verb)
        
        # Penalty for very short or very long content
        length = len(text)
        if length < 100:
            score = score * 0.5
        elif length > 10000:
            score = score * 0.8
        
        return int(score)
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean and normalize extracted text."""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common website elements
        noise_patterns = [
            r'cookie policy.*?accept',
            r'advertisement',
            r'subscribe.*?newsletter',
            r'follow us on.*?social',
            r'rate this recipe',
            r'print recipe',
            r'save recipe',
            r'jump to recipe',
            r'פרסומת',  # Hebrew: advertisement
            r'מדיניות עוגיות',  # Hebrew: cookie policy
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    async def process_url(self, url: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main method to process a recipe URL and extract content.
        
        Args:
            url: URL to process
            options: Optional processing parameters
            
        Returns:
            Dict containing extracted content and metadata
        """
        start_time = time.time()
        
        try:
            # Fetch content
            fetch_result = await self.fetch_content(url, options)
            
            if not fetch_result['success']:
                raise Exception("Failed to fetch URL content")
            
            # Extract recipe content
            extraction_result = self.extract_recipe_content(
                fetch_result['content'], 
                fetch_result['url']
            )
            
            processing_time = time.time() - start_time
            
            return {
                'success': True,
                'content': extraction_result['content'],
                'source_url': fetch_result['url'],
                'extraction_method': extraction_result['extraction_method'],
                'confidence': extraction_result['confidence'],
                'processing_time': processing_time,
                'metadata': {
                    'status_code': fetch_result['status_code'],
                    'encoding': fetch_result['encoding'],
                    'content_length': len(fetch_result['content'])
                }
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            self.logger.error(f"URL processing failed: {str(e)}")
            
            return {
                'success': False,
                'error': str(e),
                'source_url': url,
                'processing_time': processing_time
            }