"""
Security configuration for the Recipe Reader API.

This module provides security-related configuration settings,
including trusted proxy definitions for secure IP address extraction.

Configuration:
    Set the TRUSTED_PROXY_IPS environment variable to a comma-separated list
    of IP addresses or CIDR networks that should be trusted as proxies:
    
    TRUSTED_PROXY_IPS="10.0.0.1,192.168.1.0/24,172.16.0.0/16"
    
    If not set, defaults include common cloud platform proxy ranges.
"""

import os
from typing import Set
from ipaddress import ip_network, ip_address, AddressValueError


class SecurityConfig:
    """Security configuration settings."""
    
    def __init__(self):
        """Initialize security configuration from environment variables."""
        self._trusted_proxies = self._parse_trusted_proxies()
    
    def _parse_trusted_proxies(self) -> Set[str]:
        """
        Parse trusted proxy IP addresses and networks from environment.
        
        Returns:
            Set of trusted proxy IP addresses and networks
        """
        # Default trusted proxies for common production environments
        default_proxies = {
            # Vercel proxy IPs (common deployment platform)
            "76.76.21.0/24",
            "76.76.19.0/24",
            # Cloudflare proxy IPs (subset - add more as needed)
            "103.21.244.0/22",
            "103.22.200.0/22",
            "103.31.4.0/22",
            "104.16.0.0/13",
            "104.24.0.0/14",
            "108.162.192.0/18",
            "131.0.72.0/22",
            "141.101.64.0/18",
            "162.158.0.0/15",
            "172.64.0.0/13",
            "173.245.48.0/20",
            "188.114.96.0/20",
            "190.93.240.0/20",
            "197.234.240.0/22",
            "198.41.128.0/17",
            # Local development
            "127.0.0.1",
            "::1"
        }
        
        # Get custom trusted proxies from environment
        env_proxies = os.getenv("TRUSTED_PROXY_IPS", "")
        if env_proxies:
            try:
                custom_proxies = {ip.strip() for ip in env_proxies.split(",") if ip.strip()}
                # Validate each IP/network
                validated_proxies = set()
                for proxy in custom_proxies:
                    try:
                        # Try to parse as network first, then as single IP
                        if "/" in proxy:
                            ip_network(proxy, strict=False)
                        else:
                            ip_address(proxy)
                        validated_proxies.add(proxy)
                    except AddressValueError:
                        # Log invalid proxy and skip
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Invalid trusted proxy IP/network in config: {proxy}")
                
                return validated_proxies
            except Exception:
                # If custom parsing fails, use defaults
                import logging
                logger = logging.getLogger(__name__)
                logger.warning("Failed to parse TRUSTED_PROXY_IPS environment variable, using defaults")
        
        return default_proxies
    
    def is_trusted_proxy(self, client_ip: str) -> bool:
        """
        Check if the given IP address is a trusted proxy.
        
        Args:
            client_ip: IP address to check
            
        Returns:
            bool: True if IP is from a trusted proxy, False otherwise
        """
        if not client_ip or client_ip == "unknown":
            return False
            
        try:
            client_addr = ip_address(client_ip)
            
            for trusted_proxy in self._trusted_proxies:
                try:
                    if "/" in trusted_proxy:
                        # Network range
                        if client_addr in ip_network(trusted_proxy, strict=False):
                            return True
                    else:
                        # Single IP
                        if client_addr == ip_address(trusted_proxy):
                            return True
                except AddressValueError:
                    continue
                    
        except AddressValueError:
            # Invalid client IP format
            return False
            
        return False
    
    @property
    def trusted_proxies(self) -> Set[str]:
        """Get the set of trusted proxy IPs/networks."""
        return self._trusted_proxies.copy()


# Global security configuration instance
security_config = SecurityConfig()