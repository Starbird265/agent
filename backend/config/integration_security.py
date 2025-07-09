"""
SECURE INTEGRATION CONFIGURATION
Temporal.io + Gemini CLI with Privacy-First Approach
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from cryptography.fernet import Fernet
import logging

@dataclass
class IntegrationSecurityConfig:
    """Security configuration for external integrations"""
    
    # Privacy settings
    local_only_mode: bool = True
    external_api_calls_enabled: bool = False
    data_retention_policy: str = "none"
    privacy_mode: str = "strict"
    
    # Temporal settings
    temporal_local_deployment: bool = True
    temporal_external_connections: bool = False
    temporal_encryption_enabled: bool = True
    
    # Gemini settings
    gemini_enabled: bool = False
    gemini_data_retention: str = "none"
    gemini_model_training: bool = False
    gemini_logging: bool = False
    gemini_analytics: bool = False
    
    # Security settings
    encryption_required: bool = True
    audit_logging: bool = True
    security_monitoring: bool = True

class IntegrationSecurity:
    """Security manager for external integrations"""
    
    def __init__(self, config: IntegrationSecurityConfig = None):
        self.config = config or IntegrationSecurityConfig()
        self.logger = logging.getLogger(__name__)
        self.encryption_key = self._get_encryption_key()
        
    def _get_encryption_key(self) -> bytes:
        """Get or generate encryption key"""
        key = os.getenv('INTEGRATION_ENCRYPTION_KEY')
        if not key:
            key = Fernet.generate_key()
            self.logger.warning("Generated new encryption key. Save it securely!")
        return key.encode() if isinstance(key, str) else key
    
    def validate_privacy_compliance(self) -> Dict[str, Any]:
        """Validate privacy compliance for integrations"""
        compliance_report = {
            "local_only_mode": self.config.local_only_mode,
            "external_api_calls": self.config.external_api_calls_enabled,
            "data_retention": self.config.data_retention_policy,
            "privacy_mode": self.config.privacy_mode,
            "encryption_enabled": self.config.encryption_required,
            "audit_logging": self.config.audit_logging,
            "compliance_score": self._calculate_compliance_score(),
            "recommendations": self._get_privacy_recommendations()
        }
        
        self.logger.info(f"Privacy compliance check: {compliance_report['compliance_score']}%")
        return compliance_report
    
    def _calculate_compliance_score(self) -> float:
        """Calculate privacy compliance score"""
        score = 0
        total = 0
        
        # Local-only mode (30% weight)
        if self.config.local_only_mode:
            score += 30
        total += 30
        
        # Data retention policy (25% weight)
        if self.config.data_retention_policy == "none":
            score += 25
        elif self.config.data_retention_policy == "minimal":
            score += 15
        total += 25
        
        # Privacy mode (20% weight)
        if self.config.privacy_mode == "strict":
            score += 20
        elif self.config.privacy_mode == "balanced":
            score += 10
        total += 20
        
        # Encryption (15% weight)
        if self.config.encryption_required:
            score += 15
        total += 15
        
        # Audit logging (10% weight)
        if self.config.audit_logging:
            score += 10
        total += 10
        
        return (score / total) * 100 if total > 0 else 0
    
    def _get_privacy_recommendations(self) -> list:
        """Get privacy improvement recommendations"""
        recommendations = []
        
        if not self.config.local_only_mode:
            recommendations.append("Enable local-only mode for maximum privacy")
        
        if self.config.external_api_calls_enabled:
            recommendations.append("Consider disabling external API calls")
        
        if self.config.data_retention_policy != "none":
            recommendations.append("Set data retention policy to 'none'")
        
        if self.config.privacy_mode != "strict":
            recommendations.append("Enable strict privacy mode")
        
        if not self.config.encryption_required:
            recommendations.append("Enable encryption for all data")
        
        return recommendations
    
    def get_temporal_config(self) -> Dict[str, Any]:
        """Get secure Temporal configuration"""
        return {
            "local_deployment": self.config.temporal_local_deployment,
            "external_connections": self.config.temporal_external_connections,
            "encryption_enabled": self.config.temporal_encryption_enabled,
            "network_policy": "localhost_only",
            "data_persistence": "local_only",
            "security_headers": {
                "X-Temporal-Namespace": "ai-traineasy-local",
                "X-Privacy-Mode": self.config.privacy_mode,
                "X-Local-Only": str(self.config.local_only_mode)
            }
        }
    
    def get_gemini_config(self) -> Dict[str, Any]:
        """Get secure Gemini configuration"""
        return {
            "enabled": self.config.gemini_enabled,
            "data_retention": self.config.gemini_data_retention,
            "model_training": self.config.gemini_model_training,
            "logging": self.config.gemini_logging,
            "analytics": self.config.gemini_analytics,
            "privacy_settings": {
                "data_retention": "none",
                "model_training_opt_out": True,
                "logging_disabled": True,
                "analytics_disabled": True
            },
            "security_settings": {
                "encryption_required": True,
                "input_sanitization": True,
                "output_validation": True,
                "rate_limiting": True,
                "audit_logging": True
            }
        }
    
    def validate_integration_security(self) -> Dict[str, Any]:
        """Validate overall integration security"""
        security_checks = {
            "encryption_enabled": self.config.encryption_required,
            "local_deployment": self.config.temporal_local_deployment,
            "privacy_mode": self.config.privacy_mode == "strict",
            "external_api_minimal": not self.config.external_api_calls_enabled,
            "audit_logging": self.config.audit_logging,
            "data_retention_minimal": self.config.data_retention_policy == "none"
        }
        
        passed_checks = sum(1 for check in security_checks.values() if check)
        total_checks = len(security_checks)
        security_score = (passed_checks / total_checks) * 100
        
        return {
            "security_score": security_score,
            "checks_passed": passed_checks,
            "total_checks": total_checks,
            "security_status": "EXCELLENT" if security_score >= 90 else 
                            "GOOD" if security_score >= 75 else "NEEDS_IMPROVEMENT",
            "checks": security_checks,
            "recommendations": self._get_security_recommendations(security_checks)
        }
    
    def _get_security_recommendations(self, checks: Dict[str, bool]) -> list:
        """Get security improvement recommendations"""
        recommendations = []
        
        if not checks["encryption_enabled"]:
            recommendations.append("Enable encryption for all data")
        
        if not checks["local_deployment"]:
            recommendations.append("Deploy Temporal locally for better security")
        
        if not checks["privacy_mode"]:
            recommendations.append("Enable strict privacy mode")
        
        if not checks["external_api_minimal"]:
            recommendations.append("Minimize external API calls")
        
        if not checks["audit_logging"]:
            recommendations.append("Enable comprehensive audit logging")
        
        if not checks["data_retention_minimal"]:
            recommendations.append("Set data retention policy to 'none'")
        
        return recommendations
    
    def log_security_event(self, event_type: str, details: Dict[str, Any]):
        """Log security event for monitoring"""
        security_event = {
            "timestamp": __import__('datetime').datetime.now().isoformat(),
            "event_type": event_type,
            "details": details,
            "privacy_mode": self.config.privacy_mode,
            "local_only": self.config.local_only_mode
        }
        
        self.logger.info(f"Security event: {event_type}", extra=security_event)
    
    def get_privacy_report(self) -> Dict[str, Any]:
        """Generate comprehensive privacy report"""
        return {
            "privacy_compliance": self.validate_privacy_compliance(),
            "security_validation": self.validate_integration_security(),
            "temporal_config": self.get_temporal_config(),
            "gemini_config": self.get_gemini_config(),
            "overall_rating": self._calculate_overall_rating(),
            "deployment_ready": self._is_deployment_ready()
        }
    
    def _calculate_overall_rating(self) -> float:
        """Calculate overall privacy and security rating"""
        privacy_score = self.validate_privacy_compliance()["compliance_score"]
        security_score = self.validate_integration_security()["security_score"]
        
        # Weighted average: 60% privacy, 40% security
        return (privacy_score * 0.6) + (security_score * 0.4)
    
    def _is_deployment_ready(self) -> bool:
        """Check if integration is ready for deployment"""
        privacy_score = self.validate_privacy_compliance()["compliance_score"]
        security_score = self.validate_integration_security()["security_score"]
        
        # Both scores must be above 85%
        return privacy_score >= 85 and security_score >= 85

# Default secure configuration
DEFAULT_SECURE_CONFIG = IntegrationSecurityConfig(
    local_only_mode=True,
    external_api_calls_enabled=False,
    data_retention_policy="none",
    privacy_mode="strict",
    temporal_local_deployment=True,
    temporal_external_connections=False,
    temporal_encryption_enabled=True,
    gemini_enabled=False,
    gemini_data_retention="none",
    gemini_model_training=False,
    gemini_logging=False,
    gemini_analytics=False,
    encryption_required=True,
    audit_logging=True,
    security_monitoring=True
)