#!/usr/bin/env python3
"""
AI TrainEasy MVP - Beta Testing Script
Automated testing for beta release validation
"""
import requests
import json
import time
import os
import tempfile
import csv
from pathlib import Path
from datetime import datetime

class BetaTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.test_project_id = None
        self.results = []
        
    def log_test(self, test_name, success, message="", details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            success = response.status_code == 200
            data = response.json() if success else None
            
            self.log_test(
                "Health Check",
                success,
                f"Status: {response.status_code}" if success else f"Failed: {response.status_code}",
                data
            )
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_system_info(self):
        """Test system info endpoint"""
        try:
            response = requests.get(f"{self.base_url}/system-info", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["cpu_count", "cpu_percent", "total_ram_gb", "gpu_available"]
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    success = False
                    message = f"Missing fields: {missing_fields}"
                else:
                    message = f"CPU: {data['cpu_count']} cores, RAM: {data['total_ram_gb']}GB, GPU: {data['gpu_available']}"
            else:
                message = f"Failed: {response.status_code}"
                data = None
            
            self.log_test("System Info", success, message, data)
            return success
        except Exception as e:
            self.log_test("System Info", False, f"Exception: {str(e)}")
            return False
    
    def test_project_creation(self):
        """Test project creation"""
        try:
            project_data = {"name": f"Beta Test Project {int(time.time())}"}
            response = requests.post(
                f"{self.base_url}/projects/create",
                json=project_data,
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                if data.get("success") and "project" in data:
                    self.test_project_id = data["project"]["id"]
                    message = f"Created project: {self.test_project_id}"
                else:
                    success = False
                    message = "Invalid response format"
            else:
                message = f"Failed: {response.status_code}"
                data = None
            
            self.log_test("Project Creation", success, message, data)
            return success
        except Exception as e:
            self.log_test("Project Creation", False, f"Exception: {str(e)}")
            return False
    
    def create_test_csv(self):
        """Create a test CSV file"""
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
        
        # Create simple iris-like dataset
        data = [
            ["sepal_length", "sepal_width", "petal_length", "petal_width", "species"],
            [5.1, 3.5, 1.4, 0.2, "setosa"],
            [4.9, 3.0, 1.4, 0.2, "setosa"],
            [7.0, 3.2, 4.7, 1.4, "versicolor"],
            [6.4, 3.2, 4.5, 1.5, "versicolor"],
            [6.3, 3.3, 6.0, 2.5, "virginica"],
            [5.8, 2.7, 5.1, 1.9, "virginica"],
        ]
        
        writer = csv.writer(temp_file)
        writer.writerows(data)
        temp_file.close()
        
        return temp_file.name
    
    def test_file_upload(self):
        """Test file upload"""
        if not self.test_project_id:
            self.log_test("File Upload", False, "No test project available")
            return False
        
        csv_file = self.create_test_csv()
        
        try:
            with open(csv_file, 'rb') as f:
                files = {'file': ('test_data.csv', f, 'text/csv')}
                response = requests.post(
                    f"{self.base_url}/projects/{self.test_project_id}/data",
                    files=files,
                    timeout=30
                )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                message = f"Uploaded {data.get('size', 'unknown')} bytes"
            else:
                message = f"Failed: {response.status_code}"
                data = response.text
            
            self.log_test("File Upload", success, message, {"response": data})
            return success
            
        except Exception as e:
            self.log_test("File Upload", False, f"Exception: {str(e)}")
            return False
        finally:
            # Cleanup
            try:
                os.unlink(csv_file)
            except:
                pass
    
    def test_schema_save(self):
        """Test schema configuration"""
        if not self.test_project_id:
            self.log_test("Schema Save", False, "No test project available")
            return False
        
        schema = {
            "inputs": ["sepal_length", "sepal_width", "petal_length", "petal_width"],
            "output": "species"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/projects/{self.test_project_id}/schema",
                json=schema,
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                message = f"Schema saved with {len(schema['inputs'])} inputs"
            else:
                message = f"Failed: {response.status_code}"
                data = response.text
            
            self.log_test("Schema Save", success, message, {"response": data})
            return success
            
        except Exception as e:
            self.log_test("Schema Save", False, f"Exception: {str(e)}")
            return False
    
    def test_training_start(self):
        """Test training initiation"""
        if not self.test_project_id:
            self.log_test("Training Start", False, "No test project available")
            return False
        
        train_config = {
            "cpu_percent": 50,
            "use_gpu": False
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/projects/{self.test_project_id}/train",
                json=train_config,
                timeout=15
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                message = "Training started successfully"
            else:
                message = f"Failed: {response.status_code}"
                data = response.text
            
            self.log_test("Training Start", success, message, {"response": data})
            return success
            
        except Exception as e:
            self.log_test("Training Start", False, f"Exception: {str(e)}")
            return False
    
    def test_logs_access(self):
        """Test log access"""
        if not self.test_project_id:
            self.log_test("Logs Access", False, "No test project available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/projects/{self.test_project_id}/logs",
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                log_content = response.text
                message = f"Retrieved {len(log_content)} characters of logs"
            else:
                message = f"Failed: {response.status_code}"
                log_content = ""
            
            self.log_test("Logs Access", success, message, {"log_length": len(log_content)})
            return success
            
        except Exception as e:
            self.log_test("Logs Access", False, f"Exception: {str(e)}")
            return False
    
    def test_security_file_upload(self):
        """Test security - invalid file upload"""
        if not self.test_project_id:
            self.log_test("Security Test", False, "No test project available")
            return False
        
        # Try to upload a Python file (should be rejected)
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False)
        temp_file.write('print("Hello, World!")')
        temp_file.close()
        
        try:
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('malicious.py', f, 'text/python')}
                response = requests.post(
                    f"{self.base_url}/projects/{self.test_project_id}/data",
                    files=files,
                    timeout=10
                )
            
            # Should fail (400/403)
            success = response.status_code in [400, 403]
            if success:
                message = f"Correctly rejected .py file (Status: {response.status_code})"
            else:
                message = f"Security issue: .py file accepted (Status: {response.status_code})"
            
            self.log_test("Security Test", success, message)
            return success
            
        except Exception as e:
            self.log_test("Security Test", False, f"Exception: {str(e)}")
            return False
        finally:
            try:
                os.unlink(temp_file.name)
            except:
                pass
    
    def test_error_handling(self):
        """Test error handling"""
        tests = [
            ("Invalid Project ID", f"/projects/invalid-id/data"),
            ("Malformed JSON", f"/projects/create"),
        ]
        
        all_passed = True
        
        for test_name, endpoint in tests:
            try:
                if "create" in endpoint:
                    # Send malformed JSON
                    response = requests.post(
                        f"{self.base_url}{endpoint}",
                        data="invalid json",
                        headers={"Content-Type": "application/json"},
                        timeout=5
                    )
                else:
                    # Invalid project ID
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                
                # Should return proper error status
                success = response.status_code in [400, 404, 422]
                if not success:
                    all_passed = False
                
                self.log_test(
                    f"Error Handling - {test_name}",
                    success,
                    f"Status: {response.status_code}" if success else f"Unexpected status: {response.status_code}"
                )
                
            except Exception as e:
                self.log_test(f"Error Handling - {test_name}", False, f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 AI TrainEasy Beta Test Suite")
        print("=" * 50)
        print(f"Target: {self.base_url}")
        print(f"Started: {datetime.now().isoformat()}")
        print()
        
        # Core functionality tests
        tests = [
            ("Basic Connectivity", self.test_health_check),
            ("System Information", self.test_system_info),
            ("Project Creation", self.test_project_creation),
            ("File Upload", self.test_file_upload),
            ("Schema Configuration", self.test_schema_save),
            ("Training Start", self.test_training_start),
            ("Log Access", self.test_logs_access),
            ("Security Validation", self.test_security_file_upload),
            ("Error Handling", self.test_error_handling),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_description, test_function in tests:
            print(f"\n🔍 Running: {test_description}")
            if test_function():
                passed += 1
            time.sleep(1)  # Brief pause between tests
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {passed}/{total} passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! Ready for beta release.")
        elif passed >= total * 0.8:
            print("⚠️  Most tests passed. Review failures before release.")
        else:
            print("❌ Multiple test failures. Not ready for beta release.")
        
        return {
            "summary": {
                "total": total,
                "passed": passed,
                "percentage": round(passed/total*100, 1),
                "ready_for_beta": passed >= total * 0.8
            },
            "results": self.results
        }
    
    def save_results(self, filename="beta_test_results.json"):
        """Save test results to file"""
        with open(filename, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "target_url": self.base_url,
                "summary": {
                    "total": len(self.results),
                    "passed": sum(1 for r in self.results if r["success"]),
                },
                "results": self.results
            }, f, indent=2)
        print(f"📁 Results saved to: {filename}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="AI TrainEasy Beta Testing")
    parser.add_argument("--url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--output", help="Save results to file")
    
    args = parser.parse_args()
    
    tester = BetaTester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        tester.save_results(args.output)
    
    # Exit with appropriate code
    exit_code = 0 if results["summary"]["ready_for_beta"] else 1
    exit(exit_code)

if __name__ == "__main__":
    main()