import urllib.request
import urllib.parse
import json
import sys
from datetime import date

BASE_URL = "http://127.0.0.1:8000"

results = {
    "passed": 0,
    "failed": 0,
    "details": []
}

def log_test(name, success, message=""):
    status = "PASS" if success else "FAIL"
    if success:
        results["passed"] += 1
    else:
        results["failed"] += 1
    results["details"].append({"test": name, "status": status, "message": message})
    print(f"[{status}] {name} - {message}")

def make_request(url, method="GET", data=None, headers=None, is_form=False):
    if headers is None:
        headers = {}
    
    encoded_data = None
    if data is not None:
        if is_form:
            encoded_data = urllib.parse.urlencode(data).encode('utf-8')
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        else:
            encoded_data = json.dumps(data).encode('utf-8')
            headers['Content-Type'] = 'application/json'
            
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            json_body = None
            try:
                json_body = json.loads(body)
            except:
                json_body = body
            return resp.status, json_body
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            json_body = json.loads(body)
        except:
            json_body = body
        return e.code, json_body
    except Exception as e:
        return 500, str(e)

print("=== STARTING COMPLETE BACKEND INTEGRATION TEST SUITE ===")

# 1. API Documentation
status_code, body = make_request(f"{BASE_URL}/docs")
log_test("API Documentation (/docs)", status_code == 200, f"Status: {status_code}")

# 2. Authentication - Invalid Login Rejection
status_code, body = make_request(f"{BASE_URL}/login", method="POST", data={"username": "wrong", "password": "bad"}, is_form=True)
log_test("Auth: Invalid Login Rejection", status_code in (400, 401), f"Status: {status_code}")

# 3. Authentication - Valid Admin Login
status_code, body = make_request(f"{BASE_URL}/login", method="POST", data={"username": "admin", "password": "admin123"}, is_form=True)
token = None
if status_code == 200 and isinstance(body, dict):
    token = body.get("access_token")
    log_test("Auth: Admin Login Success", True, f"Token received")
else:
    log_test("Auth: Admin Login Success", False, f"Status: {status_code}, Response: {body}")

if not token:
    print("FATAL: Could not obtain auth token. Aborting suite.")
    sys.exit(1)

auth_headers = {"Authorization": f"Bearer {token}"}

# 4. User Profile (/users/me)
status_code, body = make_request(f"{BASE_URL}/users/me", headers=auth_headers)
log_test("User: Profile (/users/me)", status_code == 200 and isinstance(body, dict) and body.get("username") == "admin", f"Role: {body.get('role') if isinstance(body, dict) else status_code}")

# 5. List Users (/users/)
status_code, body = make_request(f"{BASE_URL}/users/", headers=auth_headers)
log_test("User: List Users (/users/)", status_code == 200 and isinstance(body, list), f"Total Users: {len(body) if isinstance(body, list) else 0}")

# 6. Security Overview (/security/status)
status_code, body = make_request(f"{BASE_URL}/security/status", headers=auth_headers)
log_test("Security: Admin Status Overview", status_code == 200 and isinstance(body, dict), f"Features: {len(body.get('security_features', [])) if isinstance(body, dict) else 0}")

# 7. Create Patient
patient_id = None
patient_payload = {
    "name": "Test Patient Tamil",
    "age": 35,
    "gender": "Male",
    "phone": "9876543210",
    "address": "123 Main St, Chennai",
    "blood_group": "O+"
}
status_code, body = make_request(f"{BASE_URL}/patients/", method="POST", data=patient_payload, headers=auth_headers)
if status_code == 200 and isinstance(body, dict):
    patient_id = body.get("id")
    log_test("Patient: Create Patient", True, f"Patient ID: {patient_id}")
else:
    log_test("Patient: Create Patient", False, f"Status: {status_code}, Body: {body}")

# 8. List Patients
status_code, body = make_request(f"{BASE_URL}/patients/", headers=auth_headers)
log_test("Patient: List Patients", status_code == 200 and isinstance(body, list), f"Count: {len(body) if isinstance(body, list) else 0}")

# 9. Global Search
status_code, body = make_request(f"{BASE_URL}/search/?q=Tamil", headers=auth_headers)
log_test("Search: Global Search API", status_code == 200 and isinstance(body, list), f"Results Count: {len(body) if isinstance(body, list) else 0}")

# 10. Create OP Token (/tokens/)
token_id = None
if patient_id:
    op_payload = {
        "patient_id": patient_id,
        "session": "Morning",
        "date": str(date.today()),
        "fee": 300.0
    }
    status_code, body = make_request(f"{BASE_URL}/tokens/", method="POST", data=op_payload, headers=auth_headers)
    if status_code == 200 and isinstance(body, dict):
        token_id = body.get("id")
        log_test("OP Token: Create Token", True, f"Token ID: {token_id}, Token Number: {body.get('token_number')}")
    else:
        log_test("OP Token: Create Token", False, f"Status: {status_code}, Body: {body}")

# 11. List OP Tokens
status_code, body = make_request(f"{BASE_URL}/tokens/?target_date={str(date.today())}", headers=auth_headers)
log_test("OP Token: List Tokens Today", status_code == 200 and isinstance(body, list), f"Today Tokens: {len(body) if isinstance(body, list) else 0}")

