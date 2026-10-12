import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FlaskConical, Plus, Search, Filter, Eye, Edit, Trash2, Download, UploadCloud,
  FileText, Activity, Clock, User, Calendar, CheckCircle2, ChevronRight,
  AlertTriangle, RefreshCw, X, Shield, ArrowRight, Printer, PlusCircle, List,
  TrendingUp, FileSpreadsheet, Paperclip, Check, AlertCircle, XCircle
} from 'lucide-react';
import Select from 'react-select';

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: 'var(--bg-input, #1e293b)',
    borderColor: state.isFocused ? 'var(--border-focus, #3b82f6)' : 'var(--input-border, #334155)',
    color: 'var(--text-primary, #f8fafc)',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
    minHeight: '40px',
    '&:hover': { borderColor: 'var(--border-focus, #3b82f6)' }
  }),
  menu: (base: any) => ({ ...base, backgroundColor: 'var(--bg-card, #1e293b)', border: '1px solid var(--border, #334155)', zIndex: 100 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
    color: 'var(--text-primary, #f8fafc)',
    '&:active': { backgroundColor: 'rgba(59, 130, 246, 0.3)' }
  }),
  singleValue: (base: any) => ({ ...base, color: 'var(--text-primary, #f8fafc)' }),
  input: (base: any) => ({ ...base, color: 'var(--text-primary, #f8fafc)' })
};

export interface LabModuleProps {
  API_BASE: string;
  patients: any[];
  labReports: any[];
  labTestMasters: any[];
  labOrders: any[];
  labSamples: any[];
  opBills: any[];
  ipAdmissions: any[];
  currentUser: any | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  loadAllData: () => Promise<void>;
  selectedGlobalLabPatientId: number | null;
  setSelectedGlobalLabPatientId: (id: number | null) => void;
  activeLabSubTab?: string;
}

