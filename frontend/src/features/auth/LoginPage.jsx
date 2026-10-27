import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import LockOutlined from '@mui/icons-material/LockOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import { Shield, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = (data) => {
    setPendingCredentials({
      email: data.email?.trim(),
      password: data.password
    });
    setHasAgreedTerms(false);
    setShowTermsModal(true);
  };

  const handleConfirmLogin = async () => {
    if (!hasAgreedTerms || !pendingCredentials) return;
    try {
      setIsLoading(true);
      setErrorMessage('');
      await login(pendingCredentials);
      setShowTermsModal(false);
      navigate(from, { replace: true });
    } catch (err) {
      setShowTermsModal(false);
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Staff & Distributor Sign In</h3>
        <p className="text-xs text-slate-500 mt-1">
          Access your brand CRM console with role-based security
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
          <ErrorOutlineRounded sx={{ fontSize: 18 }} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email-address"
          label="Username or Email"
          type="text"
          autoComplete="username"
          placeholder="Enter your work email or username"
          icon={MailOutlineRounded}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          icon={LockOutlined}
          showPasswordToggle={true}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end text-xs"><Link to="/forgot-password" className="font-medium text-ayur-700 hover:underline">Forgot password?</Link></div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 text-sm cursor-pointer"
          isLoading={isLoading}
          icon={ArrowForwardRounded}
          iconPosition="right"
        >
          Sign In to CRM
        </Button>

        <p className="text-center text-[11px] text-slate-400 mt-2">
          By signing in, you confirm compliance with Shanthi Ayurvedas Branch Governance Policy.
        </p>
      </form>

      {/* Terms & Conditions Dialog Modal */}
      {showTermsModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-emerald-50/70 to-teal-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Branch Partner Terms & Conditions</h4>
                  <p className="text-[11px] text-slate-500">Shanthi Ayurvedas Branch Governance & Compliance Agreement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setPendingCredentials(null);
                  setHasAgreedTerms(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Terms Content */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs text-slate-600 leading-relaxed border-b border-slate-100 scrollbar-thin">
              <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-[11.5px]">
                <strong>Important Notice:</strong> By logging into this portal with the account created by Central Administration, you acknowledge that you represent an authorized branch or franchise hub of Shanthi Ayurvedas.
              </div>

              <div className="space-y-3">
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    1. Patient Health Information & Data Privacy
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    All customer consultations, medical histories, prescription details, contact numbers, and follow-up notes are strictly confidential. Exporting, screenshotting, or disclosing customer data outside authorized CRM workflows is strictly prohibited.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    2. Authorized Branch Hub Operations
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    Your credentials authorize operations strictly within your assigned branch hub. Sharing account credentials, attempting unauthorized cross-branch operations, or tampering with records is a violation of franchise policy.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    3. Formulation Pricing & Standard Operating Procedures
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    All herbal formulations, proprietary oils, tonics, and treatment kits must be sold strictly at the approved MRP. Unauthorized price modifications, unrecorded cash discounts, or counterfeit product substitution will lead to immediate license termination.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    4. Telecalling & Consultation Ethics
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    Telecallers, managers, and staff must maintain professional medical decorum during patient calls. Prescriptions and wellness recommendations must strictly follow Shanthi Ayurvedas Vaidya guidance.
                  </p>
                </div>

                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    5. Stock Accountability & Audit Rights
                  </h5>
                  <p className="text-[11px] text-slate-600">
                    All inwards shipments, counter sales, courier dispatches (India Post / TPC), and stock adjustments must be faithfully registered on the same day. Central Administration reserves the right to audit branch inventory and system logs at any time.
                  </p>
                </div>
              </div>

              {/* Tick Button / Checkbox Agreement */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer select-none transition-colors hover:bg-emerald-100/70">
                <input
                  type="checkbox"
                  checked={hasAgreedTerms}
                  onChange={(e) => setHasAgreedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300 cursor-pointer"
                />
                <span className="text-[11.5px] font-semibold text-emerald-950 leading-relaxed">
                  I have read, understood, and agree to the Shanthi Ayurvedas Branch Terms of Service, Patient Privacy Policy, and Operational Standard Operating Procedures.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowTermsModal(false);
                  setPendingCredentials(null);
                  setHasAgreedTerms(false);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleConfirmLogin}
                disabled={!hasAgreedTerms || isLoading}
                isLoading={isLoading}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-4 py-2"
              >
                Accept & Login to CRM
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default LoginPage;
