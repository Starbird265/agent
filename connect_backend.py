#!/usr/bin/env python3
"""
Instant Backend Connection Script
Connects your backend to frontend via API
"""

import requests
import json
import time
import sys

# Configuration
RENDER_API_KEY = "rnd_6Ran5iNxW5HouIFymfSOeI20QJFr"
FRONTEND_SERVICE_ID = "srv-d1h9fsvdiees738jkoa0"

headers = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Content-Type": "application/json"
}

def connect_backend(backend_url):
    """Connect backend to frontend"""
    print(f"🔗 Connecting backend {backend_url} to frontend...")
    
    # Update frontend environment variable
    env_vars = [{"key": "VITE_API_URL", "value": backend_url}]
    
    response = requests.post(
        f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/env-vars",
        headers=headers,
        json=env_vars
    )
    
    if response.status_code == 200:
        print("✅ Frontend environment variables updated")
        
        # Trigger frontend redeploy
        deploy_response = requests.post(
            f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/deploys",
            headers=headers,
            json={}
        )
        
        if deploy_response.status_code == 200:
            deploy_data = deploy_response.json()
            deploy_id = deploy_data['id']
            print(f"🚀 Frontend redeployment triggered: {deploy_id}")
            
            # Monitor deployment
            print("📊 Monitoring deployment...")
            for i in range(18):  # 3 minutes max
                time.sleep(10)
                status_response = requests.get(
                    f"https://api.render.com/v1/services/{FRONTEND_SERVICE_ID}/deploys/{deploy_id}",
                    headers=headers
                )
                
                if status_response.status_code == 200:
                    deploy = status_response.json()
                    status = deploy.get('status')
                    print(f"  Status: {status}")
                    
                    if status == 'live':
                        print("🎉 Frontend successfully connected to backend!")
                        return True
                    elif status in ['build_failed', 'deploy_failed']:
                        print(f"❌ Deployment failed: {status}")
                        return False
                else:
                    print(f"  ⚠️ Could not check status: {status_response.status_code}")
            
            print("⏰ Deployment monitoring timeout")
            return False
        else:
            print(f"❌ Failed to trigger deployment: {deploy_response.status_code}")
            return False
    else:
        print(f"❌ Failed to update environment: {response.status_code}")
        return False

def test_connection(backend_url):
    """Test backend connection"""
    print(f"🧪 Testing backend connection: {backend_url}")
    
    try:
        response = requests.get(f"{backend_url}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend responding: {data.get('status', 'OK')}")
            return True
        else:
            print(f"⚠️ Backend returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def get_all_services():
    """Get all services for verification"""
    print("🔍 Checking all services...")
    response = requests.get("https://api.render.com/v1/services", headers=headers)
    
    if response.status_code == 200:
        services = response.json()
        print(f"✅ Found {len(services)} services:")
        
        for service in services:
            s = service['service']
            service_type = s['type']
            url = s.get('serviceDetails', {}).get('url', 'N/A')
            status = "🔴 Suspended" if s['suspended'] != 'not_suspended' else "🟢 Active"
            print(f"  {status} {s['name']} ({service_type}): {url}")
        
        return services
    else:
        print(f"❌ Failed to fetch services: {response.status_code}")
        return []

def main():
    """Main function"""
    print("🚀 AI TrainEasy Backend Connection Script")
    print("="*50)
    
    if len(sys.argv) != 2:
        print("Usage: python connect_backend.py <backend_url>")
        print("Example: python connect_backend.py https://ai-traineasy-backend-xxxx.onrender.com")
        sys.exit(1)
    
    backend_url = sys.argv[1].rstrip('/')
    
    print(f"Backend URL: {backend_url}")
    print(f"Frontend URL: https://ai-traineasy-frontend.onrender.com")
    print()
    
    # Step 1: Test backend
    if not test_connection(backend_url):
        print("⚠️ Backend not responding yet (might still be building)")
        print("Proceeding with connection setup...")
    
    # Step 2: Connect to frontend
    if connect_backend(backend_url):
        print("\n🎉 SUCCESS! Platform fully connected!")
        print("="*50)
        print("🌐 Your AI TrainEasy Platform is LIVE:")
        print(f"   Frontend: https://ai-traineasy-frontend.onrender.com")
        print(f"   Backend:  {backend_url}")
        print()
        print("🧪 Test your platform:")
        print("   1. Use invitation code: BETA-2024-EARLY")
        print("   2. Create an account")
        print("   3. Upload a dataset")
        print("   4. Start training!")
        print("="*50)
        
        # Show all services
        get_all_services()
        
    else:
        print("❌ Connection failed. Please check the backend URL and try again.")

if __name__ == "__main__":
    main()