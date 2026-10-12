from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from . import models, schemas
from fastapi import HTTPException

# ----------------- USER CRUD -----------------
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_all_users(db: Session):
    return db.query(models.User).all()

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_role(db: Session, user_id: int, role: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.role = role
        db.commit()
        db.refresh(user)
    return user

def delete_user(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        db.query(models.Appointment).filter(models.Appointment.doctor_id == user_id).update({models.Appointment.doctor_id: None}, synchronize_session=False)
        db.delete(user)
        db.commit()
    return user

def update_user_password(db: Session, user_id: int, hashed_password: str):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.hashed_password = hashed_password
        db.commit()
        db.refresh(user)
    return user

# ----------------- PATIENT CRUD -----------------
def get_patient(db: Session, patient_id: int):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Patient).offset(skip).limit(limit).all()

def create_patient(db: Session, patient: schemas.PatientCreate):
    db_patient = models.Patient(
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        phone=patient.phone,
        address=patient.address,
        aadhaar=patient.aadhaar,
        blood_group=patient.blood_group,
        details=patient.details
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

# ----------------- OP TOKEN CRUD -----------------
def create_op_token(db: Session, token: schemas.OPTokenCreate):
    last_token = db.query(models.OPToken).filter(
        models.OPToken.date == token.date,
        models.OPToken.session == token.session
    ).order_by(models.OPToken.token_number.desc()).first()

    next_number = 1 if not last_token else last_token.token_number + 1

    db_token = models.OPToken(
        patient_id=token.patient_id,
        token_number=next_number,
        session=token.session,
        date=token.date,
        fee=token.fee,
        status="Pending",
        details=token.details
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def get_op_tokens(db: Session, target_date: date):
    return db.query(models.OPToken).filter(models.OPToken.date == target_date).all()

def update_op_token_status(db: Session, token_id: int, status: str):
    db_token = db.query(models.OPToken).filter(models.OPToken.id == token_id).first()
    if db_token:
        db_token.status = status
        db.commit()
        db.refresh(db_token)
    return db_token

# ----------------- APPOINTMENTS CRUD -----------------
def create_appointment(db: Session, appointment: schemas.AppointmentCreate):
    db_appointment = models.Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        time_slot=appointment.time_slot,
        reason=appointment.reason,
        status=appointment.status,
        details=appointment.details
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment

def get_appointments(db: Session, target_date: Optional[date] = None):
    if target_date:
        return db.query(models.Appointment).filter(models.Appointment.appointment_date == target_date).all()
    return db.query(models.Appointment).order_by(models.Appointment.appointment_date.desc()).all()

def update_appointment_status(db: Session, appointment_id: int, status: str):
    db_appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if db_appointment:
        db_appointment.status = status
        db.commit()
        db.refresh(db_appointment)
    return db_appointment

# ----------------- CASESHEET CRUD -----------------
def create_casesheet(db: Session, casesheet: schemas.CasesheetCreate):
    db_casesheet = models.Casesheet(
        patient_id=casesheet.patient_id,
        token_id=casesheet.token_id,
        symptoms=casesheet.symptoms,
        diagnosis=casesheet.diagnosis,
        vitals_bp=casesheet.vitals_bp,
        vitals_pulse=casesheet.vitals_pulse,
        vitals_temp=casesheet.vitals_temp,
        vitals_resp=casesheet.vitals_resp,
        prescribed_medicines=[m.dict() for m in casesheet.prescribed_medicines],
        prescribed_labs=casesheet.prescribed_labs
    )
    db.add(db_casesheet)

    if casesheet.token_id:
        db_token = db.query(models.OPToken).filter(models.OPToken.id == casesheet.token_id).first()
        if db_token:
            db_token.status = "Completed"
            db_token.is_billed = True

    db.flush()

    # Automatically create Lab Orders
    if casesheet.prescribed_labs:
        for lab_name in casesheet.prescribed_labs:
            test_master = db.query(models.LabTestMaster).filter(models.LabTestMaster.test_name == lab_name).first()
            if test_master:
                db_lab_order = models.LabOrder(
                    patient_id=casesheet.patient_id,
                    doctor_name="Doctor", # Should be from session ideally
                    test_id=test_master.id,
                    status="Pending"
                )
                db.add(db_lab_order)

    db.commit()
    db.refresh(db_casesheet)
    return db_casesheet

def get_casesheets(db: Session, patient_id: int):
    return db.query(models.Casesheet).filter(models.Casesheet.patient_id == patient_id).order_by(models.Casesheet.date.desc()).all()

# ----------------- STOCK / INVENTORY CRUD -----------------
def create_medicine_stock(db: Session, item: schemas.MedicineStockCreate):
    db_item = models.MedicineStock(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_medicine_stocks(db: Session):
    return db.query(models.MedicineStock).all()

def update_medicine_quantity(db: Session, transaction: schemas.StockTransactionCreate):
    db_item = db.query(models.MedicineStock).filter(models.MedicineStock.id == transaction.medicine_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if transaction.type == "Stock In":
        db_item.quantity += transaction.quantity
    elif transaction.type == "Stock Out":
        if db_item.quantity < transaction.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {db_item.name}. Remaining: {db_item.quantity}")
        db_item.quantity -= transaction.quantity

    db_tx = models.StockTransaction(
        medicine_id=transaction.medicine_id,
        type=transaction.type,
        quantity=transaction.quantity,
        notes=transaction.notes,
        details=transaction.details
    )
    db.add(db_tx)
    db.commit()
    db.refresh(db_item)
    return db_item

# ----------------- PHARMACY BILLING CRUD -----------------
def create_pharmacy_bill(db: Session, bill: schemas.PharmacyBillCreate):
    subtotal = 0.0
    bill_items = []

    for item in bill.items:
        db_item = db.query(models.MedicineStock).filter(models.MedicineStock.id == item.medicine_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"Medicine ID {item.medicine_id} not found")
        if db_item.quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {db_item.name}. Remaining: {db_item.quantity}, Requested: {item.quantity}")

        db_item.quantity -= item.quantity
        item_total = item.quantity * db_item.unit_price
        subtotal += item_total

        db_tx = models.StockTransaction(
            medicine_id=db_item.id,
            type="Sale",
            quantity=item.quantity,
            notes=f"Sold in Bill"
        )
        db.add(db_tx)

        bill_items.append(models.PharmacyBillItem(
            medicine_id=db_item.id,
            medicine_name=db_item.name,
            quantity=item.quantity,
            unit_price=db_item.unit_price,
            total_price=item_total
        ))

    discount_amount = (bill.discount / 100.0) * subtotal
    gst_amount = (bill.gst / 100.0) * (subtotal - discount_amount)
    total = subtotal - discount_amount + gst_amount

    db_bill = models.PharmacyBill(
        patient_id=bill.patient_id,
        patient_name=bill.patient_name,
        subtotal=subtotal,
        discount=bill.discount,
        gst=bill.gst,
        total=total,
        payment_mode=bill.payment_mode,
        payment_details=bill.payment_details,
        details=bill.details,
        items=bill_items
    )

    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def get_pharmacy_bills(db: Session):
    return db.query(models.PharmacyBill).order_by(models.PharmacyBill.bill_date.desc()).all()

# ----------------- LAB BILLING CRUD -----------------
def create_lab_bill(db: Session, bill: schemas.LabBillCreate):
    subtotal = sum(item.price for item in bill.items)
    discount_amount = (bill.discount / 100.0) * subtotal
    gst_amount = (bill.gst / 100.0) * (subtotal - discount_amount)
    total = subtotal - discount_amount + gst_amount

    bill_items = [models.LabBillItem(test_name=item.test_name, price=item.price) for item in bill.items]

    db_bill = models.LabBill(
        patient_id=bill.patient_id,
        total=total,
        discount=bill.discount,
        gst=bill.gst,
        status="Pending",
        payment_mode=bill.payment_mode,
        payment_details=bill.payment_details,
        items=bill_items
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def get_lab_bills(db: Session):
    return db.query(models.LabBill).order_by(models.LabBill.bill_date.desc()).all()

def update_lab_bill_status(db: Session, bill_id: int, status: str):
    db_bill = db.query(models.LabBill).filter(models.LabBill.id == bill_id).first()
    if db_bill:
        db_bill.status = status
        db.commit()
        db.refresh(db_bill)
    return db_bill

# ----------------- IP ADMISSION CRUD -----------------
def create_ip_admission(db: Session, admission: schemas.IPAdmissionCreate):
    db_admission = models.IPAdmission(
        patient_id=admission.patient_id,
        ward_number=admission.ward_number,
        room_number=admission.room_number,
        doctor_in_charge=admission.doctor_in_charge,
        reason_for_admission=admission.reason_for_admission
    )
    db.add(db_admission)
    db.commit()
    db.refresh(db_admission)
    return db_admission

def get_ip_admissions(db: Session, patient_id: int = None):
    query = db.query(models.IPAdmission)
    if patient_id:
        query = query.filter(models.IPAdmission.patient_id == patient_id)
    return query.order_by(models.IPAdmission.admission_date.desc()).all()

def update_ip_admission_status(db: Session, admission_id: int, status: str, discharge_date: datetime = None):
    db_admission = db.query(models.IPAdmission).filter(models.IPAdmission.id == admission_id).first()
    if db_admission:
        db_admission.status = status
        if discharge_date:
            db_admission.discharge_date = discharge_date
        db.commit()
        db.refresh(db_admission)
    return db_admission

# ----------------- LAB REPORT CRUD -----------------
import random

def evaluate_lab_result_flags(results_data: Any, result_value: Optional[str], normal_low: Optional[float] = None, normal_high: Optional[float] = None, critical_low: Optional[float] = None, critical_high: Optional[float] = None):
    has_abnormal = False
    has_critical = False

    # Single numeric check
    if result_value is not None:
        try:
            val = float(str(result_value).replace(',', '').strip())
            if critical_low is not None and val < critical_low:
                has_critical = True
                has_abnormal = True
            elif critical_high is not None and val > critical_high:
                has_critical = True
                has_abnormal = True
            elif normal_low is not None and val < normal_low:
                has_abnormal = True
            elif normal_high is not None and val > normal_high:
                has_abnormal = True
        except (ValueError, TypeError):
            pass

    # Multi-parameter check
    if isinstance(results_data, list):
        for item in results_data:
            if not isinstance(item, dict):
                continue
            item_flag = str(item.get('flag', '')).upper()
            if item_flag in ("HIGH", "LOW", "ABNORMAL", "CRITICAL_HIGH", "CRITICAL_LOW"):
                has_abnormal = True
                if "CRITICAL" in item_flag:
                    has_critical = True

            val_str = item.get('value') or item.get('result')
            n_low = item.get('normal_low')
            n_high = item.get('normal_high')
            c_low = item.get('critical_low')
            c_high = item.get('critical_high')

            # Parse range string if normal_low/high not set
            range_str = item.get('range') or item.get('normal_range')
            if range_str and n_low is None and n_high is None:
                try:
                    parts = range_str.split('-')
                    if len(parts) == 2:
                        n_low = float(parts[0].strip())
                        n_high = float(parts[1].strip())
                except (ValueError, TypeError):
                    pass

            if val_str is not None:
                try:
                    val = float(str(val_str).replace(',', '').strip())
                    flag = item.get('flag') or "NORMAL"
                    if c_low is not None and float(c_low) > val:
                        flag = "CRITICAL_LOW"
                        has_critical = True
                        has_abnormal = True
                    elif c_high is not None and float(c_high) < val:
                        flag = "CRITICAL_HIGH"
                        has_critical = True
                        has_abnormal = True
                    elif n_low is not None and float(n_low) > val:
                        flag = "LOW"
                        has_abnormal = True
                    elif n_high is not None and float(n_high) < val:
                        flag = "HIGH"
                        has_abnormal = True
                    item['flag'] = flag
                except (ValueError, TypeError):
                    pass

    return has_abnormal, has_critical

def create_lab_report(db: Session, report: schemas.LabReportCreate):
    rep_dict = report.dict(exclude_unset=True)
    if not rep_dict.get("report_number"):
        rep_dict["report_number"] = f"REP-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    # Evaluate flags
    has_ab, has_crit = evaluate_lab_result_flags(
        rep_dict.get("results_data"),
        rep_dict.get("result_value")
    )
    rep_dict["has_abnormal_values"] = has_ab
    rep_dict["has_critical_values"] = has_crit

    db_report = models.LabReport(**rep_dict)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Update order status if order_id linked
    if db_report.order_id:
        update_lab_order_status(db, db_report.order_id, "Result Entered")

    # Create audit log
    db_audit = models.AuditLog(
        action="CREATE_LAB_REPORT",
        details=f"Created lab report {db_report.report_number} for Patient ID {db_report.patient_id}",
        username=db_report.reported_by or "System"
    )
    db.add(db_audit)
    db.commit()

    return db_report

def verify_lab_report(db: Session, report_id: int, verified_by: str, comments: Optional[str] = None):
    db_report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not db_report:
        return None
    db_report.is_verified = True
    db_report.verified_by = verified_by
    db_report.verification_date = datetime.utcnow()
    db_report.report_status = "Verified"
    if comments:
        db_report.pathologist_comments = comments

    if db_report.order_id:
        update_lab_order_status(db, db_report.order_id, "Verified")

    db_audit = models.AuditLog(
        action="VERIFY_LAB_REPORT",
        details=f"Verified lab report {db_report.report_number} (ID: {db_report.id}) by {verified_by}",
        username=verified_by
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_report)
    return db_report

def publish_lab_report(db: Session, report_id: int, published_by: str):
    db_report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not db_report:
        return None
    db_report.is_published = True
    db_report.published_by = published_by
    db_report.published_at = datetime.utcnow()
    db_report.report_status = "Published"

    if db_report.order_id:
        update_lab_order_status(db, db_report.order_id, "Published")

    db_audit = models.AuditLog(
        action="PUBLISH_LAB_REPORT",
        details=f"Published lab report {db_report.report_number} (ID: {db_report.id}) by {published_by}",
        username=published_by
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_report)
    return db_report

def revise_lab_report(db: Session, report_id: int, new_results_data: Any, new_result_value: Optional[str], changed_by: str, change_reason: str, remarks: Optional[str] = None):
    db_report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if not db_report:
        return None

    # Store current version snapshot
    prev_snapshot = {
        "results_data": db_report.results_data,
        "result_value": db_report.result_value,
        "remarks": db_report.remarks,
        "report_status": db_report.report_status,
        "version": db_report.version
    }

    db_version = models.LabReportVersion(
        report_id=db_report.id,
        version_number=db_report.version,
        previous_data=prev_snapshot,
        new_data={"results_data": new_results_data, "result_value": new_result_value, "remarks": remarks},
        changed_by=changed_by,
        change_reason=change_reason,
        created_at=datetime.utcnow()
    )
    db.add(db_version)

    # Update report
    db_report.version += 1
    db_report.results_data = new_results_data
    if new_result_value:
        db_report.result_value = new_result_value
    if remarks:
        db_report.remarks = remarks
    db_report.report_status = "Revised"

    # Re-evaluate flags
    has_ab, has_crit = evaluate_lab_result_flags(new_results_data, new_result_value)
    db_report.has_abnormal_values = has_ab
    db_report.has_critical_values = has_crit

    db_audit = models.AuditLog(
        action="REVISE_LAB_REPORT",
        details=f"Revised lab report {db_report.report_number} to Version {db_report.version}. Reason: {change_reason}",
        username=changed_by
    )
    db.add(db_audit)

    db.commit()
    db.refresh(db_report)
    return db_report

def get_lab_reports(db: Session, patient_id: int = None):
    query = db.query(models.LabReport)
    if patient_id:
        query = query.filter(models.LabReport.patient_id == patient_id)
    return query.order_by(models.LabReport.date_conducted.desc()).all()

# ----------------- NEW LAB MANAGEMENT CRUD -----------------
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

def create_lab_test_master(db: Session, test: schemas.LabTestMasterCreate):
    db_test = models.LabTestMaster(**test.dict())
    db.add(db_test)
    try:
        db.commit()
        db.refresh(db_test)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Test code already exists.")
    return db_test

def get_lab_test_masters(db: Session):
    return db.query(models.LabTestMaster).filter(models.LabTestMaster.is_active == True).all()

def update_lab_test_master(db: Session, test_id: int, test: schemas.LabTestMasterUpdate):
    db_test = db.query(models.LabTestMaster).filter(models.LabTestMaster.id == test_id).first()
    if not db_test:
        return None
    for var, value in vars(test).items():
        if value is not None:
            setattr(db_test, var, value)
    db.commit()
    db.refresh(db_test)
    return db_test

def delete_lab_test_master(db: Session, test_id: int):
    db_test = db.query(models.LabTestMaster).filter(models.LabTestMaster.id == test_id).first()
    if not db_test:
        return None
    db_test.is_active = False
    db.commit()
    return db_test

def create_lab_order(db: Session, order: schemas.LabOrderCreate):
    ord_dict = order.dict()
    if not ord_dict.get("order_number"):
        ord_dict["order_number"] = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    db_order = models.LabOrder(**ord_dict)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def get_lab_orders(db: Session, target_date: datetime = None):
    query = db.query(models.LabOrder)
    if target_date:
        query = query.filter(func.date(models.LabOrder.order_date) == target_date.date())
    return query.order_by(models.LabOrder.order_date.desc()).all()

def update_lab_order_status(db: Session, order_id: int, status: str):
    db_order = db.query(models.LabOrder).filter(models.LabOrder.id == order_id).first()
    if db_order:
        db_order.status = status
        db.commit()
        db.refresh(db_order)
    return db_order
    return db_order

def delete_patient(db: Session, patient_id: int):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if db_patient:
        db.query(models.OPToken).filter(models.OPToken.patient_id == patient_id).delete(synchronize_session=False)
        db.query(models.Casesheet).filter(models.Casesheet.patient_id == patient_id).delete(synchronize_session=False)
        db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).delete(synchronize_session=False)
        db.query(models.LabOrder).filter(models.LabOrder.patient_id == patient_id).delete(synchronize_session=False)
        db.query(models.LabReport).filter(models.LabReport.patient_id == patient_id).delete(synchronize_session=False)
        db.query(models.PharmacyBill).filter(models.PharmacyBill.patient_id == patient_id).update({models.PharmacyBill.patient_id: None}, synchronize_session=False)
        db.query(models.LabBill).filter(models.LabBill.patient_id == patient_id).update({models.LabBill.patient_id: None}, synchronize_session=False)
        db.query(models.OPBill).filter(models.OPBill.patient_id == patient_id).update({models.OPBill.patient_id: None}, synchronize_session=False)
        db.query(models.IPBill).filter(models.IPBill.patient_id == patient_id).update({models.IPBill.patient_id: None}, synchronize_session=False)
        db.query(models.IPAdmission).filter(models.IPAdmission.patient_id == patient_id).delete(synchronize_session=False)
        db.delete(db_patient)
        db.commit()
    return db_patient

def delete_op_token(db: Session, token_id: int):
    db_token = db.query(models.OPToken).filter(models.OPToken.id == token_id).first()
    if db_token:
        db.query(models.Casesheet).filter(models.Casesheet.token_id == token_id).update({models.Casesheet.token_id: None}, synchronize_session=False)
        db.query(models.OPBill).filter(models.OPBill.token_id == token_id).update({models.OPBill.token_id: None}, synchronize_session=False)
        db.delete(db_token)
        db.commit()
    return db_token

def delete_appointment(db: Session, appointment_id: int):
    db_app = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if db_app:
        db.delete(db_app)
        db.commit()
    return db_app

def delete_casesheet(db: Session, casesheet_id: int):
    db_casesheet = db.query(models.Casesheet).filter(models.Casesheet.id == casesheet_id).first()
    if db_casesheet:
        db.delete(db_casesheet)
        db.commit()
    return db_casesheet

def delete_medicine_stock(db: Session, stock_id: int):
    db_stock = db.query(models.MedicineStock).filter(models.MedicineStock.id == stock_id).first()
    if db_stock:
        db.delete(db_stock)
        db.commit()
    return db_stock

def delete_ip_admission(db: Session, admission_id: int):
    db_admission = db.query(models.IPAdmission).filter(models.IPAdmission.id == admission_id).first()
    if db_admission:
        db.query(models.IPBill).filter(models.IPBill.admission_id == admission_id).update({models.IPBill.admission_id: None}, synchronize_session=False)
        db.delete(db_admission)
        db.commit()
    return db_admission

def delete_lab_report(db: Session, report_id: int):
    db_report = db.query(models.LabReport).filter(models.LabReport.id == report_id).first()
    if db_report:
        db.delete(db_report)
        db.commit()
    return db_report

def delete_lab_order(db: Session, order_id: int):
    db_order = db.query(models.LabOrder).filter(models.LabOrder.id == order_id).first()
    if db_order:
        db.query(models.LabSample).filter(models.LabSample.order_id == order_id).delete(synchronize_session=False)
        db.delete(db_order)
        db.commit()
    return db_order

def delete_lab_sample(db: Session, sample_id: int):
    db_sample = db.query(models.LabSample).filter(models.LabSample.id == sample_id).first()
    if db_sample:
        db.delete(db_sample)
        db.commit()
    return db_sample

# ============================
# SCAN / RADIOLOGY MODULE CRUD
# ============================
DEFAULT_SCAN_TYPES = [
    {"code": "XRAY", "name": "X-Ray", "description": "Radiograph Imaging"},
    {"code": "CT", "name": "CT Scan", "description": "Computed Tomography"},
    {"code": "MRI", "name": "MRI", "description": "Magnetic Resonance Imaging"},
    {"code": "USG", "name": "Ultrasound", "description": "Ultrasonography / USG"},
    {"code": "ECG", "name": "ECG", "description": "Electrocardiogram"},
    {"code": "ECHO", "name": "Echo", "description": "Echocardiogram"},
    {"code": "MAMMO", "name": "Mammography", "description": "Breast Imaging"},
    {"code": "PET", "name": "PET Scan", "description": "Positron Emission Tomography"},
    {"code": "DOPPLER", "name": "Doppler", "description": "Doppler Vascular Scan"},
    {"code": "ENDOSCOPY", "name": "Endoscopy", "description": "Gastro / Endoscopic Procedure"},
    {"code": "OTHER", "name": "Other", "description": "General Medical Scan / Investigation"}
]

def init_default_scan_types(db: Session):
    existing_count = db.query(models.ScanTypeMaster).count()
    if existing_count == 0:
        for item in DEFAULT_SCAN_TYPES:
            st = models.ScanTypeMaster(
                code=item["code"],
                name=item["name"],
                description=item["description"],
                is_active=True
            )
            db.add(st)
        db.commit()

def get_scan_types(db: Session):
    init_default_scan_types(db)
    return db.query(models.ScanTypeMaster).filter(models.ScanTypeMaster.is_active == True).order_by(models.ScanTypeMaster.id.asc()).all()

def create_scan_type(db: Session, scan_type: schemas.ScanTypeMasterCreate):
    code_upper = scan_type.code.upper().strip()
    existing = db.query(models.ScanTypeMaster).filter(models.ScanTypeMaster.code == code_upper).first()
    if existing:
        return existing
    st = models.ScanTypeMaster(
        code=code_upper,
        name=scan_type.name,
        description=scan_type.description,
        is_active=scan_type.is_active
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return st

def generate_scan_number(db: Session) -> str:
    today_str = datetime.utcnow().strftime("%Y%m%d")
    count_today = db.query(models.ScanRecord).filter(models.ScanRecord.scan_number.like(f"SCN-{today_str}-%")).count()
    return f"SCN-{today_str}-{(count_today + 1):04d}"

def log_scan_action(db: Session, scan_id: int, action: str, changed_by: str, changes: dict = None):
    log = models.ScanAuditLog(
        scan_id=scan_id,
        action=action,
        changed_by=changed_by,
        changes=changes or {},
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()

def create_scan_record(db: Session, scan_in: schemas.ScanRecordCreate, created_by: str = "system"):
    # Verify patient exists
    patient = db.query(models.Patient).filter(models.Patient.id == scan_in.patient_id).first()
    if not patient:
        raise ValueError("Patient not found")

    scan_num = generate_scan_number(db)
    report_num = scan_in.report_number or f"RPT-{scan_num.replace('SCN-', '')}"

    scan_obj = models.ScanRecord(
        scan_number=scan_num,
        patient_id=scan_in.patient_id,
        scan_type=scan_in.scan_type,
        scan_name=scan_in.scan_name,
        scan_date=scan_in.scan_date,
        scan_time=scan_in.scan_time or datetime.utcnow().strftime("%I:%M %p"),
        referred_by_doctor=scan_in.referred_by_doctor,
        department=scan_in.department,
        hospital_location=scan_in.hospital_location,
        technician_name=scan_in.technician_name,
        radiologist_name=scan_in.radiologist_name,
        scan_status=scan_in.scan_status,

        clinical_history=scan_in.clinical_history,
        chief_complaint=scan_in.chief_complaint,
        symptoms=scan_in.symptoms,
        provisional_diagnosis=scan_in.provisional_diagnosis,
        indication_for_scan=scan_in.indication_for_scan,
        relevant_medical_history=scan_in.relevant_medical_history,
        previous_scan_reference=scan_in.previous_scan_reference,

        report_title=scan_in.report_title or f"{scan_in.scan_name} Report",
        report_number=report_num,
        report_date=scan_in.report_date or datetime.utcnow(),
        reported_by=scan_in.reported_by or scan_in.radiologist_name,
        verified_by=scan_in.verified_by,
        report_status=scan_in.report_status,
        doctor_comments=scan_in.doctor_comments,

        created_by=created_by,
        created_at=datetime.utcnow(),
        updated_by=created_by,
        updated_at=datetime.utcnow(),
        version=1,
        record_status="Active"
    )
    db.add(scan_obj)
    db.commit()
    db.refresh(scan_obj)

    # Attach findings if provided
    if scan_in.findings:
        f_in = scan_in.findings
        findings_obj = models.ScanFindings(
            scan_id=scan_obj.id,
            findings=f_in.findings,
            observations=f_in.observations,
            measurements=f_in.measurements or [],
            abnormalities=f_in.abnormalities or [],
            organ_specific_findings=f_in.organ_specific_findings or {},
            impression=f_in.impression,
            diagnosis=f_in.diagnosis,
            recommendations=f_in.recommendations or [],
            follow_up_required=f_in.follow_up_required,
            follow_up_date=f_in.follow_up_date
        )
        db.add(findings_obj)
        db.commit()

    log_scan_action(db, scan_obj.id, "CREATED", created_by, {"scan_number": scan_num, "scan_name": scan_in.scan_name})
    db.refresh(scan_obj)
    return scan_obj

def get_scan_record(db: Session, scan_id: int):
    return db.query(models.ScanRecord).filter(models.ScanRecord.id == scan_id, models.ScanRecord.record_status != "Deleted").first()

def get_all_scans(db: Session, limit: int = 100):
    return db.query(models.ScanRecord).filter(models.ScanRecord.record_status != "Deleted").order_by(models.ScanRecord.scan_date.desc(), models.ScanRecord.id.desc()).limit(limit).all()

def get_patient_scans(db: Session, patient_id: int, scan_type: str = None, status: str = None):
    query = db.query(models.ScanRecord).filter(models.ScanRecord.patient_id == patient_id, models.ScanRecord.record_status != "Deleted")
    if scan_type and scan_type != "All":
        query = query.filter(models.ScanRecord.scan_type == scan_type)
    if status and status != "All":
        query = query.filter(models.ScanRecord.scan_status == status)
    return query.order_by(models.ScanRecord.scan_date.desc(), models.ScanRecord.id.desc()).all()

def get_latest_patient_scan(db: Session, patient_id: int):
    return db.query(models.ScanRecord).filter(
        models.ScanRecord.patient_id == patient_id,
        models.ScanRecord.record_status != "Deleted"
    ).order_by(models.ScanRecord.scan_date.desc(), models.ScanRecord.id.desc()).first()

def update_scan_record(db: Session, scan_id: int, scan_update: schemas.ScanRecordUpdate, updated_by: str = "system"):
    scan_obj = db.query(models.ScanRecord).filter(models.ScanRecord.id == scan_id, models.ScanRecord.record_status != "Deleted").first()
    if not scan_obj:
        return None

    changes = {}
    update_data = scan_update.dict(exclude_unset=True)
    findings_data = update_data.pop("findings", None)

    for field, val in update_data.items():
        if hasattr(scan_obj, field) and val is not None:
            old_val = getattr(scan_obj, field)
            if old_val != val:
                changes[field] = {"old": str(old_val), "new": str(val)}
                setattr(scan_obj, field, val)

    scan_obj.updated_by = updated_by
    scan_obj.updated_at = datetime.utcnow()
    scan_obj.version = (scan_obj.version or 1) + 1

    if findings_data:
        findings_obj = db.query(models.ScanFindings).filter(models.ScanFindings.scan_id == scan_id).first()
        if not findings_obj:
            findings_obj = models.ScanFindings(scan_id=scan_id)
            db.add(findings_obj)

        for f_field, f_val in findings_data.items():
            if hasattr(findings_obj, f_field) and f_val is not None:
                setattr(findings_obj, f_field, f_val)
        changes["findings_updated"] = True

    db.commit()
    db.refresh(scan_obj)
    log_scan_action(db, scan_id, "UPDATED", updated_by, changes)
    return scan_obj

def delete_scan_record(db: Session, scan_id: int, updated_by: str = "system"):
    scan_obj = db.query(models.ScanRecord).filter(models.ScanRecord.id == scan_id).first()
    if scan_obj:
        scan_obj.record_status = "Cancelled"
        scan_obj.scan_status = "Cancelled"
        scan_obj.updated_by = updated_by
        scan_obj.updated_at = datetime.utcnow()
        db.commit()
        log_scan_action(db, scan_id, "CANCELLED", updated_by, {"status": "Cancelled"})
    return scan_obj

def add_scan_attachment(db: Session, scan_id: int, attachment_data: dict):
    scan_obj = get_scan_record(db, scan_id)
    if not scan_obj:
        raise ValueError("Scan record not found")

    att = models.ScanAttachment(
        scan_id=scan_id,
        file_name=attachment_data["file_name"],
        original_name=attachment_data["original_name"],
        file_type=attachment_data["file_type"],
        file_size=attachment_data["file_size"],
        file_category=attachment_data.get("file_category", "report"),
        file_path=attachment_data["file_path"],
        storage_url=attachment_data["storage_url"],
        uploaded_by=attachment_data.get("uploaded_by", "system"),
        uploaded_at=datetime.utcnow()
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    log_scan_action(db, scan_id, "ATTACHMENT_ADDED", attachment_data.get("uploaded_by", "system"), {"file_name": attachment_data["file_name"]})
    return att

def get_scan_attachments(db: Session, scan_id: int):
    return db.query(models.ScanAttachment).filter(models.ScanAttachment.scan_id == scan_id).all()

def delete_scan_attachment(db: Session, attachment_id: int):
    att = db.query(models.ScanAttachment).filter(models.ScanAttachment.id == attachment_id).first()
    if att:
        scan_id = att.scan_id
        db.delete(att)
        db.commit()
        log_scan_action(db, scan_id, "ATTACHMENT_DELETED", "system", {"file_name": att.file_name})
        return True
    return False

def get_scan_audit_logs(db: Session, scan_id: int):
    return db.query(models.ScanAuditLog).filter(models.ScanAuditLog.scan_id == scan_id).order_by(models.ScanAuditLog.timestamp.desc()).all()

def get_patient_scan_analysis(db: Session, patient_id: int):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        return None

    # Retrieve ALL scans for this patient (oldest first for progression)
    scans_asc = db.query(models.ScanRecord).filter(
        models.ScanRecord.patient_id == patient_id,
        models.ScanRecord.record_status != "Deleted"
    ).order_by(models.ScanRecord.scan_date.asc(), models.ScanRecord.id.asc()).all()

    scan_history_desc = list(reversed(scans_asc))

    # Summary by scan type
    scan_types_summary = {}
    for s in scans_asc:
        t = s.scan_type or "Other"
        scan_types_summary[t] = scan_types_summary.get(t, 0) + 1

    # Chronological progression
    chronological_progression = []
    for s in scans_asc:
        f = s.findings
        chronological_progression.append({
            "scan_id": s.id,
            "scan_number": s.scan_number,
            "scan_date": s.scan_date.isoformat() if s.scan_date else "",
            "scan_type": s.scan_type,
            "scan_name": s.scan_name,
            "doctor": s.referred_by_doctor or s.radiologist_name or "N/A",
            "findings": f.findings if f else "",
            "observations": f.observations if f else "",
            "impression": f.impression if f else "",
            "diagnosis": f.diagnosis if f else "",
            "abnormalities": f.abnormalities if f else [],
            "recommendations": f.recommendations if f else [],
            "has_attachments": len(s.attachments) > 0
        })

    # Extract Measurement Trends over time across all scans
    measurement_trends = []
    measurement_map = {} # param_name -> list of {date, scan_name, value, unit}
    for s in scans_asc:
        if s.findings and s.findings.measurements:
            s_date = s.scan_date.isoformat() if s.scan_date else ""
            for m in s.findings.measurements:
                if isinstance(m, dict) and "parameter" in m:
                    pname = m["parameter"]
                    if pname not in measurement_map:
                        measurement_map[pname] = []
                    measurement_map[pname].append({
                        "date": s_date,
                        "scan_name": s.scan_name,
                        "scan_type": s.scan_type,
                        "value": m.get("value", ""),
                        "unit": m.get("unit", ""),
                        "previous_value": m.get("previous_value", ""),
                        "trend": m.get("trend", "Unchanged")
                    })

    for pname, points in measurement_map.items():
        measurement_trends.append({
            "parameter": pname,
            "history": points
        })

    # Integrated Medical Timeline (Registration -> OP Tokens -> Consultations -> Lab Orders -> IP Admissions -> Scans)
    timeline_events = []
    if patient.created_at:
        timeline_events.append({
            "event_type": "Registration",
            "date": patient.created_at.strftime("%Y-%m-%d"),
            "title": "Patient Registered",
            "details": f"Patient UHID: {patient.id}, Age: {patient.age}, Gender: {patient.gender}"
        })

    tokens = db.query(models.OPToken).filter(models.OPToken.patient_id == patient_id).all()
    for t in tokens:
        timeline_events.append({
            "event_type": "OP Token",
            "date": t.date.isoformat() if t.date else "",
            "title": f"OP Consultation Token #{t.token_number}",
            "details": f"Session: {t.session}, Fee: ₹{t.fee}, Status: {t.status}"
        })

    casesheets = db.query(models.Casesheet).filter(models.Casesheet.patient_id == patient_id).all()
    for c in casesheets:
        timeline_events.append({
            "event_type": "Consultation",
            "date": c.date.isoformat() if c.date else "",
            "title": "Doctor Consultation & EMR",
            "details": f"Diagnosis: {c.diagnosis or 'N/A'}, Symptoms: {c.symptoms or 'N/A'}"
        })

    labs = db.query(models.LabOrder).filter(models.LabOrder.patient_id == patient_id).all()
    for l in labs:
        timeline_events.append({
            "event_type": "Lab Test",
            "date": l.order_date.strftime("%Y-%m-%d") if l.order_date else "",
            "title": f"Lab Order #{l.id}",
            "details": f"Test ID: {l.test_id}, Status: {l.status}"
        })

    admissions = db.query(models.IPAdmission).filter(models.IPAdmission.patient_id == patient_id).all()
    for a in admissions:
        timeline_events.append({
            "event_type": "IP Admission",
            "date": a.admission_date.strftime("%Y-%m-%d") if a.admission_date else "",
            "title": f"IP Admission (Room {a.room_number})",
            "details": f"Doctor: {a.doctor_in_charge}, Status: {a.status}"
        })

    for s in scans_asc:
        timeline_events.append({
            "event_type": "Scan & Investigation",
            "date": s.scan_date.isoformat() if s.scan_date else "",
            "title": f"{s.scan_type}: {s.scan_name}",
            "details": f"Scan No: {s.scan_number}, Status: {s.scan_status}, Impression: {s.findings.impression if s.findings else 'N/A'}"
        })

    # Sort timeline by date ascending
    timeline_events.sort(key=lambda x: x["date"] or "0000-00-00")

    return {
        "patient": patient,
        "total_scans": len(scans_asc),
        "scan_types_summary": scan_types_summary,
        "scan_history": scan_history_desc,
        "chronological_progression": chronological_progression,
        "measurement_trends": measurement_trends,
        "medical_timeline": timeline_events
    }


def create_lab_sample(db: Session, sample: schemas.LabSampleCreate):
    db_sample = models.LabSample(**sample.dict())
    db.add(db_sample)
    db.commit()
    db.refresh(db_sample)

    # Auto update order status
    update_lab_order_status(db, sample.order_id, "Sample Collected")

    return db_sample

def get_lab_samples(db: Session):
    return db.query(models.LabSample).order_by(models.LabSample.id.desc()).all()

def update_lab_sample_status(db: Session, sample_id: int, status: str):
    db_sample = db.query(models.LabSample).filter(models.LabSample.id == sample_id).first()
    if db_sample:
        db_sample.status = status
        if status == "Collected":
            db_sample.collection_date = datetime.utcnow()
        db.commit()
        db.refresh(db_sample)
    return db_sample

# ===========================================
# NEW: OP BILL CRUD
# ===========================================
def create_op_bill(db: Session, bill: schemas.OPBillCreate):
    other_total = sum(c.amount for c in bill.other_charges)
    subtotal = bill.consultation_fee + bill.lab_charges + bill.pharmacy_charges + other_total
    discount_amount = (bill.discount / 100.0) * subtotal
    gst_amount = (bill.gst / 100.0) * (subtotal - discount_amount)
    total = subtotal - discount_amount + gst_amount

    db_bill = models.OPBill(
        patient_id=bill.patient_id,
        token_id=bill.token_id,
        doctor_name=bill.doctor_name,
        department=bill.department,
        consultation_fee=bill.consultation_fee,
        lab_charges=bill.lab_charges,
        pharmacy_charges=bill.pharmacy_charges,
        other_charges=[c.dict() for c in bill.other_charges],
        subtotal=subtotal,
        discount=bill.discount,
        gst=bill.gst,
        total=total,
        payment_mode=bill.payment_mode,
        payment_details=bill.payment_details,
        notes=bill.notes
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def get_op_bills(db: Session, patient_id: int = None):
    query = db.query(models.OPBill)
    if patient_id:
        query = query.filter(models.OPBill.patient_id == patient_id)
    return query.order_by(models.OPBill.bill_date.desc()).all()

# ===========================================
# NEW: IP BILL CRUD
# ===========================================
def create_ip_bill(db: Session, bill: schemas.IPBillCreate):
    room_charges = bill.room_charge_per_day * bill.days_stayed
    other_total = sum(c.amount for c in bill.other_charges)
    subtotal = room_charges + bill.doctor_charges + bill.nursing_charges + bill.pharmacy_charges + bill.lab_charges + other_total
    discount_amount = (bill.discount / 100.0) * subtotal
    gst_amount = (bill.gst / 100.0) * (subtotal - discount_amount)
    total = subtotal - discount_amount + gst_amount

    db_bill = models.IPBill(
        patient_id=bill.patient_id,
        admission_id=bill.admission_id,
        doctor_name=bill.doctor_name,
        room_charge_per_day=bill.room_charge_per_day,
        days_stayed=bill.days_stayed,
        room_charges=room_charges,
        doctor_charges=bill.doctor_charges,
        nursing_charges=bill.nursing_charges,
        pharmacy_charges=bill.pharmacy_charges,
        lab_charges=bill.lab_charges,
        other_charges=[c.dict() for c in bill.other_charges],
        subtotal=subtotal,
        discount=bill.discount,
        gst=bill.gst,
        total=total,
        payment_mode=bill.payment_mode,
        payment_details=bill.payment_details,
        notes=bill.notes
    )
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill

def get_ip_bills(db: Session, patient_id: int = None):
    query = db.query(models.IPBill)
    if patient_id:
        query = query.filter(models.IPBill.patient_id == patient_id)
    return query.order_by(models.IPBill.bill_date.desc()).all()

# ===========================================
# NEW: GLOBAL SEARCH
# ===========================================
def global_search(db: Session, query: str):
    results = []
    q = query.strip().lower()

    # Search patients by name, phone, aadhaar
    patients = db.query(models.Patient).filter(
        or_(
            func.lower(models.Patient.name).contains(q),
            models.Patient.phone.contains(query),
            models.Patient.aadhaar.contains(query),
            cast(models.Patient.id, String) == query
        )
    ).limit(10).all()

    for p in patients:
        results.append({
            "type": "patient",
            "id": p.id,
            "patient_id": p.id,
            "patient_name": p.name,
            "detail": f"Age: {p.age}, Gender: {p.gender}, Phone: {p.phone or '-'}",
            "date": p.created_at.strftime("%Y-%m-%d") if p.created_at else None,
            "amount": None
        })

    # Search OP Tokens by token number
    if query.isdigit():
        tokens = db.query(models.OPToken).filter(
            or_(
                models.OPToken.token_number == int(query),
                models.OPToken.id == int(query)
            )
        ).limit(5).all()
        for t in tokens:
            patient = db.query(models.Patient).filter(models.Patient.id == t.patient_id).first()
            results.append({
                "type": "op_token",
                "id": t.id,
                "patient_id": t.patient_id,
                "patient_name": patient.name if patient else "Unknown",
                "detail": f"Token #{t.token_number} | {t.session} | {t.date} | Status: {t.status}",
                "date": str(t.date),
                "amount": t.fee
            })

    # Search OP Bills by bill id
    if query.isdigit():
        op_bills = db.query(models.OPBill).filter(models.OPBill.id == int(query)).limit(5).all()
        for b in op_bills:
            patient = db.query(models.Patient).filter(models.Patient.id == b.patient_id).first()
            results.append({
                "type": "op_bill",
                "id": b.id,
                "patient_id": b.patient_id,
                "patient_name": patient.name if patient else "Unknown",
                "detail": f"OP Bill #{b.id} | Dr: {b.doctor_name or '-'} | {b.payment_mode}",
                "date": b.bill_date.strftime("%Y-%m-%d"),
                "amount": b.total
            })

        # IP Bills
        ip_bills = db.query(models.IPBill).filter(models.IPBill.id == int(query)).limit(5).all()
        for b in ip_bills:
            patient = db.query(models.Patient).filter(models.Patient.id == b.patient_id).first()
            results.append({
                "type": "ip_bill",
                "id": b.id,
                "patient_id": b.patient_id,
                "patient_name": patient.name if patient else "Unknown",
                "detail": f"IP Bill #{b.id} | Dr: {b.doctor_name or '-'} | Days: {b.days_stayed}",
                "date": b.bill_date.strftime("%Y-%m-%d"),
                "amount": b.total
            })

        # Admissions
        admissions = db.query(models.IPAdmission).filter(models.IPAdmission.id == int(query)).limit(5).all()
        for a in admissions:
            patient = db.query(models.Patient).filter(models.Patient.id == a.patient_id).first()
            results.append({
                "type": "admission",
                "id": a.id,
                "patient_id": a.patient_id,
                "patient_name": patient.name if patient else "Unknown",
                "detail": f"Admission #{a.id} | Ward: {a.ward_number} | Status: {a.status}",
                "date": a.admission_date.strftime("%Y-%m-%d"),
                "amount": None
            })

        # Pharmacy Bills
        pharmacy_bills = db.query(models.PharmacyBill).filter(models.PharmacyBill.id == int(query)).limit(5).all()
        for b in pharmacy_bills:
            patient = db.query(models.Patient).filter(models.Patient.id == b.patient_id).first() if b.patient_id else None
            results.append({
                "type": "pharmacy_bill",
                "id": b.id,
                "patient_id": b.patient_id,
                "patient_name": patient.name if patient else (b.patient_name or "Walk-in"),
                "detail": f"Pharmacy Bill #{b.id} | {b.payment_mode}",
                "date": b.bill_date.strftime("%Y-%m-%d"),
                "amount": b.total
            })

        # Lab Bills
        lab_bills = db.query(models.LabBill).filter(models.LabBill.id == int(query)).limit(5).all()
        for b in lab_bills:
            patient = db.query(models.Patient).filter(models.Patient.id == b.patient_id).first()
            results.append({
                "type": "lab_bill",
                "id": b.id,
                "patient_id": b.patient_id,
                "patient_name": patient.name if patient else "Unknown",
                "detail": f"Lab Bill #{b.id} | Status: {b.status}",
                "date": b.bill_date.strftime("%Y-%m-%d"),
                "amount": b.total
            })

    return results

# ===========================================
# NEW: REPORTS CRUD
# ===========================================
def get_daily_report(db: Session, report_date: date):
    start = datetime.combine(report_date, datetime.min.time())
    end = datetime.combine(report_date, datetime.max.time())

    op_revenue = db.query(func.coalesce(func.sum(models.OPBill.total), 0)).filter(
        models.OPBill.bill_date >= start, models.OPBill.bill_date <= end).scalar()
    ip_revenue = db.query(func.coalesce(func.sum(models.IPBill.total), 0)).filter(
        models.IPBill.bill_date >= start, models.IPBill.bill_date <= end).scalar()
    pharmacy_revenue = db.query(func.coalesce(func.sum(models.PharmacyBill.total), 0)).filter(
        models.PharmacyBill.bill_date >= start, models.PharmacyBill.bill_date <= end).scalar()
    lab_revenue = db.query(func.coalesce(func.sum(models.LabBill.total), 0)).filter(
        models.LabBill.bill_date >= start, models.LabBill.bill_date <= end).scalar()

    op_count = db.query(func.count(models.OPBill.id)).filter(
        models.OPBill.bill_date >= start, models.OPBill.bill_date <= end).scalar()
    ip_count = db.query(func.count(models.IPBill.id)).filter(
        models.IPBill.bill_date >= start, models.IPBill.bill_date <= end).scalar()
    ph_count = db.query(func.count(models.PharmacyBill.id)).filter(
        models.PharmacyBill.bill_date >= start, models.PharmacyBill.bill_date <= end).scalar()
    lab_count = db.query(func.count(models.LabBill.id)).filter(
        models.LabBill.bill_date >= start, models.LabBill.bill_date <= end).scalar()

    # Token-based unique patient count
    patient_tokens = db.query(func.count(func.distinct(models.OPToken.patient_id))).filter(
        models.OPToken.date == report_date).scalar()

    return {
        "date": str(report_date),
        "op_revenue": float(op_revenue),
        "ip_revenue": float(ip_revenue),
        "pharmacy_revenue": float(pharmacy_revenue),
        "lab_revenue": float(lab_revenue),
        "total_revenue": float(op_revenue + ip_revenue + pharmacy_revenue + lab_revenue),
        "total_patients": int(patient_tokens),
        "total_bills": int(op_count + ip_count + ph_count + lab_count)
    }

def update_lab_order(db: Session, order_id: int, order_data: schemas.LabOrderUpdate):
    db_order = db.query(models.LabOrder).filter(models.LabOrder.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order_data.status is not None:
        db_order.status = order_data.status
    if order_data.priority is not None:
        db_order.priority = order_data.priority
    if order_data.remarks is not None:
        db_order.remarks = order_data.remarks
    db.commit()
    db.refresh(db_order)
    return db_order

def update_lab_sample(db: Session, sample_id: int, sample_data: schemas.LabSampleUpdate):
    db_sample = db.query(models.LabSample).filter(models.LabSample.id == sample_id).first()
    if not db_sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    for var, value in vars(sample_data).items():
        if value is not None:
            setattr(db_sample, var, value)

    db.commit()
    db.refresh(db_sample)
    return db_sample
def get_monthly_report(db: Session, year: int, month: int):
    from calendar import monthrange
    from datetime import timedelta
    _, days_in_month = monthrange(year, month)

    daily_data = []
    for d in range(1, days_in_month + 1):
        day_date = date(year, month, d)
        report = get_daily_report(db, day_date)
        if report["total_bills"] > 0 or report["total_revenue"] > 0:
            daily_data.append(report)

    return daily_data

def get_yearly_report(db: Session, year: int):
    monthly_data = []
    for month in range(1, 13):
        from calendar import monthrange
        _, days_in_month = monthrange(year, month)

        start = datetime(year, month, 1)
        end = datetime(year, month, days_in_month, 23, 59, 59)

        op_rev = db.query(func.coalesce(func.sum(models.OPBill.total), 0)).filter(
            models.OPBill.bill_date >= start, models.OPBill.bill_date <= end).scalar()
        ip_rev = db.query(func.coalesce(func.sum(models.IPBill.total), 0)).filter(
            models.IPBill.bill_date >= start, models.IPBill.bill_date <= end).scalar()
        ph_rev = db.query(func.coalesce(func.sum(models.PharmacyBill.total), 0)).filter(
            models.PharmacyBill.bill_date >= start, models.PharmacyBill.bill_date <= end).scalar()
        lab_rev = db.query(func.coalesce(func.sum(models.LabBill.total), 0)).filter(
            models.LabBill.bill_date >= start, models.LabBill.bill_date <= end).scalar()

        bill_count = (
            db.query(func.count(models.OPBill.id)).filter(models.OPBill.bill_date >= start, models.OPBill.bill_date <= end).scalar() +
            db.query(func.count(models.IPBill.id)).filter(models.IPBill.bill_date >= start, models.IPBill.bill_date <= end).scalar() +
            db.query(func.count(models.PharmacyBill.id)).filter(models.PharmacyBill.bill_date >= start, models.PharmacyBill.bill_date <= end).scalar() +
            db.query(func.count(models.LabBill.id)).filter(models.LabBill.bill_date >= start, models.LabBill.bill_date <= end).scalar()
        )

        import calendar
        month_name = calendar.month_name[month]
        monthly_data.append({
            "month": f"{month_name} {year}",
            "op_revenue": float(op_rev),
            "ip_revenue": float(ip_rev),
            "pharmacy_revenue": float(ph_rev),
            "lab_revenue": float(lab_rev),
            "total_revenue": float(op_rev + ip_rev + ph_rev + lab_rev),
            "total_bills": int(bill_count)
        })

    return monthly_data

def get_revenue_breakdown(db: Session, start_date: date = None, end_date: date = None):
    filters_op = []
    filters_ip = []
    filters_ph = []
    filters_lab = []

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        filters_op.append(models.OPBill.bill_date >= start_dt)
        filters_ip.append(models.IPBill.bill_date >= start_dt)
        filters_ph.append(models.PharmacyBill.bill_date >= start_dt)
        filters_lab.append(models.LabBill.bill_date >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        filters_op.append(models.OPBill.bill_date <= end_dt)
        filters_ip.append(models.IPBill.bill_date <= end_dt)
        filters_ph.append(models.PharmacyBill.bill_date <= end_dt)
        filters_lab.append(models.LabBill.bill_date <= end_dt)

    op = float(db.query(func.coalesce(func.sum(models.OPBill.total), 0)).filter(*filters_op).scalar())
    ip = float(db.query(func.coalesce(func.sum(models.IPBill.total), 0)).filter(*filters_ip).scalar())
    ph = float(db.query(func.coalesce(func.sum(models.PharmacyBill.total), 0)).filter(*filters_ph).scalar())
    lab = float(db.query(func.coalesce(func.sum(models.LabBill.total), 0)).filter(*filters_lab).scalar())

    return {"op_total": op, "ip_total": ip, "pharmacy_total": ph, "lab_total": lab, "grand_total": op + ip + ph + lab}

def get_doctor_wise_report(db: Session):
    op_data = db.query(
        models.OPBill.doctor_name,
        func.count(models.OPBill.id).label("op_bills"),
        func.coalesce(func.sum(models.OPBill.total), 0).label("op_revenue")
    ).filter(models.OPBill.doctor_name != None).group_by(models.OPBill.doctor_name).all()

    ip_data = db.query(
        models.IPBill.doctor_name,
        func.count(models.IPBill.id).label("ip_bills"),
        func.coalesce(func.sum(models.IPBill.total), 0).label("ip_revenue")
    ).filter(models.IPBill.doctor_name != None).group_by(models.IPBill.doctor_name).all()

    doctors = {}
    for row in op_data:
        name = row.doctor_name or "Unknown"
        if name not in doctors:
            doctors[name] = {"doctor_name": name, "op_bills": 0, "ip_bills": 0, "total_revenue": 0.0}
        doctors[name]["op_bills"] += row.op_bills
        doctors[name]["total_revenue"] += float(row.op_revenue)

    for row in ip_data:
        name = row.doctor_name or "Unknown"
        if name not in doctors:
            doctors[name] = {"doctor_name": name, "op_bills": 0, "ip_bills": 0, "total_revenue": 0.0}
        doctors[name]["ip_bills"] += row.ip_bills
        doctors[name]["total_revenue"] += float(row.ip_revenue)

    return list(doctors.values())

def get_medicine_sales_report(db: Session):
    data = db.query(
        models.PharmacyBillItem.medicine_name,
        func.sum(models.PharmacyBillItem.quantity).label("total_quantity"),
        func.sum(models.PharmacyBillItem.total_price).label("total_revenue")
    ).group_by(models.PharmacyBillItem.medicine_name).order_by(
        func.sum(models.PharmacyBillItem.total_price).desc()
    ).all()

    return [{"medicine_name": row.medicine_name, "total_quantity_sold": int(row.total_quantity), "total_revenue": float(row.total_revenue)} for row in data]

def get_admission_report(db: Session, status: str = None):
    query = db.query(models.IPAdmission)
    if status:
        query = query.filter(models.IPAdmission.status == status)
    return query.order_by(models.IPAdmission.admission_date.desc()).all()

def get_department_wise_report(db: Session):
    data = db.query(
        models.OPBill.department,
        func.count(models.OPBill.id).label("total_bills"),
        func.coalesce(func.sum(models.OPBill.total), 0).label("total_revenue")
    ).filter(models.OPBill.department != None, models.OPBill.department != "").group_by(models.OPBill.department).all()

    return [{"department": row.department, "total_bills": row.total_bills, "total_revenue": float(row.total_revenue)} for row in data]

def get_patient_report(db: Session, patient_id: int):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        return None

    op_visits = db.query(models.OPToken).filter(models.OPToken.patient_id == patient_id).count()
    admissions = db.query(models.IPAdmission).filter(models.IPAdmission.patient_id == patient_id).count()

    op_revenue = db.query(func.coalesce(func.sum(models.OPBill.total), 0)).filter(models.OPBill.patient_id == patient_id).scalar()
    ip_revenue = db.query(func.coalesce(func.sum(models.IPBill.total), 0)).filter(models.IPBill.patient_id == patient_id).scalar()
    pharmacy_revenue = db.query(func.coalesce(func.sum(models.PharmacyBill.total), 0)).filter(models.PharmacyBill.patient_id == patient_id).scalar()
    lab_revenue = db.query(func.coalesce(func.sum(models.LabBill.total), 0)).filter(models.LabBill.patient_id == patient_id).scalar()

    total_revenue = float(op_revenue) + float(ip_revenue) + float(pharmacy_revenue) + float(lab_revenue)

    return {
        "patient": patient,
        "op_visits": op_visits,
        "admissions": admissions,
        "total_revenue": total_revenue,
        "breakdown": {
            "op": float(op_revenue),
            "ip": float(ip_revenue),
            "pharmacy": float(pharmacy_revenue),
            "lab": float(lab_revenue)
        }
    }

# --- Additional CRUD Operations ---

def update_patient(db: Session, patient_id: int, patient_update: schemas.PatientUpdate):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if db_patient:
        update_data = patient_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_patient, key, value)
        db.commit()
        db.refresh(db_patient)
    return db_patient

def delete_patient(db: Session, patient_id: int):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if db_patient:
        db.delete(db_patient)
        db.commit()
    return db_patient

def delete_op_token(db: Session, token_id: int):
    db_token = db.query(models.OPToken).filter(models.OPToken.id == token_id).first()
    return db_report

def delete_lab_order(db: Session, order_id: int):
    db_order = db.query(models.LabOrder).filter(models.LabOrder.id == order_id).first()
    if db_order:
        db.delete(db_order)
        db.commit()
    return db_order

def delete_lab_sample(db: Session, sample_id: int):
    db_sample = db.query(models.LabSample).filter(models.LabSample.id == sample_id).first()
    if db_sample:
        db.delete(db_sample)
        db.commit()
    return db_sample
