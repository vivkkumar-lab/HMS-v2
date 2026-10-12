from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g. "Admin", "Doctor", "Receptionist"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    aadhaar = Column(String, nullable=True, index=True)
    blood_group = Column(String, nullable=True)
    details = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    tokens = relationship("OPToken", back_populates="patient")
    casesheets = relationship("Casesheet", back_populates="patient")
    pharmacy_bills = relationship("PharmacyBill", back_populates="patient")
    lab_bills = relationship("LabBill", back_populates="patient")
    ip_admissions = relationship("IPAdmission", back_populates="patient")
    lab_reports = relationship("LabReport", back_populates="patient")
    lab_orders = relationship("LabOrder", back_populates="patient")
    lab_attachments = relationship("LabAttachment", back_populates="patient")
    op_bills = relationship("OPBill", back_populates="patient")
    ip_bills = relationship("IPBill", back_populates="patient")
    scan_records = relationship("ScanRecord", back_populates="patient")

class OPToken(Base):
    __tablename__ = "op_tokens"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    token_number = Column(Integer, nullable=False)
    session = Column(String, nullable=False) # "Morning" or "Evening"
    date = Column(Date, nullable=False)
    status = Column(String, default="Pending") # "Pending", "Completed", "Cancelled"
    fee = Column(Float, default=0.0)
    is_billed = Column(Boolean, default=False)
    details = Column(JSON, default={})

    patient = relationship("Patient", back_populates="tokens")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    appointment_date = Column(Date, nullable=False)
    time_slot = Column(String, nullable=True)
    reason = Column(String, nullable=True)
    status = Column(String, default="Scheduled") # Scheduled, Completed, Cancelled, Rescheduled
    details = Column(JSON, default={})

    patient = relationship("Patient")
    doctor = relationship("User")

class Casesheet(Base):
    __tablename__ = "casesheets"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    token_id = Column(Integer, ForeignKey("op_tokens.id"), nullable=True)
    date = Column(Date, default=datetime.utcnow().date)
    symptoms = Column(String, nullable=True)
    diagnosis = Column(String, nullable=True)
    vitals_bp = Column(String, nullable=True)
    vitals_pulse = Column(String, nullable=True)
    vitals_temp = Column(String, nullable=True)
    vitals_resp = Column(String, nullable=True)
    prescribed_medicines = Column(JSON, default=[]) # List of: {name, quantity, dosage, duration}
    prescribed_labs = Column(JSON, default=[]) # List of test names

    patient = relationship("Patient", back_populates="casesheets")

class MedicineStock(Base):
    __tablename__ = "medicine_stocks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False) # "Pharmacy", "Lab", "Consumable"
    batch_no = Column(String, nullable=True)
    expiry_date = Column(Date, nullable=True)
    quantity = Column(Integer, default=0)
    unit_price = Column(Float, default=0.0)
    min_stock_level = Column(Integer, default=10)
    details = Column(JSON, default={})

class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicine_stocks.id"))
    type = Column(String, nullable=False) # "Stock In", "Stock Out", "Sale"
    quantity = Column(Integer, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)
    details = Column(JSON, default={})

class PharmacyBill(Base):
    __tablename__ = "pharmacy_bills"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    patient_name = Column(String, nullable=True) # For walk-in patients
    bill_date = Column(DateTime, default=datetime.utcnow)
    subtotal = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    payment_mode = Column(String, default="Cash")  # Cash, UPI, Card, Bank Transfer, Split
    payment_details = Column(JSON, nullable=True)  # For split payment amounts
    details = Column(JSON, default={})

    patient = relationship("Patient", back_populates="pharmacy_bills")
    items = relationship("PharmacyBillItem", back_populates="bill")

class PharmacyBillItem(Base):
    __tablename__ = "pharmacy_bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("pharmacy_bills.id"))
    medicine_id = Column(Integer, ForeignKey("medicine_stocks.id"))
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    bill = relationship("PharmacyBill", back_populates="items")

class LabBill(Base):
    __tablename__ = "lab_bills"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    bill_date = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    status = Column(String, default="Pending") # "Pending", "Completed"
    payment_mode = Column(String, default="Cash")
    payment_details = Column(JSON, nullable=True)

    patient = relationship("Patient", back_populates="lab_bills")
    items = relationship("LabBillItem", back_populates="bill")

class LabBillItem(Base):
    __tablename__ = "lab_bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("lab_bills.id"))
    test_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)

    bill = relationship("LabBill", back_populates="items")

class IPAdmission(Base):
    __tablename__ = "ip_admissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    admission_date = Column(DateTime, default=datetime.utcnow)
    ward_number = Column(String, nullable=True)
    room_number = Column(String, nullable=True)
    doctor_in_charge = Column(String, nullable=True)
    discharge_date = Column(DateTime, nullable=True)
    status = Column(String, default="Admitted") # "Admitted", "Discharged"
    reason_for_admission = Column(String, nullable=True)

    patient = relationship("Patient", back_populates="ip_admissions")
    ip_bills = relationship("IPBill", back_populates="admission")

