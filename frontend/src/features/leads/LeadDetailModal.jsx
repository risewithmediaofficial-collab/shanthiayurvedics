import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Clock,
  Calendar,
  User,
  MapPin,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Pencil,
  Copy,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Info,
  CalendarClock,
  Sparkles
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';

export function LeadDetailModal({
  isOpen,
  leadId,
  initialLead = null,
  onClose,
  onOpenOrder,
  onOpenEdit,
  initialTab = 'calls'
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab); // 'calls' | 'profile' | 'assignments'
  const [copiedField, setCopiedField] = useState('');
  const [isLogFormExpanded, setIsLogFormExpanded] = useState(false);
  const [logFormError, setLogFormError] = useState('');
  const [logFormSuccess, setLogFormSuccess] = useState('');

  // Call Logger State
  const [callData, setCallData] = useState({
    outcome: 'CONNECTED_INTERESTED',
    durationSeconds: 120,
    notes: '',
    nextFollowUpDate: '',
    priority: 'MEDIUM'
  });

  // Fetch full lead details with calls & assignments
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ['leadDetails', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const res = await apiClient.get(`/leads/${leadId}`);
      return res.data?.data;
    },
    enabled: Boolean(isOpen && leadId)
  });

  const lead = responseData?.lead || initialLead || {};
  const calls = Array.isArray(responseData?.calls) ? responseData.calls : [];
  const assignments = Array.isArray(responseData?.assignments) ? responseData.assignments : [];

  // Log Call Mutation
  const logCallMutation = useMutation({
    mutationFn: (data) => apiClient.post(`/leads/${leadId}/calls`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', leadId] });
      queryClient.invalidateQueries({ queryKey: ['callHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLogFormSuccess('✓ Call log recorded successfully!');
      setLogFormError('');
      setCallData({
        outcome: 'CONNECTED_INTERESTED',
        durationSeconds: 120,
        notes: '',
        nextFollowUpDate: '',
        priority: 'MEDIUM'
      });
      setIsLogFormExpanded(false);
      refetch();
      setTimeout(() => setLogFormSuccess(''), 4000);
    },
    onError: (err) => {
      const errorMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to log call';
      setLogFormError(errorMsg);
      setTimeout(() => setLogFormError(''), 5000);
    }
  });

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanMobile = (lead.whatsappNumber || lead.mobile || '').replace(/\D/g, '').slice(-10);
    if (!cleanMobile) return;
    const textMsg = encodeURIComponent(
      `🌿 *Shanthi Ayurvedas Wellness*\n\n` +
        `Hello *${lead.name || 'there'}*,\n` +
        `Thank you for inquiring about our authentic Ayurvedic remedies.\n\n` +
        `How may our Ayurvedic health specialist assist you today?\n\n` +
        `📍 *Shanthi Ayurvedas Clinic & Pharmacy*`
    );
    window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
  };

  const handleSaveCallLog = (e) => {
    e.preventDefault();
    setLogFormError('');
    if (!callData.notes.trim()) {
      setLogFormError('Please enter conversation notes');
      return;
    }
    logCallMutation.mutate({
      outcome: callData.outcome,
      callStatus: callData.outcome,
      notes: callData.notes.trim(),
      callDurationSeconds: Number(callData.durationSeconds) || 0,
      durationSeconds: Number(callData.durationSeconds) || 0,
      nextFollowUpAt: callData.nextFollowUpDate || undefined,
      priority: callData.priority
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <Badge variant="primary">New Lead</Badge>;
      case 'ASSIGNED': return <Badge variant="info">Assigned</Badge>;
      case 'CONTACTED': return <Badge variant="warning">Contacted</Badge>;
      case 'INTERESTED': return <Badge variant="emerald">Interested</Badge>;
      case 'CONVERTED': return <Badge variant="emerald">Converted to Order</Badge>;
      case 'LOST': return <Badge variant="danger">Lost / Dropped</Badge>;
      default: return <Badge variant="neutral">{status || 'NEW'}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case 'CONNECTED_INTERESTED':
      case 'INTERESTED':
        return <Badge variant="emerald">Connected — Highly Interested</Badge>;
      case 'CONNECTED_CALLBACK_REQUESTED':
      case 'CALL_LATER':
        return <Badge variant="warning">Asked to Call Back</Badge>;
      case 'CONNECTED_NOT_INTERESTED':
      case 'NOT_INTERESTED':
        return <Badge variant="neutral">Not Interested</Badge>;
      case 'NO_ANSWER':
        return <Badge variant="danger">No Answer / Ringing</Badge>;
      case 'BUSY':
        return <Badge variant="danger">Line Busy</Badge>;
      case 'SWITCHED_OFF':
        return <Badge variant="danger">Switched Off</Badge>;
      case 'WRONG_NUMBER':
      case 'INVALID_NUMBER':
        return <Badge variant="danger">Wrong / Invalid Number</Badge>;
      default:
        return <Badge variant="neutral">{outcome?.replace(/_/g, ' ') || 'Call'}</Badge>;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m} min`;
    return `${s}s`;
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead.name ? `Lead Profile: ${lead.name}` : 'Lead Details & Call Logs'}
      subtitle={`Mobile: ${lead.mobile || '—'} • ${lead.city ? `${lead.city} • ` : ''}${calls.length} Call Log(s)`}
      maxWidth="max-w-3xl"
      icon="🌿"
    >
      {isLoading && !lead.name ? (
        <div className="py-20 text-center">
          <Spinner size="lg" text="Loading lead details and call logs..." />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Banner with Patient Header & Quick Action Buttons */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold tracking-tight text-white">{lead.name || 'Unnamed Lead'}</h3>
                  {lead.isDuplicate && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                      Duplicate Lead
                    </span>
                  )}
                  {getStatusBadge(lead.status)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {lead.mobile || '—'}
                  </span>
                  {lead.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {lead.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    Source: {lead.source || 'CALL'}
                  </span>
                </div>
              </div>

              {/* Quick Actions in Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Click WhatsApp */}
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  title="Chat on WhatsApp"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Direct Dial */}
                {lead.mobile && (
                  <a
                    href={`tel:${lead.mobile}`}
                    title="Direct Phone Call"
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}

                {/* Convert to Order */}
                {onOpenOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOrder(lead);
                    }}
                    title="Place Prescription Order"
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order</span>
                  </button>
                )}

                {/* Edit Lead */}
                {onOpenEdit && (
                  <button
                    type="button"
                    onClick={() => onOpenEdit(lead)}
                    title="Edit Contact Details"
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-slate-400 text-[11px] block">Assigned Telecaller</span>
                <span className="font-semibold text-slate-100 truncate block">
                  {lead.assignedTo?.name || 'Unassigned'}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-slate-400 text-[11px] block">Branch Location</span>
                <span className="font-semibold text-slate-100 truncate block">
                  {lead.branchId?.name || 'Hosur Main Hub'}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-slate-400 text-[11px] block">Total Calls Logged</span>
                <span className="font-bold text-emerald-400 block flex items-center gap-1">
                  <PhoneCall className="w-3.5 h-3.5" />
                  {calls.length} {calls.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5">
                <span className="text-slate-400 text-[11px] block">Next Follow-Up</span>
                <span className="font-semibold text-amber-300 truncate block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {lead.nextFollowUpAt
                    ? new Date(lead.nextFollowUpAt).toLocaleDateString('en-GB')
                    : 'None Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Toasts */}
          {logFormSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{logFormSuccess}</span>
            </div>
          )}
          {logFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{logFormError}</span>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('calls')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'calls'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call History & Logs</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'calls' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {calls.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Patient Profile & Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'assignments'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Assignment Trail</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'assignments' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {assignments.length}
              </span>
            </button>
          </div>

          {/* TAB 1: CALL HISTORY & LOGS */}
          {activeTab === 'calls' && (
            <div className="space-y-4">
              {/* Quick + Add New Call Log Trigger / Accordion */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setIsLogFormExpanded(!isLogFormExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-100/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Record New Call Interaction</div>
                      <div className="text-[11px] text-slate-500">Log discussion outcome, remedies suggested, and follow-up date</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <span>{isLogFormExpanded ? 'Hide Logger' : '+ Log Call'}</span>
                    {isLogFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isLogFormExpanded && (
                  <form onSubmit={handleSaveCallLog} className="p-4 pt-1 border-t border-emerald-200 space-y-3 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Call Outcome / Disposition *"
                        value={callData.outcome}
                        onChange={(e) => setCallData({ ...callData, outcome: e.target.value })}
                        options={[
                          { value: 'CONNECTED_INTERESTED', label: 'Connected — Highly Interested' },
                          { value: 'CONNECTED_CALLBACK_REQUESTED', label: 'Connected — Asked to Call Back' },
                          { value: 'CONNECTED_NOT_INTERESTED', label: 'Connected — Not Interested' },
                          { value: 'NO_ANSWER', label: 'No Answer / Ringing' },
                          { value: 'BUSY', label: 'Line Busy' },
                          { value: 'SWITCHED_OFF', label: 'Switched Off' },
                          { value: 'WRONG_NUMBER', label: 'Wrong Number' }
                        ]}
                      />
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Call Duration
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[30, 60, 120, 300].map((sec) => (
                            <button
                              type="button"
                              key={sec}
                              onClick={() => setCallData({ ...callData, durationSeconds: sec })}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                callData.durationSeconds === sec
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {formatDuration(sec)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Conversation Notes *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={callData.notes}
                        onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
                        placeholder="Patient symptoms discussed, recommended dosage, price agreed..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Schedule Next Follow-Up (Optional)
                        </label>
                        <Input
                          type="datetime-local"
                          value={callData.nextFollowUpDate}
                          onChange={(e) => setCallData({ ...callData, nextFollowUpDate: e.target.value })}
                        />
                      </div>
                      <Select
                        label="Lead Priority"
                        value={callData.priority}
                        onChange={(e) => setCallData({ ...callData, priority: e.target.value })}
                        options={[
                          { value: 'LOW', label: 'Low Priority' },
                          { value: 'MEDIUM', label: 'Medium Priority' },
                          { value: 'HIGH', label: 'High Priority (Urgent)' },
                          { value: 'URGENT', label: 'Immediate Action' }
                        ]}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => setIsLogFormExpanded(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        type="submit"
                        isLoading={logCallMutation.isPending}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white"
                      >
                        Save Call Log
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* All Call History Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>All Logged Interactions ({calls.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Chronological history</span>
                </div>

                {calls.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-lg">
                      📞
                    </div>
                    <div className="text-xs font-bold text-slate-800">No call logs recorded yet</div>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Click "+ Log Call" above to record your conversation notes, patient response, and schedule follow-ups.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsLogFormExpanded(true)}
                      className="mt-2 bg-emerald-700 text-white text-xs"
                    >
                      Record First Call
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calls.map((call, idx) => (
                      <div
                        key={call._id || idx}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                      >
                        {/* Call Card Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getOutcomeBadge(call.callStatus || call.outcome)}
                            {call.callDurationSeconds > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatDuration(call.callDurationSeconds)}
                              </span>
                            )}
                            {call.priority && call.priority !== 'MEDIUM' && (
                              <Badge variant={call.priority === 'HIGH' || call.priority === 'URGENT' ? 'danger' : 'neutral'} size="sm">
                                {call.priority}
                              </Badge>
                            )}
                          </div>

                          <div className="text-right text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">
                              {new Date(call.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>{' '}
                            at{' '}
                            <span>
                              {new Date(call.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="ml-1 text-slate-400">({formatRelativeTime(call.createdAt)})</span>
                          </div>
                        </div>

                        {/* Full Conversation Notes Display */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Conversation Notes
                          </div>
                          {call.notes || '—'}
                        </div>

                        {/* Card Footer: Telecaller & Follow-up */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Logged by:</span>
                            <span className="font-bold text-slate-700">
                              {call.telecallerId?.name || 'Telecaller Staff'}
                            </span>
                          </div>

                          {call.nextFollowUpAt && (
                            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/80 font-medium">
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>Scheduled Follow-Up:</span>
                              <span className="font-bold">
                                {new Date(call.nextFollowUpAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT PROFILE & DETAILS */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Contact & Patient Profile
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Full Patient Name</span>
                    <span className="font-bold text-slate-900 text-sm block">{lead.name || '—'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Primary Phone / Mobile</span>
                      <span className="font-bold font-mono text-slate-900 text-sm block">{lead.mobile || '—'}</span>
                    </div>
                    {lead.mobile && (
                      <button
                        type="button"
                        onClick={() => handleCopy(lead.mobile, 'mobile')}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
                        title="Copy phone"
                      >
                        {copiedField === 'mobile' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-400 text-[11px] block">WhatsApp Contact</span>
                    <span className="font-semibold font-mono text-slate-800 block">
                      {lead.whatsappNumber || lead.mobile || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Email Address</span>
                    <span className="font-semibold text-slate-800 block">{lead.email || '—'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-400 text-[11px] block">City / Town</span>
                    <span className="font-semibold text-slate-800 block">{lead.city || '—'}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-400 text-[11px] block">State</span>
                    <span className="font-semibold text-slate-800 block">{lead.state || 'Tamil Nadu'}</span>
                  </div>
                </div>

                {/* Initial Notes / Health Complaints */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Initial Enquiry & Health Concerns
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {lead.notes || 'No initial enquiry notes provided.'}
                  </p>
                </div>

                {/* Duplicate Information */}
                {lead.isDuplicate && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <AlertCircle className="w-4 h-4" />
                      Duplicate Record Notice
                    </div>
                    <p>
                      This phone number was previously registered.
                      {lead.duplicateOf?.name ? ` Duplicate of: ${lead.duplicateOf.name} (${lead.duplicateOf.mobile || ''})` : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ASSIGNMENT TRAIL */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Lead Assignment History ({assignments.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400">Audit trail</span>
              </div>

              {assignments.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                  No reassignment records found. Lead is on initial allocation.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {assignments.map((asg, idx) => (
                    <div key={asg._id || idx} className="p-4 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900">
                          Assigned to: <span className="text-emerald-700">{asg.assignedTo?.name || 'Staff'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          By: {asg.assignedBy?.name || 'System / Supervisor'} • Reason: {asg.reason || 'Manual Assignment'}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(asg.createdAt || asg.assignedAt).toLocaleDateString('en-GB')}{' '}
                        {new Date(asg.createdAt || asg.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default LeadDetailModal;
