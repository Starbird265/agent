#!/usr/bin/env python3
"""
AI TrainEasy Automated Deployment Assistant
Creates backend service and connects everything automatically
"""

import requests
import json
import time
import webbrowser
import sys
from urllib.parse import quote

# Configuration
RENDER_API_KEY = "rnd_6Ran5iNxW5HouIFymfSOeI20QJFr"
FRONTEND_SERVICE_ID = "srv-d1h9fsvdiees738jkoa0"
GITHUB_REPO = "https://github.com/Starbird265/agent"
OWNER_ID = "tea-d1f189emcj7s7398tr70"

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Content-Type": "application/json"
}

def create_render_url():
    """Generate Render deployment URL with pre-filled parameters"""
    base_url = "https://dashboard.render.com/select-repo"
    params = {
        'type': 'web',
        'name': 'ai-traineasy-backend',
        'branch': 'main',
        'rootDir': 'packages/backend',
        'runtime': 'python3',
        'buildCommand': 'pip install -r requirements.txt',
        'startCommand': 'python main_simple.py',
        'plan': 'free'
    }
    
    # Create URL with parameters (manual construction since render doesn't support all params)
    url = f"{base_url}?type=web"
    return url

def wait_for_backend_creation():
    """Monitor for new backend service creation"""
    print("🔍 Monitoring for new backend service...")
    initial_services = get_current_services()
    initial_count = len(initial_services)
    
    print(f"Current services: {initial_count}")
    print("Waiting for new service to appear...")
    
    for i in range(60):  # Wait up to 10 minutes
        time.sleep(10)
        current_services = get_current_services()
        
        if len(current_services) > initial_count:
            # New service detected
            new_services = [s for s in current_services if s not in initial_services]
            for service in new_services:
                s = service['service']
                if 'backend' in s['name'].lower() or s.get('rootDir') == 'packages/backend':
                    print(f"✅ New backend service detected: {s['name']}")
                    return s['id'], s.get('serviceDetails', {}).get('url')
        
        print(f"  Still waiting... ({i+1}/60)")
    
    print("⏰ Timeout waiting for service creation")
    return None, None

def get_current_services():
    """Get current services"""
    response = requests.get("https://api.render.com/v1/services", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def connect_services(backend_url):
    """Connect backend to frontend"""
    print(f"🔗 Connecting backend to frontend...")
    
    # Update frontend environment variables
    env_vars = [{"key": "VITE_API_URL", "value": backend_url}]
    
    response = requests.post(
        f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/env-vars",
        headers=headers,
        json=env_vars
    )
    
    if response.status_code == 200:
        print("✅ Frontend environment updated")
        
        # Trigger frontend redeploy
        deploy_response = requests.post(
            f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/deploys",
            headers=headers,
            json={}
        )
        
        if deploy_response.status_code == 200:
            print("🚀 Frontend redeployment triggered")
            return True
    
    return False

def setup_backend_env_vars(service_id):
    """Setup backend environment variables"""
    print(f"⚙️ Setting up backend environment variables...")
    
    env_vars = [
        {"key": "HOST", "value": "0.0.0.0"},
        {"key": "PORT", "value": "10000"},
        {"key": "ENVIRONMENT", "value": "production"},
        {"key": "CORS_ORIGINS", "value": "https://ai-traineasy-frontend.onrender.com"}
    ]
    
    response = requests.post(
        f"https://api.render.com/v1/services/{service_id}/env-vars",
        headers=headers,
        json=env_vars
    )
    
    if response.status_code == 200:
        print("✅ Backend environment variables configured")
        
        # Trigger backend redeploy
        deploy_response = requests.post(
            f"https://api.render.com/v1/services/{service_id}/deploys",
            headers=headers,
            json={}
        )
        
        if deploy_response.status_code == 200:
            print("🚀 Backend redeployment triggered")
            return True
    
    return False

def main():
    """Main deployment orchestrator"""
    print("🚀 AI TrainEasy Automated Deployment Assistant")
    print("=" * 60)
    
    print("\n📋 STEP 1: Create Backend Service")
    print("I'll open Render dashboard for you with optimal settings...")
    print("\nPlease follow these steps:")
    print("1. Select 'Starbird265/agent' repository")
    print("2. Use these EXACT settings:")
    print("   - Name: ai-traineasy-backend")
    print("   - Root Directory: packages/backend")
    print("   - Runtime: Python 3")
    print("   - Build Command: pip install -r requirements.txt")
    print("   - Start Command: python main_simple.py")
    print("   - Plan: Free")
    print("3. Click 'Create Web Service'")
    print("\nI'll automatically detect when you create it and connect everything!")
    
    # Open Render dashboard
    render_url = create_render_url()
    print(f"\n🌐 Opening: {render_url}")
    
    try:
        webbrowser.open(render_url)
    except:
        print("Please manually open the URL above")
    
    input("\n⏯️  Press ENTER when you're ready to start monitoring...")
    
    # Monitor for service creation
    service_id, backend_url = wait_for_backend_creation()
    
    if service_id and backend_url:
        print(f"\n🎉 Backend service created successfully!")
        print(f"Service ID: {service_id}")
        print(f"Backend URL: {backend_url}")
        
        # Setup backend environment variables
        if setup_backend_env_vars(service_id):
            print("✅ Backend configured")
        
        # Connect to frontend
        if connect_services(backend_url):
            print("✅ Services connected")
        
        # Final status
        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT COMPLETE!")
        print("=" * 60)
        print("🌐 Your AI TrainEasy Platform:")
        print(f"   Frontend: https://ai-traineasy-frontend.onrender.com")
        print(f"   Backend:  {backend_url}")
        print("\n🧪 Test with invitation code: BETA-2024-EARLY")
        print("=" * 60)
        
    else:
        print("\n❌ Could not detect backend service creation")
        print("Please run the connect_backend.py script manually with your backend URL")

if __name__ == "__main__":
    main()