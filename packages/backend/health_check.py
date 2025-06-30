#!/usr/bin/env python3
"""
AI TrainEasy MVP - Health Check Script
Simple monitoring and diagnostics
"""
import requests
import json
import time
import psutil
import os
from datetime import datetime
from pathlib import Path

class HealthChecker:
    def __init__(self, backend_url="http://localhost:8000", frontend_url="http://localhost:5173"):
        self.backend_url = backend_url
        self.frontend_url = frontend_url
        
    def check_backend(self):
        """Check backend health"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                return {"status": "healthy", "response_time": response.elapsed.total_seconds()}
            else:
                return {"status": "unhealthy", "status_code": response.status_code}
        except requests.exceptions.RequestException as e:
            return {"status": "down", "error": str(e)}
    
    def check_frontend(self):
        """Check frontend accessibility"""
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200:
                return {"status": "healthy", "response_time": response.elapsed.total_seconds()}
            else:
                return {"status": "unhealthy", "status_code": response.status_code}
        except requests.exceptions.RequestException as e:
            return {"status": "down", "error": str(e)}
    
    def check_system_resources(self):
        """Check system resources"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "disk_percent": round((disk.used / disk.total) * 100, 1)
        }
    
    def check_projects_directory(self):
        """Check projects directory health"""
        projects_dir = Path("projects")
        if not projects_dir.exists():
            return {"status": "missing", "count": 0}
        
        try:
            project_files = list(projects_dir.glob("*.json"))
            total_size = sum(
                sum(f.stat().st_size for f in project_dir.rglob("*") if f.is_file())
                for project_dir in projects_dir.iterdir() if project_dir.is_dir()
            )
            
            return {
                "status": "healthy",
                "project_count": len(project_files),
                "total_size_mb": round(total_size / (1024**2), 2)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def check_logs(self):
        """Check log files"""
        log_files = ["app.log"]
        log_status = {}
        
        for log_file in log_files:
            log_path = Path(log_file)
            if log_path.exists():
                stat = log_path.stat()
                log_status[log_file] = {
                    "exists": True,
                    "size_mb": round(stat.st_size / (1024**2), 2),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                }
            else:
                log_status[log_file] = {"exists": False}
        
        return log_status
    
    def run_full_check(self):
        """Run comprehensive health check"""
        print("🏥 AI TrainEasy Health Check")
        print("=" * 40)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print()
        
        # Backend check
        print("🔧 Backend Service:")
        backend_status = self.check_backend()
        if backend_status["status"] == "healthy":
            print(f"  ✅ Healthy (Response: {backend_status['response_time']:.3f}s)")
        else:
            print(f"  ❌ {backend_status['status'].title()}: {backend_status.get('error', 'Unknown error')}")
        
        # Frontend check
        print("\n🎨 Frontend Service:")
        frontend_status = self.check_frontend()
        if frontend_status["status"] == "healthy":
            print(f"  ✅ Healthy (Response: {frontend_status['response_time']:.3f}s)")
        else:
            print(f"  ❌ {frontend_status['status'].title()}: {frontend_status.get('error', 'Unknown error')}")
        
        # System resources
        print("\n💻 System Resources:")
        resources = self.check_system_resources()
        print(f"  CPU: {resources['cpu_percent']:.1f}%")
        print(f"  Memory: {resources['memory_percent']:.1f}% used, {resources['memory_available_gb']} GB available")
        print(f"  Disk: {resources['disk_percent']:.1f}% used, {resources['disk_free_gb']} GB free")
        
        # Warn on high usage
        if resources['cpu_percent'] > 80:
            print("  ⚠️  High CPU usage detected")
        if resources['memory_percent'] > 80:
            print("  ⚠️  High memory usage detected")
        if resources['disk_percent'] > 90:
            print("  ⚠️  Low disk space detected")
        
        # Projects directory
        print("\n📁 Projects Directory:")
        projects_status = self.check_projects_directory()
        if projects_status["status"] == "healthy":
            print(f"  ✅ {projects_status['project_count']} projects, {projects_status['total_size_mb']} MB total")
        else:
            print(f"  ❌ {projects_status['status'].title()}: {projects_status.get('error', 'Unknown error')}")
        
        # Logs
        print("\n📋 Log Files:")
        log_status = self.check_logs()
        for log_file, status in log_status.items():
            if status["exists"]:
                print(f"  ✅ {log_file}: {status['size_mb']} MB (Modified: {status['modified']})")
            else:
                print(f"  ⚠️  {log_file}: Not found")
        
        print("\n" + "=" * 40)
        
        # Overall status
        overall_healthy = (
            backend_status["status"] == "healthy" and
            resources['cpu_percent'] < 90 and
            resources['memory_percent'] < 90 and
            resources['disk_percent'] < 95
        )
        
        if overall_healthy:
            print("✅ Overall Status: HEALTHY")
        else:
            print("⚠️  Overall Status: NEEDS ATTENTION")
        
        return {
            "timestamp": datetime.now().isoformat(),
            "backend": backend_status,
            "frontend": frontend_status,
            "resources": resources,
            "projects": projects_status,
            "logs": log_status,
            "overall_healthy": overall_healthy
        }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI TrainEasy Health Check")
    parser.add_argument("--backend", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--frontend", default="http://localhost:5173", help="Frontend URL")
    parser.add_argument("--json", action="store_true", help="Output in JSON format")
    parser.add_argument("--monitor", type=int, help="Monitor mode: check every N seconds")
    
    args = parser.parse_args()
    
    checker = HealthChecker(args.backend, args.frontend)
    
    if args.monitor:
        print(f"🔄 Monitoring mode: checking every {args.monitor} seconds (Press Ctrl+C to stop)")
        try:
            while True:
                result = checker.run_full_check()
                if not result["overall_healthy"]:
                    print("🚨 ALERT: System needs attention!")
                time.sleep(args.monitor)
                print("\n" + "🔄 Checking again..." + "\n")
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped")
    else:
        result = checker.run_full_check()
        if args.json:
            print("\n📄 JSON Output:")
            print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()