# 12. Create Casesheet (EMR)
if patient_id:
    casesheet_payload = {
        "patient_id": patient_id,
        "token_id": token_id,
        "symptoms": "Fever, Cough",
        "diagnosis": "Viral Upper Respiratory Infection",
        "vitals_bp": "120/80",
        "vitals_pulse": "72",
        "vitals_temp": "98.6 F",
        "prescribed_medicines": [
            {"name": "Paracetamol 500mg", "quantity": 10, "dosage": "1-0-1", "instructions": "After food"}
        ]
    }
    status_code, body = make_request(f"{BASE_URL}/casesheets/", method="POST", data=casesheet_payload, headers=auth_headers)
    log_test("Casesheet: Create Doctor Consultation", status_code == 200, f"Casesheet ID: {body.get('id') if isinstance(body, dict) else status_code}")

# 13. Create Pharmacy Stock Item
import time
unique_batch = f"AMX{int(time.time())}"
stock_payload = {
    "name": f"Amoxicillin {int(time.time())%1000}mg",
    "category": "Antibiotics",
    "batch_no": unique_batch,
    "expiry_date": "2027-12-31",
    "quantity": 200,
    "purchase_price": 5.00,
    "selling_price": 10.00
}
status_code, body = make_request(f"{BASE_URL}/inventory/", method="POST", data=stock_payload, headers=auth_headers)
log_test("Pharmacy: Add Stock Item", status_code == 200, f"Stock Item: {body.get('name') if isinstance(body, dict) else status_code}")

# 14. List Pharmacy Inventory
status_code, body = make_request(f"{BASE_URL}/inventory/", headers=auth_headers)
log_test("Pharmacy: List Inventory", status_code == 200 and isinstance(body, list), f"Total Items: {len(body) if isinstance(body, list) else 0}")

# 15. Create OP Bill (/billing/op/)
if patient_id:
    op_bill_payload = {
        "patient_id": patient_id,
        "token_id": token_id,
        "doctor_name": "Dr. Kumar",
        "department": "General",
        "consultation_fee": 300.0,
        "lab_charges": 0.0,
        "pharmacy_charges": 50.0,
        "other_charges": [],
        "discount": 0.0,
        "gst": 0.0,
        "payment_mode": "Cash"
    }
    status_code, body = make_request(f"{BASE_URL}/billing/op/", method="POST", data=op_bill_payload, headers=auth_headers)
    log_test("Billing: Create OP Bill", status_code == 200, f"Total Bill Amount: {body.get('total') if isinstance(body, dict) else status_code}")

# 16. List OP Bills
status_code, body = make_request(f"{BASE_URL}/billing/op/", headers=auth_headers)
log_test("Billing: List OP Bills", status_code == 200 and isinstance(body, list), f"Count: {len(body) if isinstance(body, list) else 0}")

# 17. Create IP Admission
if patient_id:
    ip_payload = {
        "patient_id": patient_id,
        "room_number": "101-A",
        "bed_number": "Bed 1",
        "doctor_name": "Dr. Sharma",
        "department": "Internal Medicine",
        "advance_amount": 5000.0
    }
    status_code, body = make_request(f"{BASE_URL}/ip-admissions/", method="POST", data=ip_payload, headers=auth_headers)
    log_test("IP Admission: Create Admission", status_code == 200, f"Room: {body.get('room_number') if isinstance(body, dict) else status_code}")

# 18. List IP Admissions
status_code, body = make_request(f"{BASE_URL}/ip-admissions/", headers=auth_headers)
log_test("IP Admission: List Admissions", status_code == 200 and isinstance(body, list), f"Total Admissions: {len(body) if isinstance(body, list) else 0}")

# 19. Create Lab Test Master & Lab Order
test_master_id = None
master_payload = {
    "test_code": f"CBC{int(time.time())%10000}",
    "test_name": "Complete Blood Count (CBC)",
    "department": "Haematology",
    "cost": 450.0,
    "sample_type": "Blood",
    "reference_range": "4.5 - 11.0 K/uL"
}
status_code, body = make_request(f"{BASE_URL}/lab-test-masters/", method="POST", data=master_payload, headers=auth_headers)
if status_code == 200 and isinstance(body, dict):
    test_master_id = body.get("id")
    log_test("Lab: Create Test Master", True, f"Test Master ID: {test_master_id}")
else:
    log_test("Lab: Create Test Master", False, f"Status: {status_code}, Body: {body}")

if patient_id and test_master_id:
    order_payload = {
        "patient_id": patient_id,
        "test_id": test_master_id,
        "doctor_name": "Dr. Kumar",
        "priority": "Routine"
    }
    status_code, body = make_request(f"{BASE_URL}/lab-orders/", method="POST", data=order_payload, headers=auth_headers)
    log_test("Lab: Create Lab Order", status_code == 200, f"Lab Order ID: {body.get('id') if isinstance(body, dict) else status_code}")

# 20. Reports: Daily Report
status_code, body = make_request(f"{BASE_URL}/reports/daily/?report_date={str(date.today())}", headers=auth_headers)
log_test("Reports: Get Daily Report", status_code == 200 and isinstance(body, dict), f"Daily Report Keys: {list(body.keys()) if isinstance(body, dict) else status_code}")

print("\n=== BACKEND TEST SUITE RESULTS ===")
print(f"Total Tests Executed : {results['passed'] + results['failed']}")
print(f"Passed               : {results['passed']}")
print(f"Failed               : {results['failed']}")

with open("test_results.json", "w") as f:
    json.dump(results, f, indent=2)