class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=True)
    sample_id = Column(Integer, ForeignKey("lab_samples.id"), nullable=True)
    report_number = Column(String, index=True, nullable=True)
    test_name = Column(String, nullable=False)
    result_value = Column(String, nullable=True) # made nullable for multi-param
    normal_range = Column(String, nullable=True)
    units = Column(String, nullable=True)
    date_conducted = Column(DateTime, default=datetime.utcnow)
    reported_by = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    results_data = Column(JSON, nullable=True) # for multi-parameter results

    # Enterprise workflow & audit
    report_status = Column(String, default="Draft") # Draft, Verified, Published, Revised, Cancelled
    verified_by = Column(String, nullable=True)
    verification_date = Column(DateTime, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    published_by = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)
    has_critical_values = Column(Boolean, default=False)
    has_abnormal_values = Column(Boolean, default=False)
    pathologist_comments = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="lab_reports")
    versions = relationship("LabReportVersion", back_populates="report")
    attachments = relationship("LabAttachment", back_populates="report")

# ============================
# NEW: LAB MANAGEMENT MODELS
# ============================
class LabTestMaster(Base):
    __tablename__ = "lab_test_master"

    id = Column(Integer, primary_key=True, index=True)
    test_code = Column(String, unique=True, index=True)
    test_name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    department = Column(String, nullable=True)
    sample_type = Column(String, nullable=True)
    container_type = Column(String, nullable=True)
    method = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    reference_range = Column(String, nullable=True)
    normal_range_male = Column(String, nullable=True)
    normal_range_female = Column(String, nullable=True)
    normal_range_child = Column(String, nullable=True)
    normal_low = Column(Float, nullable=True)
    normal_high = Column(Float, nullable=True)
    critical_range = Column(String, nullable=True)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    result_type = Column(String, default="Numeric") # Numeric, Decimal, Text, Pos/Neg, Dropdown, Multi-Parameter
    options = Column(JSON, nullable=True)
    parameters = Column(JSON, default=[]) # Dynamic sub-parameters array
    price = Column(Float, default=0.0)
    tat_hours = Column(Integer, default=24)
    is_active = Column(Boolean, default=True)

    test_parameters = relationship("LabTestParameter", back_populates="test")

class LabTestParameter(Base):
    __tablename__ = "lab_test_parameters"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("lab_test_master.id"))
    param_code = Column(String, nullable=False)
    param_name = Column(String, nullable=False)
    unit = Column(String, nullable=True)
    result_type = Column(String, default="Numeric")
    reference_range = Column(String, nullable=True)
    normal_low = Column(Float, nullable=True)
    normal_high = Column(Float, nullable=True)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    options = Column(JSON, nullable=True)
    sort_order = Column(Integer, default=0)

    test = relationship("LabTestMaster", back_populates="test_parameters")

class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, index=True, nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    encounter_id = Column(Integer, nullable=True)
    doctor_name = Column(String, nullable=True)
    test_id = Column(Integer, ForeignKey("lab_test_master.id"))
    order_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Pending") # Pending, Sample Collected, Sample Received, Processing, Completed, Verified, Published
    priority = Column(String, default="Routine") # Routine, Urgent, STAT
    clinical_indication = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="lab_orders")
    test = relationship("LabTestMaster")
    samples = relationship("LabSample", back_populates="order")
    attachments = relationship("LabAttachment", back_populates="order")

class LabSample(Base):
    __tablename__ = "lab_samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_number = Column(String, nullable=True)
    order_id = Column(Integer, ForeignKey("lab_orders.id"))
    sample_type = Column(String, nullable=False)
    collection_date = Column(DateTime, nullable=True)
    collected_by = Column(String, nullable=True)
    container_type = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    received_date = Column(DateTime, nullable=True)
    received_by = Column(String, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    condition_notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    status = Column(String, default="Pending") # Pending, Collected, Received, Processing, Rejected, Recollected

    order = relationship("LabOrder", back_populates="samples")

class LabReportVersion(Base):
    __tablename__ = "lab_report_versions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("lab_reports.id"))
    version_number = Column(Integer, nullable=False)
    previous_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    changed_by = Column(String, nullable=True)
    change_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("LabReport", back_populates="versions")

class LabAttachment(Base):
    __tablename__ = "lab_attachments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=True)
    report_id = Column(Integer, ForeignKey("lab_reports.id"), nullable=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="lab_attachments")
    order = relationship("LabOrder", back_populates="attachments")
    report = relationship("LabReport", back_populates="attachments")

# ============================
# NEW: OP Bill (Consolidated)
# ============================
class OPBill(Base):
    __tablename__ = "op_bills"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    token_id = Column(Integer, ForeignKey("op_tokens.id"), nullable=True)
    bill_date = Column(DateTime, default=datetime.utcnow)
    doctor_name = Column(String, nullable=True)
    department = Column(String, nullable=True)

    # Charges
    consultation_fee = Column(Float, default=0.0)
    lab_charges = Column(Float, default=0.0)
    pharmacy_charges = Column(Float, default=0.0)
    other_charges = Column(JSON, default=[])  # [{name, amount}]

    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    # Payment
    payment_mode = Column(String, default="Cash")  # Cash, UPI, Card, Bank Transfer, Split
    payment_details = Column(JSON, nullable=True)  # For split: {cash: x, upi: y, card: z}

    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="op_bills")