export default function LabModule({
  API_BASE,
  patients,
  labReports,
  labTestMasters,
  labOrders,
  labSamples,
  opBills,
  ipAdmissions,
  currentUser,
  showToast,
  loadAllData,
  selectedGlobalLabPatientId,
  setSelectedGlobalLabPatientId,
  activeLabSubTab = 'orders'
}: LabModuleProps) {
  // Current sub tab state
  const [subTab, setSubTab] = useState<'orders' | 'samples' | 'results' | 'reports' | 'history' | 'master' | 'dashboard'>(
    activeLabSubTab === 'lab_dashboard' ? 'dashboard' :
    activeLabSubTab === 'lab_master' ? 'master' :
    activeLabSubTab === 'lab_samples' ? 'samples' :
    activeLabSubTab === 'lab_results' ? 'results' :
    activeLabSubTab === 'lab_reports_new' || activeLabSubTab === 'lab_reports' ? 'reports' :
    activeLabSubTab === 'lab_history' ? 'history' : 'orders'
  );

  useEffect(() => {
    if (activeLabSubTab === 'lab_dashboard') setSubTab('dashboard');
    else if (activeLabSubTab === 'lab_master') setSubTab('master');
    else if (activeLabSubTab === 'lab_samples') setSubTab('samples');
    else if (activeLabSubTab === 'lab_results') setSubTab('results');
    else if (activeLabSubTab === 'lab_reports_new' || activeLabSubTab === 'lab_reports') setSubTab('reports');
    else if (activeLabSubTab === 'lab_history') setSubTab('history');
    else if (activeLabSubTab === 'lab_orders') setSubTab('orders');
  }, [activeLabSubTab]);

  // Filters & Modals
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labFilterStatus, setLabFilterStatus] = useState('All');
  const [selectedViewOrder, setSelectedViewOrder] = useState<any | null>(null);
  const [selectedEditOrder, setSelectedEditOrder] = useState<any | null>(null);
  const [selectedCollectSampleOrder, setSelectedCollectSampleOrder] = useState<any | null>(null);
  const [selectedResultEntryOrder, setSelectedResultEntryOrder] = useState<any | null>(null);
  const [selectedViewReport, setSelectedViewReport] = useState<any | null>(null);

  // New Enterprise Modals & State
  const [selectedRejectSample, setSelectedRejectSample] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [selectedReviseReport, setSelectedReviseReport] = useState<any | null>(null);
  const [revisionReasonInput, setRevisionReasonInput] = useState('');
  const [pathologistCommentsInput, setPathologistCommentsInput] = useState('');

  // History & Trend State
  const [patientLabHistoryData, setPatientLabHistoryData] = useState<any | null>(null);
  const [patientLabTrendsData, setPatientLabTrendsData] = useState<any[]>([]);
  const [trendTestFilter, setTrendTestFilter] = useState<string>('');

  // File Upload State
  const [isUploadAttachmentOpen, setIsUploadAttachmentOpen] = useState(false);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState<File | null>(null);
  const [attachmentTargetReportId, setAttachmentTargetReportId] = useState<number | null>(null);

  const [isLabRegistrationModalOpen, setIsLabRegistrationModalOpen] = useState(false);
  const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
  const [labDirectOrderPatientId, setLabDirectOrderPatientId] = useState<number | null>(null);
  const [labDirectOrderForm, setLabDirectOrderForm] = useState({
    test_id: '', referring_doctor: 'Walk-in / Self', priority: 'Routine', clinical_indication: ''
  });

  // Forms
  const [editOrderForm, setEditOrderForm] = useState({ priority: 'Routine', remarks: '', clinical_indication: '', diagnosis: '' });
  const [collectSampleForm, setCollectSampleForm] = useState<{ barcode: string; collected_by: string; sample_type: string; container_type?: string; remarks?: string }>({ barcode: '', collected_by: '', sample_type: '', container_type: '', remarks: '' });
  const [resultEntryForm, setResultEntryForm] = useState<{parameter: string, result: string, unit: string, range: string, normal_range?: string, flag: string, remarks?: string}[]>([]);

  // Lab Master Form
  const [selectedTestMasterId, setSelectedTestMasterId] = useState<number | null>(null);
  const [labTestMasterForm, setLabTestMasterForm] = useState({
    test_code: '', test_name: '', category: 'Pathology', department: 'Hematology', sample_type: 'Blood', container_type: 'EDTA Tube', method: 'Automated Analyzer', unit: 'g/dL', reference_range: '12.0 - 16.0', normal_range_male: '13.0 - 17.0', normal_range_female: '12.0 - 15.5', normal_range_child: '11.0 - 14.5', normal_low: 12.0, normal_high: 16.0, critical_low: 7.0, critical_high: 20.0, price: 350, tat_hours: 24, is_active: true
  });

  // Patient Registration Form for Walk-in
  const [patientForm, setPatientForm] = useState({
    name: '', age: 0, gender: 'Male', phone: '', address: '', aadhaar: '', blood_group: 'A+', occupation: '', marital_status: 'Single', guardian_name: '', emergency_contact: '', insurance_details: '', referral_doctor: '', patient_category: 'General', registration_type: 'Walk-in'
  });

  // Fetch Patient History & Trends when patient selected
  useEffect(() => {
    if (selectedGlobalLabPatientId && subTab === 'history') {
      fetchPatientLabHistory(selectedGlobalLabPatientId);
      fetchPatientLabTrends(selectedGlobalLabPatientId, trendTestFilter);
    }
  }, [selectedGlobalLabPatientId, subTab, trendTestFilter]);

  const fetchPatientLabHistory = async (patientId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/api/patients/${patientId}/lab-history`);
      setPatientLabHistoryData(res.data);
    } catch (err) {
      // fallback to silent
    }
  };

  const fetchPatientLabTrends = async (patientId: number, testName?: string) => {
    try {
      const url = testName
        ? `${API_BASE}/api/patients/${patientId}/lab-trends?test_name=${encodeURIComponent(testName)}`
        : `${API_BASE}/api/patients/${patientId}/lab-trends`;
      const res = await axios.get(url);
      setPatientLabTrendsData(res.data.data_points || []);
    } catch (err) {
      // fallback
    }
  };

  // Enterprise Handlers
  const handleReceiveSample = async (sampleId: number) => {
    try {
      await axios.post(`${API_BASE}/lab-samples/${sampleId}/receive`, {
        received_by: currentUser?.username || 'Lab Technologist',
        condition_notes: 'Sample received in optimal temperature and condition.'
      });
      showToast("Sample marked as Received at Lab!", "success");
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to receive sample", "error");
    }
  };

  const handleRejectSampleSubmit = async () => {
    if (!selectedRejectSample || !rejectionReasonInput.trim()) {
      return showToast("Rejection reason is compulsory", "error");
    }
    try {
      await axios.post(`${API_BASE}/lab-samples/${selectedRejectSample.id}/reject`, {
        rejection_reason: rejectionReasonInput
      });
      showToast("Sample rejected with logged audit reason.", "success");
      setSelectedRejectSample(null);
      setRejectionReasonInput('');
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to reject sample", "error");
    }
  };

  const handleVerifyLabReport = async (reportId: number) => {
    try {
      await axios.post(`${API_BASE}/lab-reports/${reportId}/verify`, {
        verified_by: currentUser?.username || 'Dr. Pathologist MD',
        comments: pathologistCommentsInput || 'Verified & Signed by Pathologist'
      });
      showToast("Lab Report Verified & Electronically Signed!", "success");
      setPathologistCommentsInput('');
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to verify report", "error");
    }
  };

  const handlePublishLabReport = async (reportId: number) => {
    try {
      await axios.post(`${API_BASE}/lab-reports/${reportId}/publish`, {
        published_by: currentUser?.username || 'Lab Admin'
      });
      showToast("Lab Report Published to Patient History!", "success");
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to publish report", "error");
    }
  };

  const handleReviseReportSubmit = async () => {
    if (!selectedReviseReport || !revisionReasonInput.trim()) {
      return showToast("Change reason is mandatory for report correction/revision", "error");
    }
    try {
      await axios.post(`${API_BASE}/lab-reports/${selectedReviseReport.id}/revise`, {
        results_data: resultEntryForm,
        result_value: resultEntryForm[0]?.result || '',
        changed_by: currentUser?.username || 'Dr. Pathologist MD',
        change_reason: revisionReasonInput
      });
      showToast(`Report revised! New Version ${selectedReviseReport.version + 1} generated.`, "success");
      setSelectedReviseReport(null);
      setSelectedResultEntryOrder(null);
      setRevisionReasonInput('');
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to revise report", "error");
    }
  };

  const handleFileUploadSubmit = async () => {
    if (!selectedAttachmentFile || !selectedGlobalLabPatientId) {
      return showToast("Please select a patient and file", "error");
    }
    const formData = new FormData();
    formData.append("file", selectedAttachmentFile);
    try {
      await axios.post(
        `${API_BASE}/api/lab-attachments/upload?patient_id=${selectedGlobalLabPatientId}${attachmentTargetReportId ? `&report_id=${attachmentTargetReportId}` : ''}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      showToast("Lab attachment uploaded successfully!", "success");
      setIsUploadAttachmentOpen(false);
      setSelectedAttachmentFile(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to upload file attachment", "error");
    }
  };

  // Quick Action Handlers
  const handleSaveLabTestMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTestMasterId) {
        await axios.put(`${API_BASE}/lab-test-masters/${selectedTestMasterId}`, labTestMasterForm);
        showToast("Lab Test Master updated successfully!", "success");
      } else {
        await axios.post(`${API_BASE}/lab-test-masters/`, labTestMasterForm);
        showToast("Lab Test Master saved successfully!", "success");
      }
      setLabTestMasterForm({
        test_code: '', test_name: '', category: 'Pathology', department: 'Hematology', sample_type: 'Blood', container_type: 'EDTA Tube', method: 'Automated Analyzer', unit: '', reference_range: '', normal_range_male: '', normal_range_female: '', normal_range_child: '', normal_low: 0, normal_high: 0, critical_low: 0, critical_high: 0, price: 0, tat_hours: 24, is_active: true
      });
      setSelectedTestMasterId(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save Test Master", "error");
    }
  };

  const handleEditLabTestMaster = (test: any) => {
    setSelectedTestMasterId(test.id);
    setLabTestMasterForm({
      test_code: test.test_code, test_name: test.test_name, category: test.category || '', department: test.department || '', sample_type: test.sample_type || '', container_type: test.container_type || '', method: test.method || '', unit: test.unit || '', reference_range: test.reference_range || '', normal_range_male: test.normal_range_male || '', normal_range_female: test.normal_range_female || '', normal_range_child: test.normal_range_child || '', normal_low: test.normal_low || 0, normal_high: test.normal_high || 0, critical_low: test.critical_low || 0, critical_high: test.critical_high || 0, price: test.price, tat_hours: test.tat_hours, is_active: test.is_active
    });
  };

  const handleDeleteLabTestMaster = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this test?")) return;
    try {
      await axios.delete(`${API_BASE}/lab-test-masters/${id}`);
      showToast("Lab Test deleted!", "success");
      await loadAllData();
    } catch (err) {
      showToast("Failed to delete Test Master", "error");
    }
  };

  const handleSaveEditOrder = async () => {
    if (!selectedEditOrder) return;
    try {
      await axios.put(`${API_BASE}/lab-orders/${selectedEditOrder.id}`, {
        priority: editOrderForm.priority,
        remarks: editOrderForm.remarks,
        clinical_indication: editOrderForm.clinical_indication,
        diagnosis: editOrderForm.diagnosis
      });
      showToast("Order updated successfully!", "success");
      setSelectedEditOrder(null);
      await loadAllData();
    } catch (err) {
      showToast("Failed to update order", "error");
    }
  };

  const handleSaveCollectSample = async () => {
    if (!selectedCollectSampleOrder) return;
    try {
      await axios.post(`${API_BASE}/lab-samples/`, {
        order_id: selectedCollectSampleOrder.id,
        sample_type: collectSampleForm.sample_type || 'Blood',
        collected_by: collectSampleForm.collected_by || currentUser?.username || 'Phlebotomist',
        container_type: collectSampleForm.container_type || 'EDTA Tube',
        barcode: collectSampleForm.barcode || `SAMP-${Date.now()}`,
        remarks: collectSampleForm.remarks,
        status: 'Collected'
      });

      await axios.put(`${API_BASE}/lab-orders/${selectedCollectSampleOrder.id}/status?status=Sample Collected`);

      showToast("Sample specimen collected & barcoded!", "success");
      setSelectedCollectSampleOrder(null);
      await loadAllData();
    } catch (err) {
      showToast("Failed to collect sample", "error");
    }
  };

  const handleSaveResultEntry = async (isFinal: boolean) => {
    if (!selectedResultEntryOrder) return;
    if (!selectedResultEntryOrder.patient_id) return showToast('Select a valid patient', 'error');

    // Automatically check abnormal / critical flags
    const processedResults = resultEntryForm.map(row => {
      let flag = row.flag || 'NORMAL';
      if (row.result) {
        const val = parseFloat(row.result);
        if (!isNaN(val)) {
          if (row.range) {
            const parts = row.range.split('-').map(p => parseFloat(p.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              if (val < parts[0]) flag = 'LOW';
              else if (val > parts[1]) flag = 'HIGH';
              else flag = 'NORMAL';
            }
          }
        }
      }
      return { ...row, flag };
    });

    try {
      if (isFinal) {
        // Create Finalized Lab Report
        await axios.post(`${API_BASE}/lab-reports/`, {
          patient_id: selectedResultEntryOrder.patient_id,
          order_id: selectedResultEntryOrder.id,
          test_name: labTestMasters.find(t => t.id === selectedResultEntryOrder.test_id)?.test_name || 'Lab Test',
          reported_by: currentUser?.username || 'Pathologist',
          results_data: processedResults,
          remarks: "Results Entered & Pending Pathologist Review",
          report_status: 'Draft'
        });

        // Update Order status
        await axios.put(`${API_BASE}/lab-orders/${selectedResultEntryOrder.id}/status?status=Result Entered`);
        showToast("Lab Result Entered successfully! Ready for Pathologist Verification.", "success");
      } else {
        // Save Draft in order remarks
        await axios.put(`${API_BASE}/lab-orders/${selectedResultEntryOrder.id}`, {
          status: 'Processing',
          remarks: JSON.stringify(processedResults)
        });
        showToast("Result Draft Saved!", "success");
      }

      setSelectedResultEntryOrder(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save result", "error");
    }
  };

  const handleLabWalkinRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForm.name || patientForm.age <= 0) return showToast('Please enter correct patient name and age', 'error');
    try {
      const payload = {
        name: patientForm.name,
        age: patientForm.age,
        gender: patientForm.gender,
        phone: patientForm.phone,
        address: patientForm.address,
        aadhaar: patientForm.aadhaar,
        blood_group: patientForm.blood_group,
        details: { registration_type: 'Walk-in' }
      };
      const res = await axios.post(`${API_BASE}/patients/`, payload);
      showToast('Walk-in patient registered successfully!', 'success');
      setPatientForm({ name: '', age: 0, gender: 'Male', phone: '', address: '', aadhaar: '', blood_group: 'A+', occupation: '', marital_status: 'Single', guardian_name: '', emergency_contact: '', insurance_details: '', referral_doctor: '', patient_category: 'General', registration_type: 'Walk-in' });
      await loadAllData();
      setIsLabRegistrationModalOpen(false);
      setLabDirectOrderPatientId(res.data.id);
      setIsLabOrderModalOpen(true);
    } catch (err) {
      showToast('Failed to register patient', 'error');
    }
  };

  const handleCreateDirectLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labDirectOrderPatientId || !labDirectOrderForm.test_id) return showToast('Please select a test', 'error');
    try {
      await axios.post(`${API_BASE}/lab-orders/`, {
        patient_id: labDirectOrderPatientId,
        doctor_name: labDirectOrderForm.referring_doctor,
        test_id: Number(labDirectOrderForm.test_id),
        priority: labDirectOrderForm.priority,
        clinical_indication: labDirectOrderForm.clinical_indication
      });
      showToast('Lab order created successfully!', 'success');
      setIsLabOrderModalOpen(false);
      setLabDirectOrderPatientId(null);
      setLabDirectOrderForm({ test_id: '', referring_doctor: 'Walk-in / Self', priority: 'Routine', clinical_indication: '' });
      await loadAllData();
    } catch (err) {
      showToast('Failed to order lab test', 'error');
    }
  };

  const printOfficialLabReport = (report: any) => {
    const p = patients.find(pat => pat.id === report.patient_id) || {};
    const dateStr = new Date(report.date_conducted).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let rowsHtml = '';
    if (report.results_data && Array.isArray(report.results_data)) {
      rowsHtml = report.results_data.map((r: any) => {
        const flagLower = String(r.flag || '').toLowerCase();
        const isHigh = flagLower.includes('high');
        const isLow = flagLower.includes('low');
        const isCrit = flagLower.includes('critical');

        const bg = isCrit ? '#fee2e2' : isHigh ? '#ffedd5' : isLow ? '#fef3c7' : '#dcfce7';
        const fg = isCrit ? '#991b1b' : isHigh ? '#c2410c' : isLow ? '#b45309' : '#166534';

        return `
          <tr>
            <td><b>${r.parameter || r.test_name}</b></td>
            <td style="font-weight:bold; color: ${fg}">${r.result || r.value}</td>
            <td>${r.unit || '-'}</td>
            <td>${r.range || r.normal_range || '-'}</td>
            <td>
              <span style="padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background: ${bg}; color: ${fg}">
                ${r.flag || 'NORMAL'}
              </span>
            </td>
            <td>${r.remarks || '-'}</td>
          </tr>
        `;
      }).join('');
    } else {
      rowsHtml = `
        <tr>
          <td><b>${report.test_name}</b></td>
          <td><b>${report.result_value}</b></td>
          <td>${report.units || '-'}</td>
          <td>${report.normal_range || '-'}</td>
          <td><span style="padding:3px 8px; background:#dcfce7; color:#166534; font-weight:bold; border-radius:4px; font-size:11px;">NORMAL</span></td>
          <td>${report.remarks || '-'}</td>
        </tr>
      `;
    }

    const html = `
      <html>
        <head>
          <title>Clinical Laboratory Report - ${p.name || 'Patient'}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; background: #fff; }
            .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { color: #1e40af; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
            .sub { color: #64748b; font-size: 12px; margin: 4px 0 0 0; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 20px; background: #f8fafc; font-size: 13px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #1e40af; color: #ffffff; text-align: left; padding: 10px; border: 1px solid #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
            .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block; }
            .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">🏥 MEDBILL PRO ENTERPRISE PATHOLOGY LAB</h1>
              <p class="sub">123 Healthcare Boulevard, Medical District | ISO 15189 Accredited Laboratory</p>
              <p class="sub">Phone: +91 44 2800 9000 | Email: lab@medbillpro.com</p>
            </div>
            <div style="text-align:right">
              <h3 style="margin:0;color:#1e40af;font-size:16px;">OFFICIAL REPORT</h3>
              <p class="sub">Report No: <b>${report.report_number || `#LAB-REP-${report.id}`}</b></p>
              <p class="sub">Version: <b>v${report.version || 1}.0</b></p>
              <span class="badge-verified">✓ ELECTRONICALLY VERIFIED</span>
            </div>
          </div>

          <div class="box">
            <div class="grid-2">
              <div><b>Patient Name:</b> ${p.name || 'N/A'}</div>
              <div><b>Patient ID / UHID:</b> #${report.patient_id} (${p.aadhaar || 'MRN-N/A'})</div>
              <div><b>Age / Gender:</b> ${p.age || '-'} Yrs / ${p.gender || '-'}</div>
              <div><b>Contact:</b> ${p.phone || 'N/A'}</div>
              <div><b>Investigation:</b> ${report.test_name}</div>
              <div><b>Report Date & Time:</b> ${dateStr}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Investigation Parameter</th>
                <th>Observed Result</th>
                <th>Unit</th>
                <th>Biological Reference Range</th>
                <th>Flag</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${report.remarks || report.pathologist_comments ? `
            <div style="margin-top:20px; padding:12px; background:#eff6ff; border-left:4px solid #1e40af; font-size:13px; border-radius:4px;">
              <b>Pathologist Remarks & Impression:</b> ${report.pathologist_comments || report.remarks}
            </div>
          ` : ''}

          <div class="footer">
            <div>
              <p style="margin:2px 0">Tested By: <b>${report.reported_by || 'Senior Technologist'}</b></p>
              <p style="margin:2px 0">Report Status: <b style="color:#10b981">${report.report_status || 'Verified & Published'}</b></p>
            </div>
            <div style="text-align:right">
              <div style="font-family:'Courier New', monospace; font-size:14px; color:#1e40af; font-weight:bold; margin-bottom:4px;">[ELECTRONIC SIGNATURE RECORDED]</div>
              <b>Dr. S. Pathologist MD</b><br/>
              <span>Consultant Pathologist & Lab Director</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: '0 24px 40px' }}>
      {/* Header */}
      <div className="header no-print">
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FlaskConical size={28} color="#3b82f6" /> Enterprise Laboratory & Pathology Workflow
          </h1>
          <p>Order entry, barcoded sample tracking, sample receipt/rejection, dynamic parameter result entry, pathologist verification, and patient trend analysis.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsUploadAttachmentOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Paperclip size={18} /> Upload Lab Attachment
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsLabRegistrationModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
          >
            <Plus size={18} /> Register Walk-in Patient
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {[
          { key: 'orders', label: '📋 Lab Orders & Workflow', icon: <FileText size={16} /> },
          { key: 'samples', label: '🧪 Sample Specimen Tracking', icon: <FlaskConical size={16} /> },
          { key: 'results', label: '📝 Result Entry & Flagging', icon: <Edit size={16} /> },
          { key: 'reports', label: '✅ Pathologist Verification & Reports', icon: <CheckCircle2 size={16} /> },
          { key: 'history', label: '📈 Patient Lab History & Trends', icon: <TrendingUp size={16} /> },
          { key: 'master', label: '⚙️ Test Master Config', icon: <Shield size={16} /> },
          { key: 'dashboard', label: '📊 Operations Dashboard', icon: <Activity size={16} /> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: subTab === tab.key ? '2px solid #3b82f6' : '1px solid var(--border)',
              background: subTab === tab.key ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: subTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* SUB TAB 1: LAB ORDERS & WORKFLOW */}
      {/* ========================================================================= */}
      {subTab === 'orders' && (
        <div>
          {/* Patient Filter Header */}
          <div className="glass-card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr auto', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Search & Filter Patient</label>
                <Select
                  options={patients.map(p => ({ value: p.id, label: `${p.id} - ${p.name} (${p.phone})` }))}
                  value={selectedGlobalLabPatientId ? { value: selectedGlobalLabPatientId, label: `${selectedGlobalLabPatientId} - ${patients.find(p => p.id === selectedGlobalLabPatientId)?.name || ''}` } : null}
                  onChange={(sel: any) => setSelectedGlobalLabPatientId(sel ? sel.value : null)}
                  styles={selectStyles}
                  placeholder="Filter Patient..."
                  isClearable
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search Order #, Patient Name, Doctor, or Test..."
                  value={labSearchQuery}
                  onChange={e => setLabSearchQuery(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                />
                <select
                  value={labFilterStatus}
                  onChange={e => setLabFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Sample Collected">Sample Collected</option>
                  <option value="Sample Received">Sample Received</option>
                  <option value="Result Entered">Result Entered</option>
                  <option value="Verified">Verified</option>
                </select>
              </div>

              <button className="btn btn-secondary" onClick={loadAllData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="glass-card">
            <h3>Active Lab Orders ({labOrders.length})</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Patient</th>
                    <th>Test Name</th>
                    <th>Priority</th>
                    <th>Order Date</th>
                    <th>Referring Doctor</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {labOrders
                    .filter(o => !selectedGlobalLabPatientId || o.patient_id === selectedGlobalLabPatientId)
                    .filter(o => labFilterStatus === 'All' || o.status === labFilterStatus)
                    .filter(o => {
                      if (!labSearchQuery) return true;
                      const q = labSearchQuery.toLowerCase();
                      const patName = patients.find(p => p.id === o.patient_id)?.name?.toLowerCase() || '';
                      const testName = labTestMasters.find(t => t.id === o.test_id)?.test_name?.toLowerCase() || '';
                      const ordNo = (o.order_number || '').toLowerCase();
                      return patName.includes(q) || testName.includes(q) || ordNo.includes(q) || (o.doctor_name || '').toLowerCase().includes(q);
                    })
                    .map(order => {
                      const patient = patients.find(p => p.id === order.patient_id) || {};
                      const test = labTestMasters.find(t => t.id === order.test_id) || {};
                      return (
                        <tr key={order.id}>
                          <td><b>{order.order_number || `ORD-#${order.id}`}</b></td>
                          <td>
                            <div><b>{patient.name || `Patient #${order.patient_id}`}</b></div>
                            <small style={{ color: 'var(--text-muted)' }}>Age: {patient.age} | {patient.gender}</small>
                          </td>
                          <td>
                            <div><b>{test.test_name || 'Lab Test'}</b></div>
                            <small style={{ color: 'var(--text-muted)' }}>Cat: {test.category || 'Pathology'}</small>
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: order.priority === 'STAT' ? '#fee2e2' : order.priority === 'Urgent' ? '#ffedd5' : '#e0f2fe',
                              color: order.priority === 'STAT' ? '#991b1b' : order.priority === 'Urgent' ? '#c2410c' : '#0369a1'
                            }}>
                              {order.priority || 'Routine'}
                            </span>
                          </td>
                          <td>{new Date(order.order_date).toLocaleDateString()}</td>
                          <td>{order.doctor_name || 'Walk-in / Self'}</td>
                          <td>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              background: order.status === 'Verified' ? '#dcfce7' : order.status === 'Sample Collected' ? '#fef3c7' : '#f1f5f9',
                              color: order.status === 'Verified' ? '#15803d' : order.status === 'Sample Collected' ? '#b45309' : '#475569'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => {
                                  setSelectedCollectSampleOrder(order);
                                  setCollectSampleForm({
                                    barcode: `BAR-${Date.now()}`,
                                    collected_by: currentUser?.username || 'Technician',
                                    sample_type: test.sample_type || 'Blood',
                                    container_type: test.container_type || 'EDTA Tube'
                                  });
                                }}
                              >
                                🧪 Collect Sample
                              </button>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => {
                                  setSelectedResultEntryOrder(order);
                                  // Prepopulate parameter row
                                  setResultEntryForm([
                                    { parameter: test.test_name || 'Parameter 1', result: '', unit: test.unit || '', range: test.reference_range || '', flag: 'NORMAL' }
                                  ]);
                                }}
                              >
                                📝 Enter Result
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 2: SAMPLE SPECIMEN TRACKING */}
      {/* ========================================================================= */}
      {subTab === 'samples' && (
        <div className="glass-card">
          <h3>Sample Specimen Tracking & Rejection ({labSamples.length})</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sample Barcode</th>
                  <th>Order Ref</th>
                  <th>Specimen Type</th>
                  <th>Container</th>
                  <th>Collected By</th>
                  <th>Collected Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labSamples.map(sample => (
                  <tr key={sample.id}>
                    <td>
                      <b style={{ fontFamily: 'monospace', fontSize: '14px', color: '#3b82f6' }}>
                        {sample.barcode || `SAMP-${sample.id}`}
                      </b>
                    </td>
                    <td><b>Order #{sample.order_id}</b></td>
                    <td>{sample.sample_type}</td>
                    <td>{sample.container_type || 'EDTA Tube'}</td>
                    <td>{sample.collected_by || 'Phlebotomist'}</td>
                    <td>{sample.collection_date ? new Date(sample.collection_date).toLocaleString() : 'Pending'}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: sample.status === 'Received' ? '#dcfce7' : sample.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: sample.status === 'Received' ? '#15803d' : sample.status === 'Rejected' ? '#991b1b' : '#b45309'
                      }}>
                        {sample.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {sample.status !== 'Received' && sample.status !== 'Rejected' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#10b981', border: 'none' }}
                            onClick={() => handleReceiveSample(sample.id)}
                          >
                            <Check size={12} /> Receive at Lab
                          </button>
                        )}
                        {sample.status !== 'Rejected' && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setSelectedRejectSample(sample)}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 3: RESULT ENTRY & FLAGGING */}
      {/* ========================================================================= */}
      {subTab === 'results' && (
        <div className="glass-card">
          <h3>Worklist Pending Result Entry & Pathologist Signoff</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Select an order from the active workflow list to enter dynamic parameter values.</p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patient Name</th>
                  <th>Test Name</th>
                  <th>Priority</th>
                  <th>Sample Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {labOrders.filter(o => o.status !== 'Verified' && o.status !== 'Published').map(o => (
                  <tr key={o.id}>
                    <td><b>{o.order_number || `ORD-${o.id}`}</b></td>
                    <td>{patients.find(p => p.id === o.patient_id)?.name}</td>
                    <td>{labTestMasters.find(t => t.id === o.test_id)?.test_name}</td>
                    <td><b style={{ color: o.priority === 'STAT' ? '#ef4444' : '#3b82f6' }}>{o.priority}</b></td>
                    <td>{o.status}</td>
                    <td>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setSelectedResultEntryOrder(o);
                          const t = labTestMasters.find(tm => tm.id === o.test_id);
                          setResultEntryForm([
                            { parameter: t?.test_name || 'Parameter 1', result: '', unit: t?.unit || '', range: t?.reference_range || '', flag: 'NORMAL' }
                          ]);
                        }}
                      >
                        📝 Open Result Entry Form
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 4: PATHOLOGIST VERIFICATION & REPORTS */}
      {/* ========================================================================= */}
      {subTab === 'reports' && (
        <div className="glass-card">
          <h3>Finalized & Verified Pathology Reports ({labReports.length})</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Report #</th>
                  <th>Patient</th>
                  <th>Test Name</th>
                  <th>Conducted Date</th>
                  <th>Report Status</th>
                  <th>Version</th>
                  <th>Pathologist Verification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labReports.map(report => {
                  const patient = patients.find(p => p.id === report.patient_id) || {};
                  return (
                    <tr key={report.id}>
                      <td><b>{report.report_number || `#LAB-REP-${report.id}`}</b></td>
                      <td><b>{patient.name}</b> (ID: {report.patient_id})</td>
                      <td><b>{report.test_name}</b></td>
                      <td>{new Date(report.date_conducted).toLocaleString()}</td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          background: report.is_verified ? '#dcfce7' : '#fef3c7',
                          color: report.is_verified ? '#15803d' : '#b45309'
                        }}>
                          {report.report_status || (report.is_verified ? 'Verified' : 'Draft')}
                        </span>
                      </td>
                      <td><b style={{ color: '#8b5cf6' }}>v{report.version || 1}.0</b></td>
                      <td>
                        {report.is_verified ? (
                          <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Signed by {report.verified_by || 'Pathologist'}
                          </span>
                        ) : (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => handleVerifyLabReport(report.id)}
                          >
                            ✍️ Pathologist Verify & Sign
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => printOfficialLabReport(report)}
                          >
                            <Printer size={14} /> Print Report
                          </button>
                          {report.is_verified && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '11px', background: '#f59e0b', color: '#fff' }}
                              onClick={() => {
                                setSelectedReviseReport(report);
                                setResultEntryForm(report.results_data || []);
                              }}
                            >
                              ✏️ Correction / Revision
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 5: PATIENT LAB HISTORY & TRENDS */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="glass-card">
          <h3>📈 Chronological Patient Lab History & Trend Analysis</h3>
          <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
            <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Select Patient to View History</label>
            <Select
              options={patients.map(p => ({ value: p.id, label: `${p.id} - ${p.name} (${p.phone})` }))}
              value={selectedGlobalLabPatientId ? { value: selectedGlobalLabPatientId, label: `${selectedGlobalLabPatientId} - ${patients.find(p => p.id === selectedGlobalLabPatientId)?.name || ''}` } : null}
              onChange={(sel: any) => setSelectedGlobalLabPatientId(sel ? sel.value : null)}
              styles={selectStyles}
              placeholder="Select Patient..."
            />
          </div>

          {selectedGlobalLabPatientId ? (
            <div>
              <h4>Parameter Result Trend Points ({patientLabTrendsData.length})</h4>
              <div className="table-container" style={{ marginBottom: '24px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Investigation Name</th>
                      <th>Parameter Name</th>
                      <th>Observed Value</th>
                      <th>Unit</th>
                      <th>Biological Reference Range</th>
                      <th>Flag Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientLabTrendsData.map((pt, i) => (
                      <tr key={i}>
                        <td>{pt.date}</td>
                        <td><b>{pt.test_name}</b></td>
                        <td>{pt.parameter}</td>
                        <td><b style={{ color: pt.flag === 'HIGH' ? '#ef4444' : pt.flag === 'LOW' ? '#f59e0b' : 'inherit' }}>{pt.value}</b></td>
                        <td>{pt.unit}</td>
                        <td>{pt.normal_range}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: pt.flag === 'HIGH' ? '#fee2e2' : pt.flag === 'LOW' ? '#ffedd5' : '#dcfce7',
                            color: pt.flag === 'HIGH' ? '#991b1b' : pt.flag === 'LOW' ? '#c2410c' : '#15803d'
                          }}>
                            {pt.flag || 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {patientLabTrendsData.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No numerical trend records found for this patient.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Please select a patient from the dropdown above to view historical lab trends.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 6: TEST MASTER CONFIG */}
      {/* ========================================================================= */}
      {subTab === 'master' && (
        <div className="grid-2">
          <div className="glass-card">
            <h3>{selectedTestMasterId ? 'Edit Lab Test Master' : 'Add New Lab Test Master'}</h3>
            <form onSubmit={handleSaveLabTestMaster}>
              <div className="form-grid">
                <div className="form-group"><label>Test Code *</label><input type="text" required value={labTestMasterForm.test_code} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, test_code: e.target.value })} /></div>
                <div className="form-group"><label>Test Name *</label><input type="text" required value={labTestMasterForm.test_name} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, test_name: e.target.value })} /></div>
                <div className="form-group"><label>Category</label><select value={labTestMasterForm.category} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, category: e.target.value })}><option>Pathology</option><option>Biochemistry</option><option>Microbiology</option><option>Radiology</option></select></div>
                <div className="form-group"><label>Department</label><input type="text" value={labTestMasterForm.department} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, department: e.target.value })} /></div>
                <div className="form-group"><label>Sample Type</label><input type="text" value={labTestMasterForm.sample_type} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, sample_type: e.target.value })} placeholder="Blood, Urine..." /></div>
                <div className="form-group"><label>Container Type</label><input type="text" value={labTestMasterForm.container_type} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, container_type: e.target.value })} placeholder="EDTA Tube, Serum Gel..." /></div>
                <div className="form-group"><label>Method</label><input type="text" value={labTestMasterForm.method} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, method: e.target.value })} placeholder="Automated Analyzer..." /></div>
                <div className="form-group"><label>Unit</label><input type="text" value={labTestMasterForm.unit} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, unit: e.target.value })} placeholder="g/dL, mg/dL..." /></div>
                <div className="form-group"><label>Normal Range (Male)</label><input type="text" value={labTestMasterForm.normal_range_male} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, normal_range_male: e.target.value })} /></div>
                <div className="form-group"><label>Normal Range (Female)</label><input type="text" value={labTestMasterForm.normal_range_female} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, normal_range_female: e.target.value })} /></div>
                <div className="form-group"><label>Price (₹) *</label><input type="number" required value={labTestMasterForm.price} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, price: Number(e.target.value) })} /></div>
                <div className="form-group"><label>TAT (Hours)</label><input type="number" value={labTestMasterForm.tat_hours} onChange={e => setLabTestMasterForm({ ...labTestMasterForm, tat_hours: Number(e.target.value) })} /></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '15px' }}>
                {selectedTestMasterId ? 'Update Test' : 'Save Test'}
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3>Configured Lab Tests ({labTestMasters.length})</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
                <tbody>
                  {labTestMasters.map(t => (
                    <tr key={t.id}>
                      <td><b>{t.test_code}</b></td>
                      <td>{t.test_name}</td>
                      <td>{t.category}</td>
                      <td>₹{t.price}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => handleEditLabTestMaster(t)}><Edit size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 7: OPERATIONS DASHBOARD */}
      {/* ========================================================================= */}
      {subTab === 'dashboard' && (
        <div>
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div><label>Pending Orders</label><div className="stat-val" style={{ color: '#3b82f6' }}>{labOrders.filter(o => o.status === 'Pending').length}</div></div>
            </div>
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div><label>Samples Collected</label><div className="stat-val" style={{ color: '#f59e0b' }}>{labSamples.length}</div></div>
            </div>
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div><label>Completed & Verified</label><div className="stat-val" style={{ color: '#10b981' }}>{labReports.length}</div></div>
            </div>
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <div><label>Test Masters</label><div className="stat-val" style={{ color: '#8b5cf6' }}>{labTestMasters.length}</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* REJECT SAMPLE MODAL */}
      {selectedRejectSample && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '450px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setSelectedRejectSample(null)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ margin: '0 0 16px 0', color: '#ef4444' }}>Reject Sample Specimen</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sample Barcode: <b>{selectedRejectSample.barcode}</b></p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Rejection Reason *</label>
              <textarea
                rows={3}
                required
                placeholder="Hemolyzed specimen, Insufficient volume, Clotted sample..."
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleRejectSampleSubmit}>
              Log Audit & Reject Specimen
            </button>
          </div>
        </div>
      )}

      {/* REVISE / CORRECTION REPORT MODAL */}
      {selectedReviseReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '500px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setSelectedReviseReport(null)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b' }}>Correction / Revision for Report #{selectedReviseReport.report_number}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Updating published result will increment report version to <b>v{selectedReviseReport.version + 1}.0</b> and log an immutable version snapshot.</p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Mandatory Revision Reason *</label>
              <textarea
                rows={3}
                required
                placeholder="Clinical correction based on re-testing..."
                value={revisionReasonInput}
                onChange={e => setRevisionReasonInput(e.target.value)}
                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', background: '#f59e0b', border: 'none' }} onClick={handleReviseReportSubmit}>
              Submit Revision & Create Version Snapshot
            </button>
          </div>
        </div>
      )}

      {/* UPLOAD ATTACHMENT MODAL */}
      {isUploadAttachmentOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '450px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setIsUploadAttachmentOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Upload External Lab Document / Attachment</h3>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Select File (PDF, Image, Scan)</label>
              <input type="file" onChange={e => setSelectedAttachmentFile(e.target.files ? e.target.files[0] : null)} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleFileUploadSubmit}>
              Upload File Attachment
            </button>
          </div>
        </div>
      )}

      {/* WALK-IN REGISTRATION MODAL */}
      {isLabRegistrationModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '700px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setIsLabRegistrationModalOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ margin: '0 0 16px 0', color: '#10b981' }}>Register Walk-in Lab Patient</h2>
            <form onSubmit={handleLabWalkinRegistration}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group"><label>Patient Name *</label><input type="text" value={patientForm.name} onChange={e => setPatientForm({ ...patientForm, name: e.target.value })} required /></div>
                <div className="form-group"><label>Age *</label><input type="number" value={patientForm.age || ''} onChange={e => setPatientForm({ ...patientForm, age: Number(e.target.value) })} required /></div>
                <div className="form-group"><label>Gender *</label><select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div className="form-group"><label>Phone *</label><input type="text" value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} required /></div>
                <div className="form-group"><label>Blood Group</label><select value={patientForm.blood_group} onChange={e => setPatientForm({ ...patientForm, blood_group: e.target.value })}><option>A+</option><option>B+</option><option>O+</option><option>AB+</option></select></div>
                <div className="form-group"><label>UHID / Aadhaar</label><input type="text" value={patientForm.aadhaar} onChange={e => setPatientForm({ ...patientForm, aadhaar: e.target.value })} /></div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', width: '100%' }}>Register & Continue to Test Selection</button>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT LAB ORDER MODAL */}
      {isLabOrderModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '500px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setIsLabOrderModalOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Direct Lab Order for Patient #{labDirectOrderPatientId}</h2>
            <form onSubmit={handleCreateDirectLabOrder}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Select Lab Test *</label>
                <select value={labDirectOrderForm.test_id} onChange={e => setLabDirectOrderForm({ ...labDirectOrderForm, test_id: e.target.value })} required style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="">-- Choose Test --</option>
                  {labTestMasters.map(t => (
                    <option key={t.id} value={t.id}>{t.test_name} (₹{t.price})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Referring Doctor</label>
                <input type="text" value={labDirectOrderForm.referring_doctor} onChange={e => setLabDirectOrderForm({ ...labDirectOrderForm, referring_doctor: e.target.value })} style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Order</button>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT SAMPLE MODAL */}
      {selectedCollectSampleOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '500px', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button onClick={() => setSelectedCollectSampleOrder(null)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Collect Specimen Sample</h2>
            <div className="form-group" style={{ marginBottom: '12px' }}><label>Sample Type</label><input type="text" value={collectSampleForm.sample_type} onChange={e => setCollectSampleForm({ ...collectSampleForm, sample_type: e.target.value })} /></div>
            <div className="form-group" style={{ marginBottom: '12px' }}><label>Container Type</label><input type="text" placeholder="e.g. EDTA Tube, Plain Serum" value={collectSampleForm.container_type} onChange={e => setCollectSampleForm({ ...collectSampleForm, container_type: e.target.value })} /></div>
            <div className="form-group" style={{ marginBottom: '12px' }}><label>Barcode</label><input type="text" value={collectSampleForm.barcode} onChange={e => setCollectSampleForm({ ...collectSampleForm, barcode: e.target.value })} /></div>
            <div className="form-group" style={{ marginBottom: '16px' }}><label>Collector Name</label><input type="text" value={collectSampleForm.collected_by} onChange={e => setCollectSampleForm({ ...collectSampleForm, collected_by: e.target.value })} /></div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveCollectSample}>Save & Mark Sample Collected</button>
          </div>
        </div>
      )}

      {/* RESULT ENTRY MODAL */}
      {selectedResultEntryOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', width: '800px', borderRadius: '12px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setSelectedResultEntryOrder(null)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ margin: '0 0 16px 0', color: '#10b981' }}>Enter & Verify Lab Test Results</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <b>Patient:</b> {patients.find(p => p.id === selectedResultEntryOrder.patient_id)?.name} | <b>Test:</b> {labTestMasters.find(t => t.id === selectedResultEntryOrder.test_id)?.test_name}
            </div>

            <table style={{ width: '100%', marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Ref Range</th>
                  <th>Flag</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {resultEntryForm.map((row, idx) => (
                  <tr key={idx}>
                    <td><input type="text" value={row.parameter} onChange={e => { const copy = [...resultEntryForm]; copy[idx].parameter = e.target.value; setResultEntryForm(copy); }} style={{ padding: '4px', width: '100%' }} /></td>
                    <td><input type="text" value={row.result} onChange={e => { const copy = [...resultEntryForm]; copy[idx].result = e.target.value; setResultEntryForm(copy); }} style={{ padding: '4px', width: '100%', fontWeight: 'bold' }} /></td>
                    <td><input type="text" value={row.unit} onChange={e => { const copy = [...resultEntryForm]; copy[idx].unit = e.target.value; setResultEntryForm(copy); }} style={{ padding: '4px', width: '100%' }} /></td>
                    <td><input type="text" value={row.range} onChange={e => { const copy = [...resultEntryForm]; copy[idx].range = e.target.value; setResultEntryForm(copy); }} style={{ padding: '4px', width: '100%' }} /></td>
                    <td>
                      <select value={row.flag} onChange={e => { const copy = [...resultEntryForm]; copy[idx].flag = e.target.value; setResultEntryForm(copy); }}>
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High 🔺</option>
                        <option value="LOW">Low 🔻</option>
                        <option value="CRITICAL_HIGH">Critical High 🚨</option>
                        <option value="CRITICAL_LOW">Critical Low 🚨</option>
                      </select>
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: '4px' }} onClick={() => setResultEntryForm(resultEntryForm.filter((_, i) => i !== idx))}><X size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="btn btn-secondary" style={{ marginBottom: '20px' }} onClick={() => setResultEntryForm([...resultEntryForm, { parameter: '', result: '', unit: '', range: '', flag: 'NORMAL' }])}>
              + Add Parameter Row
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleSaveResultEntry(false)}>Save Draft</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSaveResultEntry(true)}>Submit to Pathologist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
