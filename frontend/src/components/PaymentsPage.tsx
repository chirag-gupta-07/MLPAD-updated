import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  IndianRupee,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Building2,
  Receipt,
  RotateCcw,
  XCircle,
  Send,
  PlusCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  FileCheck
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PaymentAction {
  id: number;
  payment_id: number;
  project_id: string;
  user_name: string;
  user_role: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  remarks: string | null;
  timestamp: string;
}

interface PaymentItem {
  id: number;
  project_id: string;
  contractor_agency: string;
  payment_request_id: string;
  invoice_reference: string;
  amount: number;
  date: string;
  category: string;
  milestone_id: string;
  supporting_documents: string[];
  status: string;
  approved_by?: string | null;
  transaction_reference?: string | null;
  reconciliation_status?: string | null;
  reconciliation_notes?: string | null;
  created_at?: string;
  updated_at?: string;
  actions?: PaymentAction[];
  work_description?: string;
}

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    payment: PaymentItem;
    targetStatus: string;
    actionName: string;
  } | null>(null);
  const [officerName, setOfficerName] = useState('Chief Accounts Officer');
  const [officerRole, setOfficerRole] = useState('District Finance Division');
  const [remarks, setRemarks] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New Payment Request Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('WS/MP498/2024-2025/133447');
  const [newAgency, setNewAgency] = useState('National Infra Buildcon Ltd');
  const [newAmount, setNewAmount] = useState('850000');
  const [newCategory, setNewCategory] = useState('Running Account Bill');
  const [newMilestone, setNewMilestone] = useState('Milestone 3 - Wet Mix Macadam & Prime Coat');
  const [newInvoiceRef, setNewInvoiceRef] = useState('INV-2026-NIB-089');
  const [newRemarks, setNewRemarks] = useState('Bill submitted against 75% physical road laying completion verified by JE.');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await axios.get('/api/payments', { params });
      setPayments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load payments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setSubmittingAction(true);
    try {
      await axios.post(`/api/payments/${actionModal.payment.id}/action`, {
        user_name: officerName,
        user_role: officerRole,
        action: actionModal.actionName,
        new_status: actionModal.targetStatus,
        remarks: remarks.trim() ? remarks.trim() : `Action recorded by ${officerRole}`,
        transaction_reference: transactionRef.trim() ? transactionRef.trim() : undefined
      });

      setActionSuccessMsg(`Payment #${actionModal.payment.payment_request_id} transitioned to "${actionModal.targetStatus}"`);
      setTimeout(() => setActionSuccessMsg(null), 4000);

      setActionModal(null);
      setRemarks('');
      setTransactionRef('');
      await fetchPayments();
    } catch (e: any) {
      console.error('Action failed:', e);
      alert(e.response?.data?.detail || 'Failed to submit payment action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateNewPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/payments/request', {
        project_id: newProjectId,
        amount: parseFloat(newAmount),
        contractor_agency: newAgency,
        category: newCategory,
        milestone_id: newMilestone,
        invoice_reference: newInvoiceRef,
        requested_by: newAgency,
        user_role: 'Contractor',
        remarks: newRemarks,
        supporting_documents: [
          'Vendor_Tax_Invoice_Signed.pdf',
          'Measurement_Book_MB_Abstract.pdf',
          'Quality_Inspection_Pass_Certificate.pdf'
        ]
      });

      setIsNewModalOpen(false);
      setActionSuccessMsg(`New payment request created successfully for ${newProjectId}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      await fetchPayments();
    } catch (e: any) {
      console.error('Create payment failed:', e);
      alert(e.response?.data?.detail || 'Failed to create payment request.');
    }
  };

  const tabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Requested', value: 'REQUESTED' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Reconciled', value: 'RECONCILED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'RECONCILED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"><CheckCircle className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> Reconciled</span>;
      case 'PAID':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-green-100 text-green-900 border border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"><CheckCircle className="w-3 h-3 mr-1 text-green-600 dark:text-green-400" /> Disbursed (Paid)</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"><ShieldCheck className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" /> Approved</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700 animate-pulse"><Activity className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" /> In Gateway</span>;
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"><Clock className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" /> Under Review</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-900 border border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700"><XCircle className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" /> Rejected</span>;
      case 'REQUESTED':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700"><Receipt className="w-3 h-3 mr-1 text-sky-600 dark:text-sky-400" /> Requested</span>;
    }
  };

  // KPIs
  const totalAmount = payments.reduce((acc, p) => acc + p.amount, 0);
  const paidAmount = payments.filter(p => ['PAID', 'RECONCILED'].includes(p.status)).reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = payments.filter(p => ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING'].includes(p.status)).reduce((acc, p) => acc + p.amount, 0);
  const reconciledCount = payments.filter(p => p.status === 'RECONCILED').length;

  const filteredPayments = payments.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.project_id.toLowerCase().includes(q) ||
      (p.contractor_agency && p.contractor_agency.toLowerCase().includes(q)) ||
      (p.payment_request_id && p.payment_request_id.toLowerCase().includes(q)) ||
      (p.invoice_reference && p.invoice_reference.toLowerCase().includes(q)) ||
      (p.milestone_id && p.milestone_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <IndianRupee className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              Payment Workflow & Financial Traceability
            </h2>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-bold rounded uppercase tracking-wider border border-amber-300 dark:border-amber-700">
              Simulated Demo Processor Layer
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            End-to-end milestone invoice scrutiny, administrative approval, gateway transaction recording, and bank reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Payment Request</span>
          </button>
        </div>
      </div>

      {/* Architecture Disclaimer Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">Statutory Architecture Compliance Notice: </span>
            <span className="text-slate-600 dark:text-slate-400">
              The portal strictly separates <strong>internal governance approval</strong> from <strong>banking gateway execution</strong>. Real government PFMS/e-Kuber banking APIs can plug into this exact orchestration interface without modifying project or audit trail schemas.
            </span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Financial Traceability KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Invoiced</p>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            ₹{(totalAmount / 100000).toFixed(2)} L
          </div>
          <p className="text-xs text-slate-400 mt-1">{payments.length} claims registered</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disbursed (Paid)</p>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{(paidAmount / 100000).toFixed(2)} L
          </div>
          <p className="text-xs text-slate-400 mt-1">Simulated Treasury UTR generated</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Disbursal</p>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            ₹{(pendingAmount / 100000).toFixed(2)} L
          </div>
          <p className="text-xs text-slate-400 mt-1">In scrutiny or approval stages</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank Reconciled</p>
          <div className="mt-1 text-2xl font-bold font-mono text-brand-600 dark:text-brand-400">
            {reconciledCount} Bills
          </div>
          <p className="text-xs text-slate-400 mt-1">Matched with bank statement scrolls</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto min-w-max pb-1 md:pb-0">
          {tabs.map(tab => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-semibold border border-brand-200 dark:border-brand-700/50" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search request ID, invoice, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4"></div>
            <p>Loading financial transactions...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-base font-medium">No payment records found</p>
            <p className="text-sm mt-1">Try selecting another filter or submit a new payment claim.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Request ID & Date</th>
                  <th className="px-4 py-3">Project & Contractor</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3">Milestone / Invoice</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Reconciliation</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPayments.map(p => {
                  const isExpanded = expandedId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr 
                        className={cn(
                          "hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors",
                          isExpanded && "bg-slate-50/80 dark:bg-slate-800/40"
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{p.payment_request_id}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{p.date}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-1">{p.work_description || p.project_id}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{p.contractor_agency}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          ₹{p.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div className="text-slate-800 dark:text-slate-200 line-clamp-1">{p.milestone_id}</div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{p.invoice_reference}</div>
                        </td>

                        <td className="px-4 py-3">{getStatusBadge(p.status)}</td>

                        <td className="px-4 py-3 text-center">
                          {p.status === 'RECONCILED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Matched
                            </span>
                          ) : p.status === 'PAID' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">N/A</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                        </td>
                      </tr>

                      {/* Expanded Financial Traceability Cockpit */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b-0">
                            <div className="bg-slate-50/70 dark:bg-slate-950/50 p-5 border-b border-slate-200 dark:border-slate-800 space-y-5">
                              
                              {/* The 8 Questions Traceability Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                
                                {/* 1. WHO Requested & Agency */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    1. WHO Requested?
                                  </span>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">{p.contractor_agency}</div>
                                  <div className="text-slate-500 mt-0.5">Role: Executing Contractor Agency</div>
                                </div>

                                {/* 2. FOR WHICH PROJECT & MILESTONE */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    2. For Which Project & Milestone?
                                  </span>
                                  <div className="font-mono text-[11px] text-brand-600 dark:text-brand-400 font-semibold">{p.project_id}</div>
                                  <div className="text-slate-700 dark:text-slate-300 line-clamp-1 mt-0.5">{p.milestone_id}</div>
                                </div>

                                {/* 3. WHAT Amount & Bill Category */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    3. WHAT Amount & Category?
                                  </span>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                                    ₹{p.amount.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-slate-500 mt-0.5">Category: {p.category}</div>
                                </div>

                                {/* 4. WHO Approved & Disbursed */}
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    4. Approval & Transaction UTR?
                                  </span>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {p.approved_by ? p.approved_by : <span className="text-amber-600 italic">Pending Scrutiny</span>}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500 mt-0.5 truncate">
                                    {p.transaction_reference ? p.transaction_reference : 'UTR Not Released'}
                                  </div>
                                </div>

                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                
                                {/* Left 2 cols: Verification Documents & Action Controls */}
                                <div className="lg:col-span-2 space-y-4">
                                  
                                  {/* Supporting Documents */}
                                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                        5. Supporting Evidence & Measurement Records
                                      </span>
                                      <span className="text-[11px] text-emerald-600 font-semibold">MB Verified</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {p.supporting_documents.map((doc, idx) => (
                                        <div 
                                          key={idx}
                                          onClick={() => alert(`Opening statutory evidence document: ${doc}`)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer transition"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-brand-500" />
                                          <span>{doc}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Controlled Lifecycle Actions */}
                                  <div className="p-4 bg-gradient-to-r from-slate-50 to-brand-50/20 dark:from-slate-900 dark:to-brand-950/20 rounded-xl border border-brand-200 dark:border-brand-800/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Activity className="w-4 h-4 text-brand-600" /> Authorized Payment Actions
                                      </span>
                                      <span className="text-xs font-medium text-slate-500">
                                        Current: <span className="font-semibold text-slate-700 dark:text-slate-300">{p.status}</span>
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      
                                      {/* Transition 1: REQUESTED -> UNDER_REVIEW */}
                                      {p.status === 'REQUESTED' && (
                                        <button
                                          onClick={() => setActionModal({
                                            isOpen: true,
                                            payment: p,
                                            actionName: 'REVIEW',
                                            targetStatus: 'UNDER_REVIEW'
                                          })}
                                          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          Start Document Review
                                        </button>
                                      )}

                                      {/* Transition 2: UNDER_REVIEW -> APPROVED */}
                                      {p.status === 'UNDER_REVIEW' && (
                                        <>
                                          <button
                                            onClick={() => setActionModal({
                                              isOpen: true,
                                              payment: p,
                                              actionName: 'APPROVE',
                                              targetStatus: 'APPROVED'
                                            })}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                          >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Approve Disbursement
                                          </button>
                                          <button
                                            onClick={() => setActionModal({
                                              isOpen: true,
                                              payment: p,
                                              actionName: 'REJECT',
                                              targetStatus: 'REJECTED'
                                            })}
                                            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                                          >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Reject Claim
                                          </button>
                                        </>
                                      )}

                                      {/* Transition 3: APPROVED -> PROCESSING / PAID */}
                                      {p.status === 'APPROVED' && (
                                        <button
                                          onClick={() => setActionModal({
                                            isOpen: true,
                                            payment: p,
                                            actionName: 'PAY',
                                            targetStatus: 'PAID'
                                          })}
                                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                        >
                                          <IndianRupee className="w-3.5 h-3.5" />
                                          Disburse via Demo Gateway
                                        </button>
                                      )}

                                      {/* Transition 4: PAID -> RECONCILED */}
                                      {p.status === 'PAID' && (
                                        <button
                                          onClick={() => setActionModal({
                                            isOpen: true,
                                            payment: p,
                                            actionName: 'RECONCILE',
                                            targetStatus: 'RECONCILED'
                                          })}
                                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                          Perform Bank Reconciliation
                                        </button>
                                      )}

                                      {p.status === 'RECONCILED' && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                                          <span>Full statutory lifecycle completed. Reconciled against treasury scroll.</span>
                                        </div>
                                      )}

                                      {p.status === 'REJECTED' && (
                                        <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-medium">
                                          <XCircle className="w-4 h-4 text-red-600" />
                                          <span>Invoice rejected. Contractor must re-submit with revised measurement book.</span>
                                        </div>
                                      )}

                                    </div>
                                  </div>

                                </div>

                                {/* Right 1 col: Immutable Payment Action Audit Trail */}
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <FileCheck className="w-4 h-4 text-brand-600" />
                                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                      Transaction Audit Trail
                                    </h5>
                                  </div>

                                  {(!p.actions || p.actions.length === 0) ? (
                                    <p className="text-xs text-slate-400 italic text-center py-4">No audit actions logged.</p>
                                  ) : (
                                    <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1 text-xs">
                                      {p.actions.map((act, idx) => (
                                        <div key={act.id || idx} className="flex gap-2.5">
                                          <div className="flex flex-col items-center">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                                              act.action === 'PAY' || act.action === 'RECONCILE' ? "bg-emerald-500" :
                                              act.action === 'REJECT' ? "bg-red-500" : "bg-brand-500"
                                            )}></div>
                                            {idx !== p.actions!.length - 1 && (
                                              <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 my-0.5"></div>
                                            )}
                                          </div>
                                          <div className="flex-1 pb-1">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px]">
                                                {act.action}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-mono">
                                                {act.timestamp ? act.timestamp.replace('T', ' ').slice(0, 16) : ''}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-slate-600 dark:text-slate-400">
                                              <strong>{act.user_name}</strong> ({act.user_role})
                                            </div>
                                            <div className="text-[9px] text-slate-500 font-mono">
                                              {act.previous_status || 'INIT'} → {act.new_status}
                                            </div>
                                            {act.remarks && (
                                              <div className="mt-0.5 p-1 bg-slate-50 dark:bg-slate-800/60 rounded text-[10px] text-slate-600 dark:text-slate-300 italic">
                                                "{act.remarks}"
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Execution Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                {actionModal.actionName === 'REVIEW' ? 'Scrutinize Payment Claim' :
                 actionModal.actionName === 'APPROVE' ? 'Accord Financial Sanction' :
                 actionModal.actionName === 'PAY' ? 'Simulate Disbursal (Demo Processor)' :
                 actionModal.actionName === 'RECONCILE' ? 'Bank Reconciliation Entry' : 'Reject Payment Request'}
              </h3>
              <button 
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl mb-4 text-xs space-y-1">
              <div><strong>Payment Request:</strong> <span className="font-mono">{actionModal.payment.payment_request_id}</span></div>
              <div><strong>Amount:</strong> <span className="font-bold text-emerald-600">₹{actionModal.payment.amount.toLocaleString('en-IN')}</span></div>
              <div><strong>Status Transition:</strong> <span className="font-semibold text-brand-600 dark:text-brand-400">{actionModal.payment.status} → {actionModal.targetStatus}</span></div>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-3.5">
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Acting Official Name
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    required
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Role
                  </label>
                  <input
                    type="text"
                    value={officerRole}
                    onChange={(e) => setOfficerRole(e.target.value)}
                    required
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {actionModal.targetStatus === 'PAID' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mock Transaction UTR / Gateway Reference
                  </label>
                  <input
                    type="text"
                    placeholder={`TXN-DEMO-PFMS-${actionModal.payment.id}092`}
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    (Auto-generated mock UTR will be assigned if left empty)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Remarks / Statutory Justification {actionModal.actionName === 'REJECT' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none min-h-[80px]"
                  placeholder="Enter audit notes or approval remarks..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  required={actionModal.actionName === 'REJECT'}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 shadow-sm flex items-center gap-1.5",
                    actionModal.actionName === 'REJECT' ? "bg-red-600 hover:bg-red-700" :
                    "bg-brand-600 hover:bg-brand-700"
                  )}
                >
                  {submittingAction ? <span>Executing...</span> : <span>Confirm & Update Status</span>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* New Payment Request Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-600" />
                Submit Milestone Payment Request
              </h3>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewPayment} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project Work ID
                </label>
                <input
                  type="text"
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contractor / Agency
                  </label>
                  <input
                    type="text"
                    value={newAgency}
                    onChange={(e) => setNewAgency(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Claimed (₹)
                  </label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Reference
                  </label>
                  <input
                    type="text"
                    value={newInvoiceRef}
                    onChange={(e) => setNewInvoiceRef(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option>Running Account Bill</option>
                    <option>Mobilization Advance</option>
                    <option>Final Settlement Bill</option>
                    <option>Security Deposit Release</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Milestone Reference
                </label>
                <input
                  type="text"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Progress Justification / Remarks
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none min-h-[60px]"
                  value={newRemarks}
                  onChange={e => setNewRemarks(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition shadow-sm"
                >
                  Submit Payment Request
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
