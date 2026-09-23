import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import LockOutlined from '@mui/icons-material/LockOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      await login({
        email: data.email?.trim(),
        password: data.password?.trim()
      });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async (identifier, pwd, roleName) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setValue('email', identifier, { shouldValidate: true });
      setValue('password', pwd, { shouldValidate: true });
      await login({
        email: identifier,
        password: pwd
      });
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || `Failed to sign in as ${roleName}`);
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

      {/* ── 1-CLICK QUICK ROLE SWITCHER / LOGIN ── */}
      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span className="text-amber-500">⚡</span>
            <span>4-Role Fast Account Logins</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Role-Isolated Desks</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 1. OWNER / SUPER ADMIN */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDirectLogin('shanthi@369', 'slim369', 'Owner (Super Admin)')}
            className="p-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:bg-amber-100/80 hover:border-amber-300 text-slate-900 text-xs flex flex-col items-start gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 text-left"
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-sm">👑</span>
              <span className="font-bold text-amber-950">1. Owner (Super Admin)</span>
            </div>
            <span className="text-[10px] text-amber-900/80 font-normal leading-tight">
              Manage all branches data, financials & assignments
            </span>
            <span className="text-[9px] font-mono font-medium text-amber-900 bg-amber-100/90 border border-amber-200/80 px-1.5 py-0.5 rounded mt-0.5">
              shanthi@369
            </span>
          </button>

          {/* 2. BRANCH DISTRIBUTOR */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDirectLogin('slim369', 'slim369', 'Branch Stock Distributor')}
            className="p-2.5 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:bg-emerald-100/80 hover:border-emerald-300 text-slate-900 text-xs flex flex-col items-start gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 text-left"
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-sm">🌿</span>
              <span className="font-bold text-emerald-950">2. Branch Distributor</span>
            </div>
            <span className="text-[10px] text-emerald-900/80 font-normal leading-tight">
              Manage branch stocks, warehouse ledger & transfers
            </span>
            <span className="text-[9px] font-mono font-medium text-emerald-900 bg-emerald-100/90 border border-emerald-200/80 px-1.5 py-0.5 rounded mt-0.5">
              slim369
            </span>
          </button>

          {/* 3. BRANCH MANAGER */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDirectLogin('shanthi ayurvedas office', 'slim369', 'Branch Manager')}
            className="p-2.5 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:bg-blue-100/80 hover:border-blue-300 text-slate-900 text-xs flex flex-col items-start gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 text-left"
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-sm">👔</span>
              <span className="font-bold text-blue-950">3. Branch Manager</span>
            </div>
            <span className="text-[10px] text-blue-900/80 font-normal leading-tight">
              Manage branch orders, packing & team callers
            </span>
            <span className="text-[9px] font-mono font-medium text-blue-900 bg-blue-100/90 border border-blue-200/80 px-1.5 py-0.5 rounded mt-0.5">
              shanthi ayurvedas office
            </span>
          </button>

          {/* 4. TELECALLER AGENT */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDirectLogin('sathish@shanthiayurvedas.com', 'Password@12345', 'Telecaller')}
            className="p-2.5 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:bg-purple-100/80 hover:border-purple-300 text-slate-900 text-xs flex flex-col items-start gap-1 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 text-left"
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-sm">🎧</span>
              <span className="font-bold text-purple-950">4. Telecaller Desk</span>
            </div>
            <span className="text-[10px] text-purple-900/80 font-normal leading-tight">
              Calling console, follow-ups & order creation
            </span>
            <span className="text-[9px] font-mono font-medium text-purple-900 bg-purple-100/90 border border-purple-200/80 px-1.5 py-0.5 rounded mt-0.5">
              sathish@shanthiayurvedas.com
            </span>
          </button>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
          Or Enter Credentials
        </span>
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
          placeholder="e.g. shanthi@369, slim369, or email"
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

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-ayur-600 focus:ring-ayur-500"
            />
            <span>Remember session</span>
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-ayur-700 hover:text-ayur-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

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

      </form>

    </div>
  );
}

export default LoginPage;
