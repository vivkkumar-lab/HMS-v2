import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def req(url, method="GET", body=None, headers=None):
    if headers is None:
        headers = {}
    if body is not None and not isinstance(body, (str, bytes)):
        body = json.dumps(body).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        print(f"HTTP Error {e.code} on {method} {url}: {res_body}")
        return e.code, json.loads(res_body) if res_body else {}

def run_enterprise_lab_test_suite():
    print("==================================================")
    print("   ENTERPRISE LAB MODULE VERIFICATION SUITE       ")
    print("==================================================")

    # Step 1: Verify Lab Test Masters
    status, masters = req(f"{BASE_URL}/lab-test-masters/")
    assert status == 200, f"Expected 200, got {status}"
    print(f"[OK] Found {len(masters)} configured Lab Test Masters in Database.")

    # Step 2: Create a Test Patient
    patient_payload = {
        "name": "Enterprise Test Patient",
        "age": 42,
        "gender": "Male",
        "phone": "9876543210",
        "aadhaar": "999988887777",
        "blood_group": "O+",
        "details": {"registration_type": "Walk-in"}
    }
    status, patient = req(f"{BASE_URL}/patients/", method="POST", body=patient_payload)
    assert status in (200, 201), f"Failed to create test patient: {status}"
    patient_id = patient["id"]
    print(f"[OK] Test Patient Created (ID: {patient_id}, Name: {patient['name']}).")

    # Step 3: Create Lab Order 1 (Routine CBC)
    cbc_test = next((m for m in masters if "CBC" in m["test_name"] or "Blood" in m["test_name"]), masters[0])
    order1_payload = {
        "patient_id": patient_id,
        "test_id": cbc_test["id"],
        "doctor_name": "Dr. Arunkumar MD",
        "priority": "Routine",
        "clinical_indication": "Routine health checkup",
        "diagnosis": "Mild Fatigue"
    }
    status, order1 = req(f"{BASE_URL}/lab-orders/", method="POST", body=order1_payload)
    assert status in (200, 201), f"Failed to create lab order: {status}"
    assert "order_number" in order1, "Missing order_number auto-generation"
    print(f"[OK] Order 1 Created: {order1['order_number']} (Status: {order1['status']}).")

    # Step 4: Specimen Sample Collection & Barcoding
    sample1_payload = {
        "order_id": order1["id"],
        "sample_type": cbc_test.get("sample_type") or "Blood",
        "container_type": "EDTA Tube (Purple Top)",
        "barcode": f"BAR-{int(time.time())}",
        "collected_by": "Senior Phlebotomist",
        "status": "Collected"
    }
    status, sample1 = req(f"{BASE_URL}/lab-samples/", method="POST", body=sample1_payload)
    assert status in (200, 201), f"Failed sample collection: {status}"
    print(f"[OK] Specimen Sample Collected (Barcode: {sample1['barcode']}).")

    # Step 5: Sample Receipt at Lab
    status, received_sample = req(f"{BASE_URL}/lab-samples/{sample1['id']}/receive", method="POST", body={"received_by": "Lab Tech"})
    assert status == 200, f"Failed sample receipt: {status}"
    assert received_sample["status"] == "Received", "Sample status not updated to Received"
    print(f"[OK] Sample Received at Lab (Status: {received_sample['status']}).")

    # Step 6: Enter Lab Results with Rules-Based Flagging (Abnormal & Critical Values)
    results_payload = [
        {"parameter": "Hemoglobin (Hb)", "value": "9.5", "unit": "g/dL", "range": "13.0 - 17.0", "flag": "LOW"},
        {"parameter": "Total WBC Count", "value": "18.5", "unit": "K/uL", "range": "4.5 - 11.0", "flag": "HIGH"},
        {"parameter": "Platelet Count", "value": "250", "unit": "K/uL", "range": "150 - 450", "flag": "NORMAL"}
    ]
    report1_payload = {
        "patient_id": patient_id,
        "order_id": order1["id"],
        "sample_id": sample1["id"],
        "test_name": cbc_test["test_name"],
        "reported_by": "Lab Technician",
        "results_data": results_payload,
        "remarks": "Anemia & Leukocytosis flagged for Pathologist review."
    }
    status, report1 = req(f"{BASE_URL}/lab-reports/", method="POST", body=report1_payload)
    assert status in (200, 201), f"Failed result entry: {status}"
    assert report1["has_abnormal_values"] is True, "Abnormal flag calculation failed"
    print(f"[OK] Results Entered for Report #{report1['report_number']} (Abnormal Flag: {report1['has_abnormal_values']}).")

    # Step 7: Pathologist Verification & Electronic Signoff
    verify_payload = {
        "verified_by": "Dr. Pathologist MD",
        "comments": "Clinical correlation recommended for elevated WBC."
    }
    status, verified_report = req(f"{BASE_URL}/lab-reports/{report1['id']}/verify", method="POST", body=verify_payload)
    assert status == 200, f"Verification failed: {status}"
    assert verified_report["is_verified"] is True, "Report not marked as verified"
    print(f"[OK] Pathologist Verification Completed (Signed by: {verified_report['verified_by']}).")

    # Step 8: Publish Report
    status, published_report = req(f"{BASE_URL}/lab-reports/{report1['id']}/publish", method="POST", body={"published_by": "Lab Admin"})
    assert status == 200, f"Publish failed: {status}"
    assert published_report["is_published"] is True, "Report not published"
    print(f"[OK] Report Published to Patient Record (Status: {published_report['report_status']}).")

    # Step 9: Report Revision / Correction Workflow (Version Tracking)
    revision_payload = {
        "results_data": [
            {"parameter": "Hemoglobin (Hb)", "value": "9.8", "unit": "g/dL", "range": "13.0 - 17.0", "flag": "LOW"},
            {"parameter": "Total WBC Count", "value": "17.9", "unit": "K/uL", "range": "4.5 - 11.0", "flag": "HIGH"},
            {"parameter": "Platelet Count", "value": "255", "unit": "K/uL", "range": "150 - 450", "flag": "NORMAL"}
        ],
        "changed_by": "Dr. Pathologist MD",
        "change_reason": "Re-run sample verification correction."
    }
    status, revised_report = req(f"{BASE_URL}/lab-reports/{report1['id']}/revise", method="POST", body=revision_payload)
    assert status == 200, f"Revision failed: {status}"
    assert revised_report["version"] == 2, f"Expected version 2, got {revised_report['version']}"
    print(f"[OK] Report Revised & Version Increment Verified (Current Version: v{revised_report['version']}.0).")

    # Step 10: Create Second Lab Order for Same Patient (E2E Multi-Report Persistence)
    order2_payload = {
        "patient_id": patient_id,
        "test_id": masters[1]["id"] if len(masters) > 1 else masters[0]["id"],
        "doctor_name": "Dr. Vasudevan MD",
        "priority": "STAT",
        "clinical_indication": "Follow up lab test"
    }
    status, order2 = req(f"{BASE_URL}/lab-orders/", method="POST", body=order2_payload)
    assert status in (200, 201), "Order 2 creation failed"

    report2_payload = {
        "patient_id": patient_id,
        "order_id": order2["id"],
        "test_name": masters[1]["test_name"] if len(masters) > 1 else masters[0]["test_name"],
        "result_value": "110",
        "units": "mg/dL",
        "normal_range": "70 - 100",
        "reported_by": "Lab Technician",
        "remarks": "Slightly elevated fasting glucose."
    }
    status, report2 = req(f"{BASE_URL}/lab-reports/", method="POST", body=report2_payload)
    assert status in (200, 201), "Report 2 creation failed"
    print(f"[OK] Order 2 & Report 2 Created for Same Patient (Report ID: {report2['id']}).")

    # Step 11: Verify Patient Lab History & Trend API
    status, history = req(f"{BASE_URL}/api/patients/{patient_id}/lab-history")
    assert status == 200, f"Lab history failed: {status}"
    assert len(history["reports"]) >= 2, f"Expected at least 2 reports, got {len(history['reports'])}"
    print(f"[OK] Patient Lab History Retrieved ({len(history['reports'])} reports, {len(history['orders'])} orders).")

    status, trends = req(f"{BASE_URL}/api/patients/{patient_id}/lab-trends")
    assert status == 200, f"Lab trends failed: {status}"
    assert len(trends["data_points"]) >= 3, f"Expected trend data points, got {len(trends['data_points'])}"
    print(f"[OK] Patient Parameter Result Trends Retrieved ({len(trends['data_points'])} data points).")

    print("\n==================================================")
    print("   ALL ENTERPRISE LAB TESTS PASSED SUCCESSFULLY!  ")
    print("==================================================")

if __name__ == "__main__":
    run_enterprise_lab_test_suite()