# ============================
# NEW: IP Bill (Inpatient)
# ============================
class IPBill(Base):
    __tablename__ = "ip_bills"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    admission_id = Column(Integer, ForeignKey("ip_admissions.id"), nullable=True)
    bill_date = Column(DateTime, default=datetime.utcnow)
    doctor_name = Column(String, nullable=True)

    # Charges
    room_charge_per_day = Column(Float, default=0.0)
    days_stayed = Column(Integer, default=1)
    room_charges = Column(Float, default=0.0)
    doctor_charges = Column(Float, default=0.0)
    nursing_charges = Column(Float, default=0.0)
    pharmacy_charges = Column(Float, default=0.0)
    lab_charges = Column(Float, default=0.0)
    other_charges = Column(JSON, default=[])  # [{name, amount}]

    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    gst = Column(Float, default=0.0)
    total = Column(Float, default=0.0)

    # Payment
    payment_mode = Column(String, default="Cash")
    payment_details = Column(JSON, nullable=True)

    notes = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="ip_bills")
    admission = relationship("IPAdmission", back_populates="ip_bills")

# ============================
# Hospital Settings
# ============================
class HospitalSettings(Base):
    __tablename__ = "hospital_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================
# Audit Log
# ============================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False)  # e.g. "CREATE_PATIENT", "LOGIN", "EDIT_SETTINGS"
    details = Column(Text, nullable=True)    # JSON string or description
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)

# ============================
# SCAN / RADIOLOGY MODULE MODELS
# ============================
class ScanTypeMaster(Base):
    __tablename__ = "scan_type_master"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False) # XRAY, CT, MRI, USG, ECG, ECHO, MAMMO, PET, DOPPLER, ENDOSCOPY, OTHER
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, index=True)
    scan_number = Column(String, unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    scan_type_id = Column(Integer, ForeignKey("scan_type_master.id"), nullable=True)
    scan_type = Column(String, nullable=False) # e.g. "MRI", "CT Scan"
    scan_name = Column(String, nullable=False) # e.g. "Brain MRI with Contrast"
    scan_date = Column(Date, nullable=False)
    scan_time = Column(String, nullable=True)
    referred_by_doctor = Column(String, nullable=True)
    department = Column(String, nullable=True)
    hospital_location = Column(String, nullable=True)
    technician_name = Column(String, nullable=True)
    radiologist_name = Column(String, nullable=True)
    scan_status = Column(String, default="Draft") # Draft, Completed, Verified, Cancelled

    # Clinical Information
    clinical_history = Column(Text, nullable=True)
    chief_complaint = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    provisional_diagnosis = Column(Text, nullable=True)
    indication_for_scan = Column(Text, nullable=True)
    relevant_medical_history = Column(Text, nullable=True)
    previous_scan_reference = Column(String, nullable=True)

    # Report Metadata
    report_title = Column(String, nullable=True)
    report_number = Column(String, nullable=True, index=True)
    report_date = Column(DateTime, nullable=True)
    reported_by = Column(String, nullable=True)
    verified_by = Column(String, nullable=True)
    report_status = Column(String, default="Draft")
    doctor_comments = Column(Text, nullable=True)

    # Audit & Status
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    version = Column(Integer, default=1)
    record_status = Column(String, default="Active")

    patient = relationship("Patient", back_populates="scan_records")
    findings = relationship("ScanFindings", back_populates="scan_record", uselist=False, cascade="all, delete-orphan")
    attachments = relationship("ScanAttachment", back_populates="scan_record", cascade="all, delete-orphan")
    audit_logs = relationship("ScanAuditLog", back_populates="scan_record", cascade="all, delete-orphan")

class ScanFindings(Base):
    __tablename__ = "scan_findings"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False, index=True)
    findings = Column(Text, nullable=True)
    observations = Column(Text, nullable=True)
    measurements = Column(JSON, default=[]) # [{parameter, value, unit, previous_value, trend}]
    abnormalities = Column(JSON, default=[]) # [string]
    organ_specific_findings = Column(JSON, default={}) # {organ_name: text}
    impression = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    recommendations = Column(JSON, default=[]) # [string]
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)

    scan_record = relationship("ScanRecord", back_populates="findings")

class ScanAttachment(Base):
    __tablename__ = "scan_attachments"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_category = Column(String, default="report") # original_scan, report_pdf, image, other
    file_path = Column(String, nullable=False)
    storage_url = Column(String, nullable=False)
    uploaded_by = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    scan_record = relationship("ScanRecord", back_populates="attachments")

class ScanAuditLog(Base):
    __tablename__ = "scan_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_records.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String, nullable=False) # CREATED, UPDATED, STATUS_CHANGE, ATTACHMENT_ADDED, VERIFIED
    changed_by = Column(String, nullable=False)
    changes = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.utcnow)

    scan_record = relationship("ScanRecord", back_populates="audit_logs")
