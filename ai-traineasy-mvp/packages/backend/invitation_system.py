#!/usr/bin/env python3
"""
AI TrainEasy MVP - Invitation Code System
Simple invitation-based access control for beta deployment
"""
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Set
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class InvitationManager:
    def __init__(self, codes_file: str = "invitation_codes.json"):
        self.codes_file = Path(codes_file)
        self.active_codes: Dict[str, dict] = {}
        self.sessions: Dict[str, dict] = {}
        self.load_codes()
        
    def load_codes(self):
        """Load invitation codes from file"""
        if self.codes_file.exists():
            try:
                with open(self.codes_file, 'r') as f:
                    data = json.load(f)
                    self.active_codes = data.get('active', {})
                    self.sessions = data.get('sessions', {})
            except Exception as e:
                logger.warning(f"Could not load invitation codes: {e}")
                self.create_default_codes()
        else:
            self.create_default_codes()
    
    def save_codes(self):
        """Save invitation codes to file"""
        try:
            data = {
                'active': self.active_codes,
                'sessions': self.sessions,
                'updated': datetime.now().isoformat()
            }
            with open(self.codes_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save invitation codes: {e}")
    
    def create_default_codes(self):
        """Create default invitation codes for beta access"""
        default_codes = [
            "BETA-2025-EARLY",
            "AUTOML-PREVIEW", 
            "AI-TRAIN-DEMO",
            "ML-BETA-ACCESS",
            "TRAINEASY-VIP",
            "RENDER-DEPLOY",
            "BETA-TESTER-001"
        ]
        
        for code in default_codes:
            self.active_codes[code] = {
                'created': datetime.now().isoformat(),
                'max_uses': 100,  # Each code can be used 100 times
                'current_uses': 0,
                'expires': (datetime.now() + timedelta(days=90)).isoformat(),
                'description': f'Beta access code: {code}',
                'active': True
            }
        
        self.save_codes()
        logger.info(f"Created {len(default_codes)} default invitation codes")
    
    def validate_code(self, code: str) -> dict:
        """Validate an invitation code"""
        code = code.strip().upper()
        
        if not code:
            return {'valid': False, 'reason': 'Code is required'}
        
        if code not in self.active_codes:
            return {'valid': False, 'reason': 'Invalid invitation code'}
        
        code_info = self.active_codes[code]
        
        # Check if code is active
        if not code_info.get('active', True):
            return {'valid': False, 'reason': 'This invitation code has been deactivated'}
        
        # Check expiration
        expires = datetime.fromisoformat(code_info['expires'])
        if datetime.now() > expires:
            return {'valid': False, 'reason': 'This invitation code has expired'}
        
        # Check usage limit
        if code_info['current_uses'] >= code_info['max_uses']:
            return {'valid': False, 'reason': 'This invitation code has reached its usage limit'}
        
        return {'valid': True, 'code_info': code_info}
    
    def use_code(self, code: str, client_ip: str = "unknown") -> str:
        """Use an invitation code and create a session"""
        validation = self.validate_code(code)
        
        if not validation['valid']:
            return None
        
        # Increment usage
        self.active_codes[code]['current_uses'] += 1
        self.active_codes[code]['last_used'] = datetime.now().isoformat()
        
        # Create session token
        session_token = self.create_session(code, client_ip)
        
        self.save_codes()
        return session_token
    
    def create_session(self, code: str, client_ip: str) -> str:
        """Create a session token"""
        # Generate secure session token
        session_data = f"{code}:{client_ip}:{time.time()}:{secrets.token_urlsafe(16)}"
        session_token = hashlib.sha256(session_data.encode()).hexdigest()[:32]
        
        self.sessions[session_token] = {
            'code': code,
            'client_ip': client_ip,
            'created': datetime.now().isoformat(),
            'expires': (datetime.now() + timedelta(hours=24)).isoformat(),
            'active': True
        }
        
        return session_token
    
    def validate_session(self, session_token: str) -> bool:
        """Validate a session token"""
        if not session_token or session_token not in self.sessions:
            return False
        
        session = self.sessions[session_token]
        
        # Check if session is active
        if not session.get('active', True):
            return False
        
        # Check expiration
        expires = datetime.fromisoformat(session['expires'])
        if datetime.now() > expires:
            # Deactivate expired session
            self.sessions[session_token]['active'] = False
            self.save_codes()
            return False
        
        return True
    
    def get_stats(self) -> dict:
        """Get invitation system statistics"""
        active_codes = sum(1 for code in self.active_codes.values() if code.get('active', True))
        total_uses = sum(code.get('current_uses', 0) for code in self.active_codes.values())
        active_sessions = sum(1 for session in self.sessions.values() if session.get('active', True))
        
        return {
            'active_codes': active_codes,
            'total_codes': len(self.active_codes),
            'total_uses': total_uses,
            'active_sessions': active_sessions,
            'total_sessions': len(self.sessions)
        }

# Global invitation manager instance
invitation_manager = InvitationManager()