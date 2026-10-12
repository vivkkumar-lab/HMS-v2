import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileDigit, Plus, Search, Filter, Eye, Edit, Trash2, Download, UploadCloud,
  FileText, Activity, Clock, User, Calendar, CheckCircle2, ChevronRight,
  AlertTriangle, RefreshCw, X, Shield, ArrowRight, ArrowLeftRight, FileCheck
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

export interface ScanModuleProps {
  API_BASE: string;
  patients: any[];
  scanRecords: any[];
  scanTypesMaster: any[];
  scanSubTab: 'list' | 'entry' | 'analysis' | 'comparison' | 'master';
  setScanSubTab: (tab: 'list' | 'entry' | 'analysis' | 'comparison' | 'master') => void;
  selectedScanRecord: any | null;
  setSelectedScanRecord: (scan: any | null) => void;
  selectedViewScan: any | null;
  setSelectedViewScan: (scan: any | null) => void;
  currentUser: any | null;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  loadScanRecords: () => Promise<void>;
  loadScanTypesMaster: () => Promise<void>;
  initialPatientId?: number | null;
}

export default function ScanModule({
  API_BASE,
  patients,
  scanRecords,
  scanTypesMaster,
  scanSubTab,
  setScanSubTab,
  selectedScanRecord,
  setSelectedScanRecord,
  selectedViewScan,
  setSelectedViewScan,
  currentUser,
  showToast,
  loadScanRecords,
  loadScanTypesMaster,
  initialPatientId
}: ScanModuleProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScanType, setFilterScanType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDoctor, setFilterDoctor] = useState('');

  // Form State Mode
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Analysis State
  const [analysisPatientId, setAnalysisPatientId] = useState<number | null>(initialPatientId || null);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Comparison State
  const [scanAId, setScanAId] = useState<number | ''>('');
  const [scanBId, setScanBId] = useState<number | ''>('');
  const [scanA, setScanA] = useState<any | null>(null);
  const [scanB, setScanB] = useState<any | null>(null);

  // Master Scan Type Form
  const [newMasterTypeForm, setNewMasterTypeForm] = useState({ code: '', name: '', description: '' });

  // Main Form State (Sections A - F)
  const [form, setForm] = useState({
    id: 0,
    patient_id: (initialPatientId || '') as number | '',
    scan_type: 'MRI',
    scan_name: '',
    scan_date: new Date().toISOString().split('T')[0],
    scan_time: '10:00 AM',
    referred_by_doctor: '',
    department: 'Radiology & Imaging',
    hospital_location: 'Main Block - Radiology Wing',
    technician_name: '',
    radiologist_name: '',
    scan_status: 'Completed',

    clinical_history: '',
    chief_complaint: '',
    symptoms: '',
    provisional_diagnosis: '',
    indication_for_scan: '',
    relevant_medical_history: '',
    previous_scan_reference: '',

    report_title: '',
    report_number: '',
    report_date: new Date().toISOString().split('T')[0],
    reported_by: '',
    verified_by: '',
    report_status: 'Completed',
    doctor_comments: '',

    findings: '',
    observations: '',
    impression: '',
    diagnosis: '',
    follow_up_required: false,
    follow_up_date: '',

    measurements: [
      { parameter: 'Lesion Size', value: '', unit: 'mm', previous_value: '', trend: 'Unchanged' }
    ],
    abnormalities: [''],
    recommendations: ['Follow-up scan in 6 months'],
    organ_specific_findings: { Brain: '', Spine: '', Lung: '', Abdomen: '', Heart: '' } as Record<string, string>
  });

  useEffect(() => {
    if (scanTypesMaster.length > 0 && !form.scan_type) {
      setForm(prev => ({ ...prev, scan_type: scanTypesMaster[0].name }));
    }
  }, [scanTypesMaster]);

  useEffect(() => {
    if (initialPatientId) {
      setForm(prev => ({ ...prev, patient_id: initialPatientId }));
      loadAnalysisForPatient(initialPatientId);
    }
  }, [initialPatientId]);

  // Handler to load patient analysis
  const loadAnalysisForPatient = async (patientId: number) => {
    setAnalysisPatientId(patientId);
    setAnalysisLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/patients/${patientId}/analysis`);
      setAnalysisData(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to load scan analysis for patient", "error");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Populate comparison scans when dropdown selection changes
  useEffect(() => {
    if (scanAId) {
      const found = scanRecords.find(s => s.id === Number(scanAId));
      setScanA(found || null);
    } else {
      setScanA(null);
    }
  }, [scanAId, scanRecords]);

  useEffect(() => {
    if (scanBId) {
      const found = scanRecords.find(s => s.id === Number(scanBId));
      setScanB(found || null);
    } else {
      setScanB(null);
    }
  }, [scanBId, scanRecords]);

  const handleStartNewScan = (patientId?: number) => {
    setFormMode('create');
    setSelectedScanRecord(null);
    setForm({
      id: 0,
      patient_id: patientId || (selectedScanRecord ? selectedScanRecord.patient_id : ''),
      scan_type: scanTypesMaster[0]?.name || 'MRI',
      scan_name: '',
      scan_date: new Date().toISOString().split('T')[0],
      scan_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      referred_by_doctor: currentUser?.role === 'Doctor' ? `Dr. ${currentUser.username}` : '',
      department: 'Radiology & Imaging',
      hospital_location: 'Main Block - Radiology Wing',
      technician_name: '',
      radiologist_name: '',
      scan_status: 'Completed',

      clinical_history: '',
      chief_complaint: '',
      symptoms: '',
      provisional_diagnosis: '',
      indication_for_scan: '',
      relevant_medical_history: '',
      previous_scan_reference: '',

      report_title: '',
      report_number: `REP-${Math.floor(100000 + Math.random() * 900000)}`,
      report_date: new Date().toISOString().split('T')[0],
      reported_by: currentUser?.username || '',
      verified_by: '',
      report_status: 'Completed',
      doctor_comments: '',

      findings: '',
      observations: '',
      impression: '',
      diagnosis: '',
      follow_up_required: false,
      follow_up_date: '',

      measurements: [{ parameter: 'Lesion Size', value: '', unit: 'mm', previous_value: '', trend: 'Unchanged' }],
      abnormalities: [''],
      recommendations: ['Follow-up scan in 6 months'],
      organ_specific_findings: { Brain: '', Spine: '', Lung: '', Abdomen: '', Heart: '' }
    });
    setScanSubTab('entry');
  };

  const handleEditScan = (scan: any) => {
    setFormMode('edit');
    setSelectedScanRecord(scan);
    setForm({
      id: scan.id,
      patient_id: scan.patient_id,
      scan_type: scan.scan_type,
      scan_name: scan.scan_name,
      scan_date: scan.scan_date,
      scan_time: scan.scan_time || '10:00 AM',
      referred_by_doctor: scan.referred_by_doctor || '',
      department: scan.department || 'Radiology',
      hospital_location: scan.hospital_location || 'Main Block - Radiology Wing',
      technician_name: scan.technician_name || '',
      radiologist_name: scan.radiologist_name || '',
      scan_status: scan.scan_status,

      clinical_history: scan.clinical_history || '',
      chief_complaint: scan.chief_complaint || '',
      symptoms: scan.symptoms || '',
      provisional_diagnosis: scan.provisional_diagnosis || '',
      indication_for_scan: scan.indication_for_scan || '',
      relevant_medical_history: scan.relevant_medical_history || '',
      previous_scan_reference: scan.previous_scan_reference || '',

      report_title: scan.report_title || '',
      report_number: scan.report_number || '',
      report_date: scan.report_date || scan.scan_date,
      reported_by: scan.reported_by || '',
      verified_by: scan.verified_by || '',
      report_status: scan.report_status || 'Completed',
      doctor_comments: scan.doctor_comments || '',

      findings: scan.findings?.findings || '',
      observations: scan.findings?.observations || '',
      impression: scan.findings?.impression || '',
      diagnosis: scan.findings?.diagnosis || '',
      follow_up_required: scan.findings?.follow_up_required || false,
      follow_up_date: scan.findings?.follow_up_date || '',

      measurements: scan.findings?.measurements && scan.findings.measurements.length > 0
        ? scan.findings.measurements
        : [{ parameter: 'Lesion Size', value: '', unit: 'mm', previous_value: '', trend: 'Unchanged' }],
      abnormalities: scan.findings?.abnormalities && scan.findings.abnormalities.length > 0
        ? scan.findings.abnormalities
        : [''],
      recommendations: scan.findings?.recommendations && scan.findings.recommendations.length > 0
        ? scan.findings.recommendations
        : ['Follow-up in 6 months'],
      organ_specific_findings: scan.findings?.organ_specific_findings || { Brain: '', Spine: '', Lung: '', Abdomen: '', Heart: '' }
    });
    setScanSubTab('entry');
  };

  const handleSaveScanRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.scan_name || !form.scan_date) {
      return showToast("Patient ID, Scan Name, and Scan Date are mandatory", "error");
    }

    try {
      const payload = {
        patient_id: Number(form.patient_id),
        scan_type: form.scan_type,
        scan_name: form.scan_name,
        scan_date: form.scan_date,
        scan_time: form.scan_time,
        referred_by_doctor: form.referred_by_doctor || null,
        department: form.department || null,
        hospital_location: form.hospital_location || null,
        technician_name: form.technician_name || null,
        radiologist_name: form.radiologist_name || null,
        scan_status: form.scan_status,

        clinical_history: form.clinical_history || null,
        chief_complaint: form.chief_complaint || null,
        symptoms: form.symptoms || null,
        provisional_diagnosis: form.provisional_diagnosis || null,
        indication_for_scan: form.indication_for_scan || null,
        relevant_medical_history: form.relevant_medical_history || null,
        previous_scan_reference: form.previous_scan_reference || null,

        report_title: form.report_title || null,
        report_number: form.report_number || null,
        report_date: form.report_date || null,
        reported_by: form.reported_by || null,
        verified_by: form.verified_by || null,
        report_status: form.report_status,
        doctor_comments: form.doctor_comments || null,

        findings: {
          findings: form.findings || null,
          observations: form.observations || null,
          measurements: form.measurements.filter(m => m.parameter.trim() !== ''),
          abnormalities: form.abnormalities.filter(a => a.trim() !== ''),
          organ_specific_findings: form.organ_specific_findings,
          impression: form.impression || null,
          diagnosis: form.diagnosis || null,
          recommendations: form.recommendations.filter(r => r.trim() !== ''),
          follow_up_required: form.follow_up_required,
          follow_up_date: form.follow_up_date || null
        }
      };

      let res;
      if (formMode === 'create') {
        res = await axios.post(`${API_BASE}/scans/`, payload);
        showToast("Scan record created successfully!", "success");
      } else {
        res = await axios.put(`${API_BASE}/scans/${form.id}`, payload);
        showToast("Scan record updated successfully!", "success");
      }

      setSelectedScanRecord(res.data);
      await loadScanRecords();
      setScanSubTab('list');
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to save scan record", "error");
    }
  };

  const handleUploadAttachment = async (scanId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('file_category', files[i].type.includes('pdf') ? 'report' : 'scan');
        await axios.post(`${API_BASE}/scans/${scanId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      showToast("Attachments uploaded successfully!", "success");
      const updated = await axios.get(`${API_BASE}/scans/${scanId}`);
      setSelectedScanRecord(updated.data);
      await loadScanRecords();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to upload file attachment", "error");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (scanId: number, attachmentId: number) => {
    try {
      await axios.delete(`${API_BASE}/scans/${scanId}/attachments/${attachmentId}`);
      showToast("Attachment removed", "success");
      const updated = await axios.get(`${API_BASE}/scans/${scanId}`);
      setSelectedScanRecord(updated.data);
      await loadScanRecords();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to delete attachment", "error");
    }
  };

  const handleDeleteScanRecord = async (scanId: number) => {
    if (!window.confirm("Are you sure you want to cancel this scan record?")) return;
    try {
      await axios.delete(`${API_BASE}/scans/${scanId}`);
      showToast("Scan record cancelled", "success");
      await loadScanRecords();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to delete scan record", "error");
    }
  };

  const handleCreateMasterScanType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMasterTypeForm.code || !newMasterTypeForm.name) {
      return showToast("Scan type code and name are required", "error");
    }
    try {
      await axios.post(`${API_BASE}/scan-types/`, newMasterTypeForm);
      showToast("New Scan Type added to master list!", "success");
      setNewMasterTypeForm({ code: '', name: '', description: '' });
      await loadScanTypesMaster();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to create scan type", "error");
    }
  };

  // Filtered scans
  const filteredScans = scanRecords.filter(s => {
    const patientName = s.patient?.name?.toLowerCase() || '';
    const patientId = String(s.patient_id);
    const uhid = s.patient?.aadhaar?.toLowerCase() || '';
    const scanNumber = s.scan_number?.toLowerCase() || '';
    const doctor = s.referred_by_doctor?.toLowerCase() || '';
    const scanName = s.scan_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = patientName.includes(query) || patientId.includes(query) || uhid.includes(query) || scanNumber.includes(query) || doctor.includes(query) || scanName.includes(query);
    const matchesType = filterScanType === 'All' || s.scan_type === filterScanType;
    const matchesStatus = filterStatus === 'All' || s.scan_status === filterStatus;
    const matchesDoctor = !filterDoctor || doctor.includes(filterDoctor.toLowerCase());

    return matchesSearch && matchesType && matchesStatus && matchesDoctor;
  });

  const selectedPatient = patients.find(p => p.id === Number(form.patient_id));

  const printReport = (scan: any) => {
    const p = scan.patient || {};
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Radiology Report - ${scan.scan_number}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .hospital-title { color: #1e40af; font-size: 24px; font-weight: bold; margin: 0; }
            .sub-title { color: #64748b; font-size: 14px; margin: 4px 0 0 0; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #f8fafc; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
            .section-header { font-size: 16px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #e2e8f0; color: #334155; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; justify-content: space-between; font-size: 13px; color: #64748b; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="hospital-title">🏥 MEDBILL PRO RADIOLOGY & IMAGING</h1>
              <p class="sub-title">123 Healthcare Street, Chennai - 600001 | Phone: +91 99999 99999</p>
            </div>
            <div style="text-align:right">
              <h3 style="margin:0;color:#3b82f6">DEPARTMENT OF RADIOLOGY</h3>
              <p class="sub-title">Scan #: <b>${scan.scan_number}</b></p>
            </div>
          </div>

          <div class="box">
            <div class="grid-2">
              <div><b>Patient Name:</b> ${p.name || 'N/A'}</div>
              <div><b>Patient ID / UHID:</b> #${scan.patient_id} / ${p.aadhaar || 'N/A'}</div>
              <div><b>Age / Gender:</b> ${p.age || '-'} Yrs / ${p.gender || '-'}</div>
              <div><b>Scan Type & Name:</b> ${scan.scan_type} — ${scan.scan_name}</div>
              <div><b>Referred Doctor:</b> Dr. ${scan.referred_by_doctor || 'Walk-in'}</div>
              <div><b>Scan Date & Time:</b> ${scan.scan_date} ${scan.scan_time || ''}</div>
              <div><b>Report Date:</b> ${scan.report_date || scan.scan_date}</div>
              <div><b>Radiologist:</b> Dr. ${scan.radiologist_name || 'Department Head'}</div>
            </div>
          </div>

          <div class="section-header">CLINICAL HISTORY & INDICATION</div>
          <p>${scan.clinical_history || scan.indication_for_scan || 'No clinical history provided.'}</p>

          <div class="section-header">SCAN FINDINGS & OBSERVATIONS</div>
          <p style="white-space: pre-wrap;">${scan.findings?.findings || scan.findings?.observations || 'Findings within normal parameters.'}</p>

          ${scan.findings?.measurements && scan.findings.measurements.length > 0 ? `
            <div class="section-header">QUANTITATIVE MEASUREMENTS</div>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Current Value</th>
                  <th>Unit</th>
                  <th>Previous Value</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                ${scan.findings.measurements.map((m: any) => `
                  <tr>
                    <td>${m.parameter}</td>
                    <td><b>${m.value}</b></td>
                    <td>${m.unit || '-'}</td>
                    <td>${m.previous_value || 'N/A'}</td>
                    <td>${m.trend || 'Unchanged'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="section-header">IMPRESSION & CONCLUSION</div>
          <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:12px; margin-top:10px; font-weight:bold; color:#1e3a8a;">
            ${scan.findings?.impression || 'No acute abnormality detected.'}
          </div>

          ${scan.findings?.recommendations && scan.findings.recommendations.length > 0 ? `
            <div class="section-header">RECOMMENDATIONS</div>
            <ul>
              ${scan.findings.recommendations.map((r: any) => `<li>${r}</li>`).join('')}
            </ul>
          ` : ''}

          <div class="footer">
            <div>
              <p>Technician: ${scan.technician_name || 'Radiology Staff'}</p>
              <p>Verified By: ${scan.verified_by || 'Senior Radiologist'}</p>
            </div>
            <div style="text-align:right">
              <br/>
              <b>Dr. ${scan.radiologist_name || 'Radiology Consultant'}</b><br/>
              <span>MD Radiology (Senior Radiologist)</span>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: '0 24px 40px' }}>
      {/* Module Title Header */}
      <div className="header no-print">
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileDigit size={28} color="#3b82f6" /> Scan & Radiology Investigation Module
          </h1>
          <p>Complete permanent scan records, multi-section findings entry, patient history analysis, and side-by-side scan comparison.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleStartNewScan()}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> New Scan Record
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        {[
          { key: 'list', label: '📋 Scan Records List', icon: <FileText size={16} /> },
          { key: 'entry', label: formMode === 'create' ? '➕ New Scan Form' : '✏️ Edit Scan Form', icon: <Edit size={16} /> },
          { key: 'analysis', label: '📊 Patient Analysis View', icon: <Activity size={16} /> },
          { key: 'comparison', label: '🔄 Dual Scan Comparison', icon: <ArrowLeftRight size={16} /> },
          { key: 'master', label: '⚙️ Scan Types Master', icon: <Shield size={16} /> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setScanSubTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: scanSubTab === tab.key ? '2px solid #3b82f6' : '1px solid var(--border)',
              background: scanSubTab === tab.key ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: scanSubTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
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
      {/* SUB TAB 1: SCAN RECORDS LIST */}
      {/* ========================================================================= */}
      {scanSubTab === 'list' && (
        <div>
          {/* Filters Bar */}
          <div className="glass-card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search Patient Name, ID, UHID, Scan #, Doctor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <select
                  value={filterScanType}
                  onChange={e => setFilterScanType(e.target.value)}
                  style={{ width: '100%', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 8px' }}
                >
                  <option value="All">All Scan Types</option>
                  {scanTypesMaster.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ width: '100%', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 8px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Completed">Completed</option>
                  <option value="Verified">Verified</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Filter Doctor..."
                  value={filterDoctor}
                  onChange={e => setFilterDoctor(e.target.value)}
                  style={{ width: '100%', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 12px' }}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => { setSearchQuery(''); setFilterScanType('All'); setFilterStatus('All'); setFilterDoctor(''); }}
                style={{ height: '40px' }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Table of Scan Records */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Scan Investigation Records ({filteredScans.length})</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing newest records first</span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Scan # & Date</th>
                    <th>Patient Details</th>
                    <th>Scan Type & Name</th>
                    <th>Doctor & Dept</th>
                    <th>Status</th>
                    <th>Impression / Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScans.map(scan => (
                    <tr key={scan.id}>
                      <td>
                        <div style={{ fontWeight: 'bold', color: '#3b82f6' }}>{scan.scan_number}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{scan.scan_date} {scan.scan_time}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{scan.patient?.name || `Patient #${scan.patient_id}`}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          ID: #{scan.patient_id} | {scan.patient?.gender} {scan.patient?.age}y | UHID: {scan.patient?.aadhaar || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {scan.scan_type}
                        </span>
                        <div style={{ fontWeight: 500, marginTop: '4px' }}>{scan.scan_name}</div>
                      </td>
                      <td>
                        <div>Dr. {scan.referred_by_doctor || 'Self'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{scan.department || 'Radiology'}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: scan.scan_status === 'Verified' ? 'rgba(16, 185, 129, 0.15)' : scan.scan_status === 'Completed' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: scan.scan_status === 'Verified' ? '#10b981' : scan.scan_status === 'Completed' ? '#3b82f6' : '#f59e0b'
                        }}>
                          {scan.scan_status}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={scan.findings?.impression}>
                          {scan.findings?.impression || scan.findings?.diagnosis || 'No impression recorded'}
                        </div>
                        {scan.attachments && scan.attachments.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📎 {scan.attachments.length} attachment(s)
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="View Printable Report"
                            onClick={() => setSelectedViewScan(scan)}
                          >
                            <Eye size={14} /> Report
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Edit Scan Details"
                            onClick={() => handleEditScan(scan)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                            title="Patient Analysis View"
                            onClick={() => loadAnalysisForPatient(scan.patient_id).then(() => setScanSubTab('analysis'))}
                          >
                            <Activity size={14} /> Analysis
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Cancel / Soft Delete"
                            onClick={() => handleDeleteScanRecord(scan.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredScans.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No scan records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 2: NEW / EDIT MULTI-SECTION SCAN ENTRY FORM (SECTIONS A - F) */}
      {/* ========================================================================= */}
      {scanSubTab === 'entry' && (
        <form onSubmit={handleSaveScanRecord}>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileDigit size={20} /> Section A: Patient Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Search & Select Patient *</label>
                <Select
                  options={patients.map(p => ({ value: p.id, label: `${p.id} - ${p.name} (${p.phone})` }))}
                  value={form.patient_id ? { value: Number(form.patient_id), label: `${form.patient_id} - ${patients.find(p => p.id === Number(form.patient_id))?.name || 'Selected'}` } : null}
                  onChange={(sel: any) => setForm({ ...form, patient_id: sel ? sel.value : '' })}
                  styles={selectStyles}
                  placeholder="Search Patient by Name / ID / Phone..."
                  isClearable
                />
              </div>

              {selectedPatient ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div><small style={{ color: 'var(--text-muted)' }}>Patient Name</small><br /><b>{selectedPatient.name}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>ID / UHID</small><br /><b>#{selectedPatient.id} / {selectedPatient.aadhaar || 'N/A'}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>Age / Gender</small><br /><b>{selectedPatient.age} Yrs / {selectedPatient.gender}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>Phone / Blood</small><br /><b>{selectedPatient.phone} / {selectedPatient.blood_group || 'N/A'}</b></div>
                </div>
              ) : (
                <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', color: '#f59e0b', fontSize: '13px' }}>
                  ⚠️ Select a patient to associate with this scan record.
                </div>
              )}
            </div>
          </div>

          {/* Section B: Scan Details */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} /> Section B: Scan & Investigation Information
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Scan Type *</label>
                <select
                  value={form.scan_type}
                  onChange={e => setForm({ ...form, scan_type: e.target.value })}
                  required
                >
                  {scanTypesMaster.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  {scanTypesMaster.length === 0 && (
                    <>
                      <option>X-Ray</option><option>CT Scan</option><option>MRI</option><option>Ultrasound</option><option>ECG</option><option>Echo</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Scan Name / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Brain MRI with Contrast / Chest X-Ray PA View"
                  value={form.scan_name}
                  onChange={e => setForm({ ...form, scan_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Scan Date *</label>
                <input
                  type="date"
                  value={form.scan_date}
                  onChange={e => setForm({ ...form, scan_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Scan Time</label>
                <input
                  type="text"
                  placeholder="10:30 AM"
                  value={form.scan_time}
                  onChange={e => setForm({ ...form, scan_time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Referred By Doctor</label>
                <input
                  type="text"
                  placeholder="Dr. Rajesh Kumar"
                  value={form.referred_by_doctor}
                  onChange={e => setForm({ ...form, referred_by_doctor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  placeholder="Radiology & Imaging"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Technician Name</label>
                <input
                  type="text"
                  placeholder="Technician Suresh"
                  value={form.technician_name}
                  onChange={e => setForm({ ...form, technician_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Radiologist Name</label>
                <input
                  type="text"
                  placeholder="Dr. Anand MD"
                  value={form.radiologist_name}
                  onChange={e => setForm({ ...form, radiologist_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Scan Status</label>
                <select
                  value={form.scan_status}
                  onChange={e => setForm({ ...form, scan_status: e.target.value })}
                >
                  <option>Completed</option>
                  <option>Verified</option>
                  <option>Draft</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section C: Clinical Details */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} /> Section C: Clinical Information & History
            </h3>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Clinical History</label>
                <textarea
                  rows={2}
                  placeholder="Brief clinical context, duration of symptoms, trauma history..."
                  value={form.clinical_history}
                  onChange={e => setForm({ ...form, clinical_history: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Chief Complaints & Symptoms</label>
                <input
                  type="text"
                  placeholder="Severe headache, vomiting, localized swelling..."
                  value={form.symptoms}
                  onChange={e => setForm({ ...form, symptoms: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Provisional Diagnosis</label>
                <input
                  type="text"
                  placeholder="Rule out intracranial mass / acute stroke..."
                  value={form.provisional_diagnosis}
                  onChange={e => setForm({ ...form, provisional_diagnosis: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Indication For Scan</label>
                <input
                  type="text"
                  placeholder="Specific medical reason for ordering scan..."
                  value={form.indication_for_scan}
                  onChange={e => setForm({ ...form, indication_for_scan: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Previous Scan Details & Reference</label>
                <input
                  type="text"
                  placeholder="Ref Previous MRI #SCAN-9821 dated 2024-05-10"
                  value={form.previous_scan_reference}
                  onChange={e => setForm({ ...form, previous_scan_reference: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section D: Scan Findings */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} /> Section D: Scan Findings, Measurements & Impression
            </h3>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Detailed Scan Findings & Observations *</label>
              <textarea
                rows={4}
                placeholder="Detailed radiological observations, organ dimensions, parenchymal signal intensities..."
                value={form.findings}
                onChange={e => setForm({ ...form, findings: e.target.value })}
              />
            </div>

            {/* Organ Specific Findings */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Organ-Specific Findings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Object.keys(form.organ_specific_findings).map(organ => (
                  <div key={organ} className="form-group">
                    <label>{organ} Specific Finding</label>
                    <input
                      type="text"
                      placeholder={`Findings for ${organ}...`}
                      value={form.organ_specific_findings[organ] || ''}
                      onChange={e => setForm({
                        ...form,
                        organ_specific_findings: { ...form.organ_specific_findings, [organ]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Quantitative Measurements */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Quantitative Measurements & Lesion Tracking</h4>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setForm({
                    ...form,
                    measurements: [...form.measurements, { parameter: '', value: '', unit: 'mm', previous_value: '', trend: 'Unchanged' }]
                  })}
                >
                  + Add Parameter
                </button>
              </div>

              {form.measurements.map((m, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Parameter (e.g. Tumor Diameter)"
                    value={m.parameter}
                    onChange={e => {
                      const updated = [...form.measurements];
                      updated[idx].parameter = e.target.value;
                      setForm({ ...form, measurements: updated });
                    }}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Current Val (e.g. 14.5)"
                    value={m.value}
                    onChange={e => {
                      const updated = [...form.measurements];
                      updated[idx].value = e.target.value;
                      setForm({ ...form, measurements: updated });
                    }}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Unit (mm, cm)"
                    value={m.unit}
                    onChange={e => {
                      const updated = [...form.measurements];
                      updated[idx].unit = e.target.value;
                      setForm({ ...form, measurements: updated });
                    }}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Previous Val"
                    value={m.previous_value || ''}
                    onChange={e => {
                      const updated = [...form.measurements];
                      updated[idx].previous_value = e.target.value;
                      setForm({ ...form, measurements: updated });
                    }}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  />
                  <select
                    value={m.trend || 'Unchanged'}
                    onChange={e => {
                      const updated = [...form.measurements];
                      updated[idx].trend = e.target.value;
                      setForm({ ...form, measurements: updated });
                    }}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                  >
                    <option value="Unchanged">Unchanged</option>
                    <option value="Increased">Increased 🔺</option>
                    <option value="Decreased">Decreased 🔻</option>
                    <option value="New Finding">New Finding 🌟</option>
                    <option value="Resolved">Resolved 🟢</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '6px' }}
                    onClick={() => {
                      const updated = form.measurements.filter((_, i) => i !== idx);
                      setForm({ ...form, measurements: updated });
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Impression / Conclusion *</label>
              <textarea
                rows={2}
                placeholder="Final summary diagnosis e.g. Moderate cerebral atrophy. No acute hemorrhage."
                value={form.impression}
                onChange={e => setForm({ ...form, impression: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Diagnosis</label>
              <input
                type="text"
                placeholder="Clinical diagnosis based on findings..."
                value={form.diagnosis}
                onChange={e => setForm({ ...form, diagnosis: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.follow_up_required}
                    onChange={e => setForm({ ...form, follow_up_required: e.target.checked })}
                  />
                  Follow-up Scan Required
                </label>
              </div>

              {form.follow_up_required && (
                <div className="form-group">
                  <label>Follow-up Date</label>
                  <input
                    type="date"
                    value={form.follow_up_date}
                    onChange={e => setForm({ ...form, follow_up_date: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section E: File Attachments */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={20} /> Section E: Upload Attachments (Scan Images & PDF Reports)
            </h3>

            {formMode === 'create' && !selectedScanRecord ? (
              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', color: '#60a5fa', fontSize: '13px' }}>
                ℹ️ Save the scan record first. You will then be able to upload scan images and PDF files directly.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Upload New File(s)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={e => handleUploadAttachment(selectedScanRecord.id, e.target.files)}
                    disabled={uploadingFiles}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}
                  />
                  {uploadingFiles && <span style={{ marginLeft: '10px', color: '#3b82f6', fontSize: '13px' }}>Uploading file(s)...</span>}
                </div>

                {selectedScanRecord?.attachments && selectedScanRecord.attachments.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Category</th>
                          <th>Size</th>
                          <th>Uploaded At</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedScanRecord.attachments.map((att: any) => (
                          <tr key={att.id}>
                            <td>
                              <a href={`${API_BASE}${att.storage_url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📄 {att.original_name || att.file_name}
                              </a>
                            </td>
                            <td><span style={{ textTransform: 'uppercase', fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{att.file_category}</span></td>
                            <td>{(att.file_size / 1024).toFixed(1)} KB</td>
                            <td>{new Date(att.uploaded_at).toLocaleDateString()}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => handleDeleteAttachment(selectedScanRecord.id, att.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No attachments uploaded yet for this scan record.</p>
                )}
              </div>
            )}
          </div>

          {/* Section F: Finalization */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={20} /> Section F: Report Verification & Finalization
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label>Report Number</label>
                <input
                  type="text"
                  value={form.report_number}
                  onChange={e => setForm({ ...form, report_number: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Report Title</label>
                <input
                  type="text"
                  placeholder="Final MRI Radiology Report"
                  value={form.report_title}
                  onChange={e => setForm({ ...form, report_title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Reported By</label>
                <input
                  type="text"
                  value={form.reported_by}
                  onChange={e => setForm({ ...form, reported_by: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Verified By</label>
                <input
                  type="text"
                  placeholder="Dr. Senior Radiologist"
                  value={form.verified_by}
                  onChange={e => setForm({ ...form, verified_by: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                {formMode === 'create' ? 'Save Scan Record' : 'Update Scan Record'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setScanSubTab('list')}
              >
                Cancel / Back to List
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 3: PATIENT SCAN ANALYSIS VIEW */}
      {/* ========================================================================= */}
      {scanSubTab === 'analysis' && (
        <div>
          {/* Patient Selector */}
          <div className="glass-card" style={{ marginBottom: '20px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr auto', gap: '16px', alignItems: 'center' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>Select Patient to Analyze</label>
                <Select
                  options={patients.map(p => ({ value: p.id, label: `${p.id} - ${p.name} (${p.phone})` }))}
                  value={analysisPatientId ? { value: analysisPatientId, label: `${analysisPatientId} - ${patients.find(p => p.id === analysisPatientId)?.name || ''}` } : null}
                  onChange={(sel: any) => sel ? loadAnalysisForPatient(sel.value) : setAnalysisData(null)}
                  styles={selectStyles}
                  placeholder="Select Patient..."
                />
              </div>

              {analysisData?.patient && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '12px 16px', borderRadius: '8px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div><small style={{ color: 'var(--text-muted)' }}>Patient Name</small><br /><b>{analysisData.patient.name}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>UHID / MRN</small><br /><b>{analysisData.patient.aadhaar || 'N/A'}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>Age / Gender</small><br /><b>{analysisData.patient.age}Y / {analysisData.patient.gender}</b></div>
                  <div><small style={{ color: 'var(--text-muted)' }}>Total Scans Recorded</small><br /><b style={{ color: '#3b82f6', fontSize: '18px' }}>{analysisData.total_scans}</b></div>
                </div>
              )}

              {analysisPatientId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => loadAnalysisForPatient(analysisPatientId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={16} /> Refresh Analysis
                </button>
              )}
            </div>
          </div>

          {analysisLoading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>Loading patient scan history analysis...</div>
          ) : analysisData ? (
            <div>
              {/* Chronological Scan History Timeline */}
              <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '20px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} /> Chronological Investigation Progression
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                  {/* Timeline vertical bar */}
                  <div style={{ position: 'absolute', left: '8px', top: '10px', bottom: '10px', width: '3px', background: '#3b82f6', opacity: 0.3 }} />

                  {analysisData.scan_history.map((scan: any, index: number) => (
                    <div key={scan.id} style={{ position: 'relative', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      {/* Timeline dot */}
                      <div style={{ position: 'absolute', left: '-22px', top: '20px', width: '15px', height: '15px', borderRadius: '50%', background: '#3b82f6', border: '3px solid var(--bg-card)' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                            {scan.scan_type}
                          </span>
                          <h4 style={{ margin: '8px 0 0 0', fontSize: '16px', color: 'var(--text-primary)' }}>{scan.scan_name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scan Date: <b>{scan.scan_date}</b> | Scan #: <b>{scan.scan_number}</b> | Doctor: Dr. {scan.referred_by_doctor || 'Self'}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setSelectedViewScan(scan)}
                          >
                            <Eye size={14} /> Full Report
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                        <div>
                          <b style={{ color: '#94a3b8' }}>Findings:</b>
                          <p style={{ margin: '4px 0', color: 'var(--text-primary)' }}>{scan.findings?.findings || scan.findings?.observations || 'N/A'}</p>
                        </div>
                        <div>
                          <b style={{ color: '#60a5fa' }}>Impression:</b>
                          <p style={{ margin: '4px 0', fontWeight: 'bold', color: '#60a5fa' }}>{scan.findings?.impression || 'No acute abnormality'}</p>
                        </div>
                      </div>

                      {scan.findings?.measurements && scan.findings.measurements.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <b style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recorded Measurements:</b>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {scan.findings.measurements.map((m: any, i: number) => (
                              <span key={i} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                <b>{m.parameter}:</b> {m.value} {m.unit || ''} {m.trend ? `(${m.trend})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {analysisData.scan_history.length === 0 && (
                    <p style={{ color: 'var(--text-muted)' }}>No historical scan records available for this patient.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <Activity size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <h3>Select a patient above to load complete historical scan progression</h3>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 4: DUAL SCAN SIDE-BY-SIDE COMPARISON TOOL */}
      {/* ========================================================================= */}
      {scanSubTab === 'comparison' && (
        <div>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeftRight size={20} /> Select Scans for Side-by-Side Comparison
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block', color: '#94a3b8' }}>Scan A (Baseline / Previous Scan)</label>
                <select
                  value={scanAId}
                  onChange={e => setScanAId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 10px' }}
                >
                  <option value="">-- Select Scan A --</option>
                  {scanRecords.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.scan_date} — {s.scan_type} ({s.scan_name}) - #{s.patient_id} {s.patient?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', marginBottom: '6px', display: 'block', color: '#10b981' }}>Scan B (Follow-up / Current Scan)</label>
                <select
                  value={scanBId}
                  onChange={e => setScanBId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', height: '40px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', padding: '0 10px' }}
                >
                  <option value="">-- Select Scan B --</option>
                  {scanRecords.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.scan_date} — {s.scan_type} ({s.scan_name}) - #{s.patient_id} {s.patient?.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {scanA && scanB ? (
            <div className="glass-card">
              <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>
                Comparison: Scan A ({scanA.scan_date}) vs Scan B ({scanB.scan_date})
              </h3>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Parameter / Section</th>
                      <th style={{ width: '40%', color: '#60a5fa' }}>Scan A ({scanA.scan_date})</th>
                      <th style={{ width: '40%', color: '#34d399' }}>Scan B ({scanB.scan_date})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><b>Scan ID & Number</b></td>
                      <td>{scanA.scan_number}</td>
                      <td>{scanB.scan_number}</td>
                    </tr>
                    <tr>
                      <td><b>Scan Type & Title</b></td>
                      <td><b>{scanA.scan_type}</b> — {scanA.scan_name}</td>
                      <td><b>{scanB.scan_type}</b> — {scanB.scan_name}</td>
                    </tr>
                    <tr>
                      <td><b>Referring Doctor</b></td>
                      <td>Dr. {scanA.referred_by_doctor || 'N/A'}</td>
                      <td>Dr. {scanB.referred_by_doctor || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><b>Clinical History</b></td>
                      <td>{scanA.clinical_history || 'N/A'}</td>
                      <td>{scanB.clinical_history || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><b>Scan Findings</b></td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{scanA.findings?.findings || 'N/A'}</td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{scanB.findings?.findings || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td><b>Measurements Comparison</b></td>
                      <td>
                        {scanA.findings?.measurements?.map((m: any, i: number) => (
                          <div key={i}>• {m.parameter}: <b>{m.value} {m.unit || ''}</b></div>
                        )) || 'None recorded'}
                      </td>
                      <td>
                        {scanB.findings?.measurements?.map((m: any, i: number) => (
                          <div key={i}>• {m.parameter}: <b>{m.value} {m.unit || ''}</b> <span style={{ color: '#f59e0b', fontSize: '12px' }}>({m.trend || 'Unchanged'})</span></div>
                        )) || 'None recorded'}
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(59,130,246,0.05)' }}>
                      <td><b>Impression / Conclusion</b></td>
                      <td style={{ fontWeight: 'bold', color: '#60a5fa' }}>{scanA.findings?.impression || 'N/A'}</td>
                      <td style={{ fontWeight: 'bold', color: '#34d399' }}>{scanB.findings?.impression || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <h3>Select both Scan A and Scan B from the dropdowns above to trigger side-by-side comparison</h3>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 5: SCAN TYPES MASTER */}
      {/* ========================================================================= */}
      {scanSubTab === 'master' && (
        <div className="grid-2">
          <div className="glass-card">
            <h3>Add New Master Scan Type</h3>
            <form onSubmit={handleCreateMasterScanType}>
              <div className="form-group">
                <label>Scan Type Code *</label>
                <input
                  type="text"
                  placeholder="e.g. XRAY, MRI, CT, USG"
                  value={newMasterTypeForm.code}
                  onChange={e => setNewMasterTypeForm({ ...newMasterTypeForm, code: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Scan Type Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Magnetic Resonance Imaging (MRI)"
                  value={newMasterTypeForm.name}
                  onChange={e => setNewMasterTypeForm({ ...newMasterTypeForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={newMasterTypeForm.description}
                  onChange={e => setNewMasterTypeForm({ ...newMasterTypeForm, description: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                + Add Scan Type
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3>Configured Scan Types Master ({scanTypesMaster.length})</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scanTypesMaster.map(t => (
                    <tr key={t.id}>
                      <td><b>{t.code}</b></td>
                      <td>{t.name}</td>
                      <td><span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Radiology Report Modal */}
      {selectedViewScan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '800px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '24px', position: 'relative' }}>
            <button
              onClick={() => setSelectedViewScan(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2 style={{ margin: '0 0 16px 0', color: '#3b82f6' }}>Radiology Report Details</h2>

            <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div><b>Patient Name:</b> {selectedViewScan.patient?.name || `ID #${selectedViewScan.patient_id}`}</div>
                <div><b>Scan #:</b> {selectedViewScan.scan_number}</div>
                <div><b>Scan Type:</b> {selectedViewScan.scan_type} ({selectedViewScan.scan_name})</div>
                <div><b>Scan Date:</b> {selectedViewScan.scan_date}</div>
                <div><b>Doctor:</b> Dr. {selectedViewScan.referred_by_doctor || 'Self'}</div>
                <div><b>Radiologist:</b> Dr. {selectedViewScan.radiologist_name || 'Staff'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#60a5fa' }}>Findings</h4>
              <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedViewScan.findings?.findings || 'No findings recorded.'}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#34d399' }}>Impression</h4>
              <p style={{ fontSize: '14px', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px', color: '#34d399' }}>
                {selectedViewScan.findings?.impression || 'No impression recorded.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={() => printReport(selectedViewScan)}>
                <Download size={16} /> Print Official Report
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedViewScan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
