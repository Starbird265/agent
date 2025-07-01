#!/usr/bin/env python3
"""
AI TrainEasy MVP - Invitation Code Generator and Tester
Use this tool to generate and test invitation codes
"""
import requests
import json
import random
import string
from datetime import datetime

def generate_custom_code(prefix="CUSTOM", length=8):
    """Generate a custom invitation code"""
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    return f"{prefix}-{suffix}"

def test_invitation_code(code, backend_url="https://agent-d83t.onrender.com"):
    """Test an invitation code against the backend"""
    try:
        response = requests.post(
            f"{backend_url}/auth/validate-invitation",
            headers={"Content-Type": "application/json"},
            json={"code": code},
            timeout=10
        )
        
        return {
            "code": code,
            "status_code": response.status_code,
            "response": response.json(),
            "success": response.status_code == 200
        }
    except Exception as e:
        return {
            "code": code,
            "error": str(e),
            "success": False
        }

def main():
    print("🎯 AI TrainEasy Invitation Code Generator & Tester")
    print("=" * 60)
    
    # Current working invitation codes
    working_codes = [
        "BETA-2025-EARLY",
        "AUTOML-PREVIEW", 
        "AI-TRAIN-DEMO",
        "ML-BETA-ACCESS",
        "TRAINEASY-VIP",
        "ADMIN-ACCESS",
        "DEV-TEST"
    ]
    
    print("\n📋 CURRENT WORKING INVITATION CODES:")
    for i, code in enumerate(working_codes, 1):
        print(f"{i}. {code}")
    
    print("\n🧪 TESTING INVITATION CODES:")
    print("-" * 40)
    
    # Test each code
    backend_url = "https://agent-d83t.onrender.com"
    for code in working_codes[:3]:  # Test first 3 codes
        print(f"Testing: {code}")
        result = test_invitation_code(code, backend_url)
        
        if result["success"]:
            print(f"✅ {code} - WORKING")
            if "session_token" in result["response"]:
                token = result["response"]["session_token"]
                print(f"   Session Token: {token[:16]}...")
        else:
            print(f"❌ {code} - FAILED")
            if "error" in result:
                print(f"   Error: {result['error']}")
            else:
                print(f"   Response: {result.get('response', 'No response')}")
        print()
    
    print("\n🔧 GENERATE NEW INVITATION CODES:")
    print("-" * 40)
    
    # Generate some new codes
    custom_codes = []
    prefixes = ["BETA", "DEMO", "TEST", "VIP", "SPECIAL"]
    
    for prefix in prefixes:
        new_code = generate_custom_code(prefix)
        custom_codes.append(new_code)
        print(f"Generated: {new_code}")
    
    print(f"\n💾 SAVE THESE CODES TO YOUR BACKEND:")
    print("Add these codes to your backend's valid_codes dictionary:")
    print("-" * 50)
    
    for code in custom_codes:
        print(f'''"{code}": {{
    "active": True,
    "uses": 0,
    "max_uses": 100,
    "created": "{datetime.now().isoformat()}",
    "description": "Custom generated code"
}},''')
    
    print("\n🎯 USAGE INSTRUCTIONS:")
    print("=" * 50)
    print("1. Frontend URL: https://ai-traineasy-frontend.onrender.com")
    print("2. Use any of the working codes above")
    print("3. If codes don't work, the backend needs to be updated")
    print("4. Check backend logs for debugging")
    
    print("\n🔍 TROUBLESHOOTING:")
    print("- If invitation fails, check backend status at:")
    print("  https://agent-d83t.onrender.com/health")
    print("- Check debug endpoint:")
    print("  https://agent-d83t.onrender.com/debug/invitation-system")

if __name__ == "__main__":
    main()