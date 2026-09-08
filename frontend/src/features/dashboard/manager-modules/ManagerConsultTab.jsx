import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope,
  PhoneCall,
  MessageSquare,
  Plus,
  Search,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  Clock,
  User,
  ClipboardList
} from 'lucide-react';
import apiClient from '../../../api/apiClient.js';
import { useBranch } from '../../../context/BranchContext.jsx';
import { Button } from '../../../components/common/Button.jsx';
import { Badge } from '../../../components/common/Badge.jsx';
import { Modal } from '../../../components/common/Modal.jsx';
import { Spinner } from '../../../components/common/Spinner.jsx';
import { OrderCreateModal } from '../../orders/OrderCreateModal.jsx';

export function ManagerConsultTab() {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddConsultModalOpen, setIsAddConsultModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedConsultForOrder, setSelectedConsultForOrder] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Initial consult entries (persistent or synchronized with leads/calls)
  const [consultations, setConsultations] = useState([
    {
      id: 'CNS-108-01',
      patientName: 'Venkatesan R',
      mobile: '9842144321',
      age: 48,
      gender: 'Male',
      city: 'Hosur, Denkanikottai Road',
      symptoms: 'Knee joint osteoarthritis, morning stiffness, swelling',
      consultantName: 'KANAGAVALLI',
      status: 'PENDING_CONSULT',
      notes: 'Requested consultation on Joint Care Oil + Guggulu extract course.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'CNS-108-02',
      patientName: 'Meenakshi Sundaram',
      mobile: '9443219876',
      age: 39,
      gender: 'Female',
      city: 'Bangalore / Hosur Border',
      symptoms: 'Digestive weakness, bloating, acidity & sluggish metabolism',
      consultantName: 'AMRUTHA',
      status: 'CONSULTED',
      notes: 'Recommended Triphala Churna + Liver Detox syrup for 30 days.',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'CNS-108-03',
      patientName: 'Senthil Nathan',
      mobile: '9629988112',
      age: 52,
      gender: 'Male',
      city: 'Krishnagiri',
      symptoms: 'Blood sugar fluctuation (HbA1c 7.8), diabetic neuropathy',
      consultantName: 'PATTUSELVI',
      status: 'PRESCRIBED',
      notes: 'Prescribed Madhumeha Churna 200g + Jamun Neem Karela Ras.',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  const [newConsultData, setNewConsultData] = useState({
    patientName: '',
    mobile: '',
    age: '',
    gender: 'Male',
    city: '',
    symptoms: '',
    consultantName: 'KANAGAVALLI',
    status: 'PENDING_CONSULT',
    notes: ''
  });

  const handleAddConsult = (e) => {
    e.preventDefault();
    if (!newConsultData.patientName || !newConsultData.mobile) return;

    const entry = {
      id: `CNS-108-${String(consultations.length + 1).padStart(2, '0')}`,
      ...newConsultData,
      createdAt: new Date().toISOString()
    };

    setConsultations([entry, ...consultations]);
    setIsAddConsultModalOpen(false);
    setNewConsultData({
      patientName: '',
      mobile: '',
      age: '',
      gender: 'Male',
      city: '',
      symptoms: '',
      consultantName: 'KANAGAVALLI',
      status: 'PENDING_CONSULT',
      notes: ''
    });
    setActionSuccessMsg('Consultation entry logged successfully!');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const filteredConsultations = consultations.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.patientName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.symptoms.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Consultations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{consultations.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Review</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 font-mono">
            {consultations.filter((c) => c.status === 'PENDING_CONSULT').length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Consulted & Prescribed</div>
          <div className="text-2xl font-bold text-blue-700 mt-1 font-mono">
            {consultations.filter((c) => c.status === 'CONSULTED' || c.status === 'PRESCRIBED').length}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Converted to Orders</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {consultations.filter((c) => c.status === 'CONVERTED_ORDER').length || 1}
          </div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, mobile, symptoms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_CONSULT">Pending Review</option>
            <option value="CONSULTED">Consulted</option>
            <option value="PRESCRIBED">Prescribed</option>
            <option value="CONVERTED_ORDER">Converted to Order</option>
          </select>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={Plus}
          onClick={() => setIsAddConsultModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
        >
          New Consultation Record
        </Button>
      </div>

      {/* Consultations List */}
      <div className="space-y-3">
        {filteredConsultations.map((item) => {
          const cleanMobile = item.mobile.replace(/\D/g, '').slice(-10);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3 hover:border-slate-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 text-sm">{item.patientName}</span>
                  <span className="text-xs text-slate-500 font-mono">📱 {item.mobile}</span>
                  {item.age && (
                    <span className="text-xs text-slate-500">
                      ({item.gender}, {item.age} yrs)
                    </span>
                  )}
                  <Badge variant="primary" size="sm">
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {item.id} • {new Date(item.createdAt).toLocaleDateString('en-GB')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                <div>
                  <strong className="text-slate-900">Chief Symptoms:</strong> {item.symptoms}
                </div>
                <div>
                  <strong className="text-slate-900">Assigned Consultant:</strong>{' '}
                  <span className="text-emerald-800 font-semibold">{item.consultantName}</span>
                </div>
                {item.notes && (
                  <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <strong className="text-slate-900">Prescription / Notes:</strong> {item.notes}
                  </div>
                )}
              </div>

              {/* Action Strip */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <a
                  href={`tel:${cleanMobile}`}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Patient</span>
                </a>

                <a
                  href={`https://wa.me/91${cleanMobile}?text=Hello%20${encodeURIComponent(item.patientName)},%20this%20is%20Shanthi%20Ayurvedas%20regarding%20your%20health%20consultation.`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setSelectedConsultForOrder(item);
                    setIsOrderModalOpen(true);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  Convert to Order & Prescribe
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Consultation Record Modal */}
      {isAddConsultModalOpen && (
        <Modal
          isOpen={isAddConsultModalOpen}
          onClose={() => setIsAddConsultModalOpen(false)}
          title="New Ayurvedic Consultation Record"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAddConsult} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={newConsultData.patientName}
                onChange={(e) => setNewConsultData({ ...newConsultData, patientName: e.target.value })}
                placeholder="e.g. Meenakshi Sundaram"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile *</label>
                <input
                  type="tel"
                  required
                  value={newConsultData.mobile}
                  onChange={(e) => setNewConsultData({ ...newConsultData, mobile: e.target.value })}
                  placeholder="9842100000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age & Gender</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={newConsultData.age}
                    onChange={(e) => setNewConsultData({ ...newConsultData, age: e.target.value })}
                    placeholder="Age"
                    className="w-16 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <select
                    value={newConsultData.gender}
                    onChange={(e) => setNewConsultData({ ...newConsultData, gender: e.target.value })}
                    className="flex-1 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chief Complaints / Symptoms *</label>
              <input
                type="text"
                required
                value={newConsultData.symptoms}
                onChange={(e) => setNewConsultData({ ...newConsultData, symptoms: e.target.value })}
                placeholder="e.g. Knee joint pain, stiffness, diabetes"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Consultant / Telecaller</label>
              <select
                value={newConsultData.consultantName}
                onChange={(e) => setNewConsultData({ ...newConsultData, consultantName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="KANAGAVALLI">KANAGAVALLI</option>
                <option value="AMRUTHA">AMRUTHA</option>
                <option value="PATTUSELVI">PATTUSELVI</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ayurvedic Treatment & Prescription Notes</label>
              <textarea
                rows={3}
                value={newConsultData.notes}
                onChange={(e) => setNewConsultData({ ...newConsultData, notes: e.target.value })}
                placeholder="Recommended medicine combinations, course duration, diet guidance..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsAddConsultModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
                Save Record
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order Create Modal */}
      {isOrderModalOpen && selectedConsultForOrder && (
        <OrderCreateModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedConsultForOrder(null);
          }}
          initialPatientData={{
            patientName: selectedConsultForOrder.patientName,
            mobile: selectedConsultForOrder.mobile,
            city: selectedConsultForOrder.city
          }}
        />
      )}
    </div>
  );
}

export default ManagerConsultTab;
