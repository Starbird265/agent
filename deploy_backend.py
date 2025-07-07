#!/usr/bin/env python3
"""
AI TrainEasy Backend Deployment Script
Automates the backend deployment process for Render
"""

import requests
import json
import time
import os
import sys

# Configuration
RENDER_API_KEY = "rnd_6Ran5iNxW5HouIFymfSOeI20QJFr"
FRONTEND_SERVICE_ID = "srv-d1h9fsvdiees738jkoa0"
GITHUB_REPO = "https://github.com/Starbird265/agent"
OWNER_ID = "tea-d1f189emcj7s7398tr70"

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Content-Type": "application/json"
}

def check_services():
    """Check current services"""
    print("🔍 Checking current services...")
    response = requests.get("https://api.render.com/v1/services", headers=headers)
    if response.status_code == 200:
        services = response.json()
        print(f"✅ Found {len(services)} services")
        for service in services:
            s = service['service']
            print(f"  - {s['name']}: {s.get('serviceDetails', {}).get('url', 'N/A')}")
        return services
    else:
        print(f"❌ Failed to fetch services: {response.status_code}")
        return []

def find_backend_service():
    """Find existing backend service"""
    services = check_services()
    for service in services:
        s = service['service']
        if 'backend' in s['name'].lower() or 'python' in str(s.get('serviceDetails', {})):
            return s['id']
    return None

def update_frontend_api_url(backend_url):
    """Update frontend to use backend URL"""
    print(f"🔗 Connecting frontend to backend: {backend_url}")
    
    env_vars = [{"key": "VITE_API_URL", "value": backend_url}]
    
    response = requests.post(
        f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/env-vars",
        headers=headers,
        json=env_vars
    )
    
    if response.status_code == 200:
        print("✅ Frontend environment variables updated")
        # Trigger frontend deployment
        deploy_response = requests.post(
            f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/deploys",
            headers=headers,
            json={}
        )
        if deploy_response.status_code == 200:
            print("🚀 Frontend redeployment triggered")
        return True
    else:
        print(f"❌ Failed to update frontend: {response.status_code}")
        return False

def monitor_deployment(service_id, deploy_id):
    """Monitor deployment status"""
    print(f"📊 Monitoring deployment {deploy_id}...")
    
    for i in range(30):  # 5 minutes max
        time.sleep(10)
        response = requests.get(
            f"https://api.render.com/v1/services/{service_id}/deploys/{deploy_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            deploy = response.json()
            status = deploy.get('status')
            print(f"  Status: {status}")
            
            if status == 'live':
                print("🎉 Deployment successful!")
                return True
            elif status in ['build_failed', 'deploy_failed']:
                print(f"❌ Deployment failed: {status}")
                return False
        else:
            print(f"  ⚠️ Could not check status: {response.status_code}")
    
    print("⏰ Deployment monitoring timeout")
    return False

def print_manual_instructions():
    """Print manual creation instructions"""
    print("\n" + "="*60)
    print("🛠️  MANUAL BACKEND CREATION REQUIRED")
    print("="*60)
    print("""
Due to Render API limitations for free tier services, please create the backend manually:

1. Open: https://dashboard.render.com/
2. Click: "New +" → "Web Service"
3. Connect Repository: Starbird265/agent
4. Configuration:
   
   Name: ai-traineasy-backend
   Root Directory: packages/backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: python main_simple.py
   Plan: Free

5. Environment Variables:
   HOST=0.0.0.0
   PORT=10000
   ENVIRONMENT=production
   CORS_ORIGINS=https://ai-traineasy-frontend.onrender.com

6. Click: "Create Web Service"

7. Copy the service URL (e.g., https://ai-traineasy-backend-xxxx.onrender.com)

8. Run this script again with the backend URL:
   python deploy_backend.py --backend-url YOUR_BACKEND_URL
""")
    print("="*60)

def main():
    """Main deployment function"""
    print("🚀 AI TrainEasy Backend Deployment Script")
    print("="*50)
    
    # Check if backend URL provided
    if len(sys.argv) > 2 and sys.argv[1] == '--backend-url':
        backend_url = sys.argv[2]
        print(f"🔗 Using provided backend URL: {backend_url}")
        
        # Update frontend to use this backend
        if update_frontend_api_url(backend_url):
            print("\n🎉 SUCCESS! Backend connected to frontend")
            print(f"Frontend: https://ai-traineasy-frontend.onrender.com")
            print(f"Backend:  {backend_url}")
            print("\n🧪 Test your platform now!")
        else:
            print("❌ Failed to connect backend to frontend")
        return
    
    # Check existing services
    backend_service_id = find_backend_service()
    
    if backend_service_id:
        print(f"✅ Found existing backend service: {backend_service_id}")
        # Could add logic to update existing service here
    else:
        print("📋 No backend service found")
        print_manual_instructions()

if __name__ == "__main__":
    main()