import requests
import sys
import json
from datetime import datetime

class TaskFlowAPITester:
    def __init__(self, base_url="https://collab-tasks-34.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.test_user_id = None
        self.test_project_id = None
        self.test_task_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, method, endpoint, data=None, use_auth=True):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response
        except Exception as e:
            return None

    def test_health_check(self):
        """Test API health check"""
        print("\n🔍 Testing API Health Check...")
        response = self.make_request('GET', '/', use_auth=False)
        if response and response.status_code == 200:
            self.log_test("API Health Check", True)
            return True
        else:
            self.log_test("API Health Check", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_signup(self):
        """Test user signup"""
        print("\n🔍 Testing User Signup...")
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "name": "Test User",
            "email": test_email,
            "password": "testpass123"
        }
        
        response = self.make_request('POST', '/auth/signup', data, use_auth=False)
        if response and response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data and 'user' in response_data:
                self.token = response_data['token']
                self.test_user_id = response_data['user']['id']
                self.log_test("User Signup", True)
                return True
            else:
                self.log_test("User Signup", False, "Missing token or user data")
                return False
        else:
            self.log_test("User Signup", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_login_existing_user(self):
        """Test login with existing user"""
        print("\n🔍 Testing Login with Existing User...")
        data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        response = self.make_request('POST', '/auth/login', data, use_auth=False)
        if response and response.status_code == 200:
            response_data = response.json()
            if 'token' in response_data and 'user' in response_data:
                # Use existing user token for further tests
                self.token = response_data['token']
                self.test_user_id = response_data['user']['id']
                self.log_test("Login Existing User", True)
                return True
            else:
                self.log_test("Login Existing User", False, "Missing token or user data")
                return False
        else:
            self.log_test("Login Existing User", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_me(self):
        """Test get current user"""
        print("\n🔍 Testing Get Current User...")
        response = self.make_request('GET', '/auth/me')
        if response and response.status_code == 200:
            user_data = response.json()
            if 'id' in user_data and 'email' in user_data:
                self.log_test("Get Current User", True)
                return True
            else:
                self.log_test("Get Current User", False, "Missing user data fields")
                return False
        else:
            self.log_test("Get Current User", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n🔍 Testing Dashboard Stats...")
        response = self.make_request('GET', '/dashboard/stats')
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['total_projects', 'total_tasks', 'todo_tasks', 'in_progress_tasks', 'review_tasks', 'done_tasks']
            missing_fields = [field for field in required_fields if field not in stats]
            if not missing_fields:
                self.log_test("Dashboard Stats", True)
                return True
            else:
                self.log_test("Dashboard Stats", False, f"Missing fields: {missing_fields}")
                return False
        else:
            self.log_test("Dashboard Stats", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_project(self):
        """Test project creation"""
        print("\n🔍 Testing Create Project...")
        data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "description": "Test project for API testing"
        }
        
        response = self.make_request('POST', '/projects', data)
        if response and response.status_code == 200:
            project_data = response.json()
            if 'id' in project_data and 'name' in project_data:
                self.test_project_id = project_data['id']
                self.log_test("Create Project", True)
                return True
            else:
                self.log_test("Create Project", False, "Missing project data")
                return False
        else:
            self.log_test("Create Project", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_projects(self):
        """Test get user projects"""
        print("\n🔍 Testing Get Projects...")
        response = self.make_request('GET', '/projects')
        if response and response.status_code == 200:
            projects = response.json()
            if isinstance(projects, list):
                self.log_test("Get Projects", True)
                return True
            else:
                self.log_test("Get Projects", False, "Response is not a list")
                return False
        else:
            self.log_test("Get Projects", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_project_details(self):
        """Test get specific project details"""
        if not self.test_project_id:
            self.log_test("Get Project Details", False, "No test project ID available")
            return False
            
        print("\n🔍 Testing Get Project Details...")
        response = self.make_request('GET', f'/projects/{self.test_project_id}')
        if response and response.status_code == 200:
            project = response.json()
            if 'id' in project and 'name' in project and 'members' in project:
                self.log_test("Get Project Details", True)
                return True
            else:
                self.log_test("Get Project Details", False, "Missing project fields")
                return False
        else:
            self.log_test("Get Project Details", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_create_task(self):
        """Test task creation"""
        if not self.test_project_id:
            self.log_test("Create Task", False, "No test project ID available")
            return False
            
        print("\n🔍 Testing Create Task...")
        data = {
            "title": f"Test Task {datetime.now().strftime('%H%M%S')}",
            "description": "Test task for API testing",
            "status": "todo",
            "priority": "medium",
            "assignee_id": self.test_user_id,
            "due_date": None
        }
        
        response = self.make_request('POST', f'/projects/{self.test_project_id}/tasks', data)
        if response and response.status_code == 200:
            task_data = response.json()
            if 'id' in task_data and 'title' in task_data:
                self.test_task_id = task_data['id']
                self.log_test("Create Task", True)
                return True
            else:
                self.log_test("Create Task", False, "Missing task data")
                return False
        else:
            self.log_test("Create Task", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_tasks(self):
        """Test get project tasks"""
        if not self.test_project_id:
            self.log_test("Get Tasks", False, "No test project ID available")
            return False
            
        print("\n🔍 Testing Get Tasks...")
        response = self.make_request('GET', f'/projects/{self.test_project_id}/tasks')
        if response and response.status_code == 200:
            tasks = response.json()
            if isinstance(tasks, list):
                self.log_test("Get Tasks", True)
                return True
            else:
                self.log_test("Get Tasks", False, "Response is not a list")
                return False
        else:
            self.log_test("Get Tasks", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_update_task(self):
        """Test task update"""
        if not self.test_task_id:
            self.log_test("Update Task", False, "No test task ID available")
            return False
            
        print("\n🔍 Testing Update Task...")
        data = {
            "title": "Updated Test Task",
            "status": "in_progress",
            "priority": "high"
        }
        
        response = self.make_request('PUT', f'/tasks/{self.test_task_id}', data)
        if response and response.status_code == 200:
            task_data = response.json()
            if task_data.get('title') == data['title'] and task_data.get('status') == data['status']:
                self.log_test("Update Task", True)
                return True
            else:
                self.log_test("Update Task", False, "Task not updated correctly")
                return False
        else:
            self.log_test("Update Task", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_move_task(self):
        """Test task move functionality"""
        if not self.test_task_id:
            self.log_test("Move Task", False, "No test task ID available")
            return False
            
        print("\n🔍 Testing Move Task...")
        data = {
            "status": "review",
            "order": 0
        }
        
        response = self.make_request('PUT', f'/tasks/{self.test_task_id}/move', data)
        if response and response.status_code == 200:
            task_data = response.json()
            if task_data.get('status') == data['status']:
                self.log_test("Move Task", True)
                return True
            else:
                self.log_test("Move Task", False, "Task not moved correctly")
                return False
        else:
            self.log_test("Move Task", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_get_activity(self):
        """Test get user activity"""
        print("\n🔍 Testing Get Activity...")
        response = self.make_request('GET', '/activity')
        if response and response.status_code == 200:
            activities = response.json()
            if isinstance(activities, list):
                self.log_test("Get Activity", True)
                return True
            else:
                self.log_test("Get Activity", False, "Response is not a list")
                return False
        else:
            self.log_test("Get Activity", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test task
        if self.test_task_id:
            response = self.make_request('DELETE', f'/tasks/{self.test_task_id}')
            if response and response.status_code == 200:
                print("✅ Test task deleted")
            else:
                print("❌ Failed to delete test task")
        
        # Delete test project
        if self.test_project_id:
            response = self.make_request('DELETE', f'/projects/{self.test_project_id}')
            if response and response.status_code == 200:
                print("✅ Test project deleted")
            else:
                print("❌ Failed to delete test project")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting TaskFlow Pro API Tests")
        print("=" * 50)
        
        # Test health check first
        if not self.test_health_check():
            print("\n❌ API is not responding. Stopping tests.")
            return False
        
        # Try existing user login first, fallback to signup
        print("\n📋 Testing Authentication...")
        auth_success = self.test_login_existing_user()
        if not auth_success:
            print("Existing user login failed, trying signup...")
            auth_success = self.test_signup()
        
        if not auth_success:
            print("\n❌ Authentication failed. Stopping tests.")
            return False
        
        # Test authenticated endpoints
        self.test_get_me()
        self.test_dashboard_stats()
        
        # Test project management
        self.test_create_project()
        self.test_get_projects()
        self.test_get_project_details()
        
        # Test task management
        self.test_create_task()
        self.test_get_tasks()
        self.test_update_task()
        self.test_move_task()
        
        # Test activity
        self.test_get_activity()
        
        # Cleanup
        self.cleanup_test_data()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("🏁 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        print("\n" + "=" * 50)
        return len(self.failed_tests) == 0

def main():
    tester = TaskFlowAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Return appropriate exit code
        return 0 if success else 1
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())