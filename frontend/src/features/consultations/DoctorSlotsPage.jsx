import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Video,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Shield,
  Stethoscope,
  Leaf
} from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Select } from '../../components/common/Select.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

export function DoctorSlotsPage() {
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState('');

  // Booking Form State
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [consultationType, setConsultationType] = useState('TELEMEDICINE');
  const [healthConcern, setHealthConcern] = useState('Joint Pain / Arthritis');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Fetch Doctors and Slots for Selected Date
  const { data: slotsResponse, isLoading } = useQuery({
    queryKey: ['doctorSlots', selectedDate],
    queryFn: async () => {
      const res = await apiClient.get('/doctors/slots', { params: { date: selectedDate } });
      return res.data?.data;
    }
  });

  // Booking Mutation
  const bookSlotMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/doctors/slots/book', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['doctorSlots', selectedDate]);
      setIsBookModalOpen(false);

      // WhatsApp automated booking notification
      const cleanMobile = patientMobile.replace(/\D/g, '').slice(-10);
      if (cleanMobile.length === 10) {
        const textMsg = encodeURIComponent(
          `🌿 *Shanthi Ayurvedas Consultation Confirmed*\n\n` +
            `Hello *${patientName}*,\n` +
            `Your Ayurvedic consultation appointment has been scheduled!\n\n` +
            `👨‍⚕️ *Consultant:* ${selectedDoctorForBooking?.name}\n` +
            `📅 *Date:* ${new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\n` +
            `⏰ *Time Slot:* ${selectedSlotTime}\n` +
            `🩺 *Mode:* ${consultationType}\n` +
            `🌱 *Concern:* ${healthConcern}\n\n` +
            `Our doctor will connect with you at the scheduled time.\n` +
            `Location: Hosur Main Clinic, Krishnagiri, Tamil Nadu\n\n` +
            `Shanthi Ayurvedas Wellness 🙏`
        );
        window.open(`https://wa.me/91${cleanMobile}?text=${textMsg}`, '_blank');
      }

      setPatientName('');
      setPatientMobile('');
      setNotes('');
    },
    onError: (err) => {
      setFormError(err.response?.data?.message || 'Failed to book slot');
    }
  });

  const handleOpenBooking = (doctor, slotTime) => {
    setSelectedDoctorForBooking(doctor);
    setSelectedSlotTime(slotTime);
    setFormError('');
    setIsBookModalOpen(true);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedDoctorForBooking || !selectedSlotTime) return;

    bookSlotMutation.mutate({
      doctorId: selectedDoctorForBooking._id,
      date: selectedDate,
      timeSlot: selectedSlotTime,
      patientName,
      patientMobile,
      consultationType,
      healthConcern,
      notes
    });
  };

  // Calendar dates generator (current month)
  const generateDatesList = () => {
    const current = new Date(selectedDate);
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const iso = dateObj.toISOString().split('T')[0];
      dates.push({
        dayNum: d,
        iso,
        isToday: iso === todayStr,
        isSelected: iso === selectedDate,
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    return dates;
  };

  const datesList = generateDatesList();
  const doctors = slotsResponse?.doctors || [];
  const ayurvedicDoctors = doctors.filter((d) => d.category === 'AYURVEDIC_DOCTOR');
  const paramparaVaidyas = doctors.filter((d) => d.category === 'PARAMPARA_VAIDYA');

  const daysOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🌿 Doctor Slots & Telemedicine Schedule</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time consultation booking for Senior BAMS Vaidyas and Hereditary Parampara Healers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="emerald">
            {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      {/* Monthly Interactive Calendar Strip */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-ayur-700" />
            <span>
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
              Has bookings
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-500 inline-block"></span>
              Today
            </span>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {datesList.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => setSelectedDate(d.iso)}
              className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                d.isSelected
                  ? 'bg-ayur-800 text-white font-bold shadow-sm ring-2 ring-ayur-600'
                  : d.isToday
                  ? 'border-2 border-amber-400 bg-amber-50/50 text-slate-900 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <span className="text-[10px] text-slate-400 uppercase">{d.dayName}</span>
              <span className="text-sm font-black mt-0.5">{d.dayNum}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Today's Availability Section Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <span>🧑‍⚕️</span>
          <span>Today's Availability</span>
        </div>

        {isLoading ? (
          <div className="py-24 text-center">
            <Spinner size="lg" text="Loading doctor schedules & slot matrix..." />
          </div>
        ) : (
          <div className="space-y-6">
            {/* GROUP 1: AYURVEDIC DOCTORS */}
            <div className="space-y-3">
              <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🧬</span>
                <span>AYURVEDIC DOCTORS</span>
              </div>

              <div className="space-y-4">
                {ayurvedicDoctors.map((doc) => (
                  <DoctorCard
                    key={doc._id}
                    doctor={doc}
                    onSelectSlot={(slotTime) => handleOpenBooking(doc, slotTime)}
                    daysOfWeekNames={daysOfWeekNames}
                  />
                ))}
              </div>
            </div>

            {/* GROUP 2: PARAMPARA VAIDYAS */}
            <div className="space-y-3">
              <div className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🌿</span>
                <span>PARAMPARA VAIDYAS</span>
              </div>

              <div className="space-y-4">
                {paramparaVaidyas.map((doc) => (
                  <DoctorCard
                    key={doc._id}
                    doctor={doc}
                    onSelectSlot={(slotTime) => handleOpenBooking(doc, slotTime)}
                    daysOfWeekNames={daysOfWeekNames}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Book Slot Modal */}
      {isBookModalOpen && selectedDoctorForBooking && (
        <Modal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          title={`Book Slot: ${selectedSlotTime}`}
          subtitle={`Consultant: ${selectedDoctorForBooking.name} (${selectedDoctorForBooking.specialization})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleBookingSubmit} className="space-y-4 text-slate-900 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">{selectedDoctorForBooking.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  📅 {new Date(selectedDate).toLocaleDateString('en-GB')} • ⏰ {selectedSlotTime}
                </div>
              </div>
              <Badge variant="emerald">Confirmed Slot</Badge>
            </div>

            <Input
              label="Patient Name *"
              required
              placeholder="Full name of patient"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />

            <Input
              label="Mobile Number (for WhatsApp Reminder) *"
              required
              placeholder="10 digit mobile"
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value)}
              maxLength={10}
            />

            <Select
              label="Consultation Mode *"
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              options={[
                { value: 'TELEMEDICINE', label: '📞 Direct Telemedicine Call' },
                { value: 'WHATSAPP_VIDEO', label: '📹 WhatsApp Video Consultation' },
                { value: 'IN_CLINIC', label: '🏥 In-Clinic Walk-in (Hosur Main)' }
              ]}
            />

            <Select
              label="Primary Health Concern *"
              value={healthConcern}
              onChange={(e) => setHealthConcern(e.target.value)}
              options={[
                { value: 'Joint Pain / Arthritis / Sandhi Vata', label: 'Joint Pain / Arthritis / Sandhi Vata' },
                { value: 'Hair Fall & Premature Graying', label: 'Hair Fall & Premature Graying' },
                { value: 'Digestive Issues / Acidity / Constipation', label: 'Digestive Issues / Acidity' },
                { value: 'Diabetes / Madhumeha Management', label: 'Diabetes / Madhumeha Management' },
                { value: 'Skin Allergies / Psoriasis / Eczema', label: 'Skin Allergies & Complexion' },
                { value: 'General Immunity & Rejuvenation', label: 'General Immunity & Rejuvenation' }
              ]}
            />

            <Input
              label="Patient Symptoms / Notes"
              placeholder="Previous medical history / complaints..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" type="button" onClick={() => setIsBookModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={MessageSquare}
                isLoading={bookSlotMutation.isPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Confirm & Send WhatsApp
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Sub-Component: Doctor Card with Day Pills & Time Slots Grid
function DoctorCard({ doctor, onSelectSlot, daysOfWeekNames }) {
  const [isSlotsExpanded, setIsSlotsExpanded] = useState(true);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'FULLY_BOOKED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">● Fully booked</span>;
      case 'NOT_AVAILABLE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">● Not available</span>;
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ● Available ({doctor.availableCount || 0} slots)
          </span>
        );
    }
  };

  const bookedPercent = doctor.totalSlots > 0 ? Math.round(((doctor.bookedCount || 0) / doctor.totalSlots) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 hover:border-slate-300 transition-colors">
      {/* Top Doctor Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-100 via-rose-100 to-amber-100 text-purple-800 flex items-center justify-center text-lg border border-purple-200 shadow-2xs">
            {doctor.category === 'AYURVEDIC_DOCTOR' ? '💊' : '🌿'}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{doctor.name}</h3>
            <p className="text-xs text-slate-500">{doctor.specialization} • {doctor.qualification}</p>
          </div>
        </div>

        <div>{getStatusBadge(doctor.computedStatus)}</div>
      </div>

      {/* Weekly Working Days Strip */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysOfWeekNames.map((dName, idx) => {
          const isCurrentDay = doctor.dayOfWeek === idx;
          const daySchedule = doctor.weeklySchedule?.find((s) => s.dayOfWeek === idx);
          const isAvail = daySchedule ? daySchedule.isAvailable : true;

          return (
            <div
              key={idx}
              className={`p-2 rounded-xl text-xs transition-colors ${
                isCurrentDay
                  ? 'border-2 border-amber-400 bg-amber-50/50 text-slate-900 font-bold shadow-2xs'
                  : isAvail
                  ? 'bg-emerald-50 text-emerald-800 font-medium'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <div className="text-[10px] uppercase">{dName}</div>
              <div className="text-[11px] font-bold mt-0.5">{isAvail ? '09:00' : 'Off'}</div>
            </div>
          );
        })}
      </div>

      {/* Bookings Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] text-slate-600">
          <span>Booked {doctor.bookedCount || 0}/{doctor.totalSlots || 0}</span>
          <span className="font-mono">{doctor.workingHours || '09:00 - 18:00'}</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
            style={{ width: `${bookedPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Available Time Slots Grid */}
      {doctor.isWorkingToday && doctor.slots?.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Available Consultation Slots
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {doctor.slots.map((slot, sIdx) => {
              if (slot.isBooked) {
                return (
                  <div
                    key={sIdx}
                    title={`Booked for ${slot.booking?.patientName || 'Patient'}`}
                    className="px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-mono text-xs font-semibold text-center line-through cursor-not-allowed"
                  >
                    {slot.time}
                  </div>
                );
              }

              return (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => onSelectSlot(slot.time)}
                  className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-700 hover:text-white text-emerald-800 border border-emerald-300 font-mono text-xs font-bold text-center transition-all cursor-pointer shadow-2xs hover:shadow-sm"
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorSlotsPage;
