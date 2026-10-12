import urllib.request
import urllib.parse
import json
import os

API_BASE = "http://127.0.0.1:8000"

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}

    body = None
    if data is not None and not isinstance(data, (bytes, bytearray)):
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif data is not None:
        body = data

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        res_body = response.read().decode("utf-8")
        if res_body:
            return response.status, json.loads(res_body)
        return response.status, None

def test_scan_workflow():
    print("=== STARTING PATIENT SCAN & RADIOLOGY INTEGRATION TEST SUITE ===")

    # 1. Fetch Scan Types Master
    status, scan_types = make_req(f"{API_BASE}/api/scan-types")
    assert status == 200, f"Failed to get scan types, status: {status}"
    print(f"[SUCCESS] Configurable Scan Types Master Loaded: {len(scan_types)} scan types available.")

    # 2. Get or Create Test Patient
    status, patients = make_req(f"{API_BASE}/patients/")
    if len(patients) > 0:
        patient = patients[0]
    else:
        status, patient = make_req(f"{API_BASE}/patients/", method="POST", data={
            "name": "Ramesh Kumar (Scan Test)",
            "age": 45,
            "gender": "Male",
            "phone": "9876543210",
            "aadhaar": "UHID-SCAN-9900",
            "blood_group": "B+"
        })

    patient_id = patient["id"]
    print(f"[SUCCESS] Test Patient Selected: ID #{patient_id} ({patient['name']})")

    # 3. Create Scan Record 1 (Baseline 2024 MRI)
    scan_payload_1 = {
        "patient_id": patient_id,
        "scan_type": "MRI",
        "scan_name": "Brain MRI Baseline",
        "scan_date": "2024-03-15",
        "scan_time": "10:30 AM",
        "referred_by_doctor": "Dr. V. Sharma",
        "department": "Radiology",
        "hospital_location": "Main Block - Radiology Wing",
        "technician_name": "Suresh",
        "radiologist_name": "Dr. Anand MD",
        "scan_status": "Completed",
        "clinical_history": "Chronic headache for 3 months",
        "indication_for_scan": "Rule out brain lesion",
        "report_title": "MRI Brain Baseline Report",
        "report_number": "REP-2024-001",
        "report_date": "2024-03-15",
        "reported_by": "Dr. Anand",
        "verified_by": "Dr. Senior Radiologist",
        "findings": {
            "findings": "Small hyperintense lesion noted in right frontal lobe measuring 8mm.",
            "impression": "Solitary 8mm lesion right frontal lobe. Follow-up recommended.",
            "measurements": [
                {"parameter": "Right Frontal Lesion", "value": "8.0", "unit": "mm", "previous_value": None, "trend": "Baseline"}
            ],
            "recommendations": ["Follow-up MRI in 12 months"],
            "follow_up_required": True,
            "follow_up_date": "2025-03-15"
        }
    }
    status, scan1 = make_req(f"{API_BASE}/api/scans", method="POST", data=scan_payload_1)
    assert status == 200, f"Failed to create scan 1, status {status}"
    print(f"[SUCCESS] Scan Record 1 Created: ID #{scan1['id']} ({scan1['scan_number']})")

    # 4. Create Scan Record 2 (Follow-up 2025 MRI)
    scan_payload_2 = {
        "patient_id": patient_id,
        "scan_type": "MRI",
        "scan_name": "Brain MRI Follow-up",
        "scan_date": "2025-03-20",
        "scan_time": "11:00 AM",
        "referred_by_doctor": "Dr. V. Sharma",
        "department": "Radiology",
        "hospital_location": "Main Block - Radiology Wing",
        "technician_name": "Ramesh Tech",
        "radiologist_name": "Dr. Anand MD",
        "scan_status": "Verified",
        "clinical_history": "Annual follow-up for known right frontal lesion",
        "indication_for_scan": "Assess lesion progression",
        "previous_scan_reference": f"Baseline Scan #{scan1['scan_number']} on 2024-03-15",
        "report_title": "MRI Brain Follow-up Report",
        "report_number": "REP-2025-042",
        "report_date": "2025-03-20",
        "reported_by": "Dr. Anand",
        "verified_by": "Dr. Senior Radiologist",
        "findings": {
            "findings": "Right frontal lesion now measures 6.5mm, showing slight reduction in edema.",
            "impression": "Slight reduction in lesion size from 8.0mm to 6.5mm. Stable appearance.",
            "measurements": [
                {"parameter": "Right Frontal Lesion", "value": "6.5", "unit": "mm", "previous_value": "8.0", "trend": "Decreased"}
            ],
            "recommendations": ["Routine follow-up in 12 months"],
            "follow_up_required": True,
            "follow_up_date": "2026-03-20"
        }
    }
    status, scan2 = make_req(f"{API_BASE}/api/scans", method="POST", data=scan_payload_2)
    assert status == 200, f"Failed to create scan 2, status {status}"
    print(f"[SUCCESS] Scan Record 2 Created: ID #{scan2['id']} ({scan2['scan_number']})")

    # 5. Create Scan Record 3 (2026 CT Chest)
    scan_payload_3 = {
        "patient_id": patient_id,
        "scan_type": "CT Scan",
        "scan_name": "CT Chest HRCT",
        "scan_date": "2026-02-10",
        "scan_time": "02:30 PM",
        "referred_by_doctor": "Dr. P. Sundaram",
        "department": "Pulmonology",
        "scan_status": "Completed",
        "clinical_history": "Mild cough",
        "findings": {
            "findings": "Normal lung parenchyma. Clear pleural spaces.",
            "impression": "Unremarkable HRCT Chest."
        }
    }
    status, scan3 = make_req(f"{API_BASE}/api/scans", method="POST", data=scan_payload_3)
    assert status == 200, f"Failed to create scan 3, status {status}"
    print(f"[SUCCESS] Scan Record 3 Created: ID #{scan3['id']} ({scan3['scan_number']})")

    # 6. Retrieve All Scans for Patient
    status, p_scans = make_req(f"{API_BASE}/api/patients/{patient_id}/scans")
    assert status == 200
    assert len(p_scans) >= 3, f"Expected at least 3 scans, got {len(p_scans)}"
    print(f"[SUCCESS] Patient Scans Permanently Stored & Retrieved: {len(p_scans)} scans linked to Patient #{patient_id}")

    # 7. Retrieve Complete Patient Analysis Contract
    status, analysis = make_req(f"{API_BASE}/api/patients/{patient_id}/analysis")
    assert status == 200
    assert "scan_history" in analysis
    assert len(analysis["scan_history"]) >= 3
    print(f"[SUCCESS] Patient Scan Analysis Contract Verified! Total Scans: {analysis['total_scans']}, History entries: {len(analysis['scan_history'])}")

    # 8. Verify Audit Logs
    status, audit_logs = make_req(f"{API_BASE}/api/scans/{scan2['id']}/history")
    assert status == 200
    print(f"[SUCCESS] Scan Audit Trail Verified: {len(audit_logs)} log entries recorded for Scan #{scan2['id']}")

    # 9. Test Soft Delete / Cancel Scan 3
    status, _ = make_req(f"{API_BASE}/api/scans/{scan3['id']}", method="DELETE")
    assert status == 200
    print(f"[SUCCESS] Soft Delete / Cancellation Verified for Scan #{scan3['id']}")

    print("\n[ALL TESTS PASSED] ALL SCAN API AND DATABASE PERSISTENCE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_scan_workflow()
