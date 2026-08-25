import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (email, pass = 'Password@12345') => {
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('password', pass, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setErrorMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Staff Sign In</h3>
        <p className="text-xs text-slate-500 mt-1">
          Access your branch CRM console with multi-factor authentication
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@shanthiayurvedas.com"
          icon={Mail}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••••••"
          icon={Lock}
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
          className="w-full py-2.5 text-sm"
          isLoading={isLoading}
          icon={ArrowRight}
          iconPosition="right"
        >
          Sign In to CRM
        </Button>
      </form>

      {/* Demo Credentials Quick Switcher */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Demo Staff Credentials (Click to fill)
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => handleQuickFill('owner@shanthiayurvedas.com')}
            className="px-2.5 py-1.5 text-left bg-slate-50 hover:bg-ayur-50 hover:text-ayur-800 rounded-lg border border-slate-200 transition-colors"
          >
            👑 <strong>Owner</strong> (All Access)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('manager.hosur@shanthiayurvedas.com')}
            className="px-2.5 py-1.5 text-left bg-slate-50 hover:bg-ayur-50 hover:text-ayur-800 rounded-lg border border-slate-200 transition-colors"
          >
            🏢 <strong>Manager</strong> (Hosur)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('telecaller.priya@shanthiayurvedas.com')}
            className="px-2.5 py-1.5 text-left bg-slate-50 hover:bg-ayur-50 hover:text-ayur-800 rounded-lg border border-slate-200 transition-colors"
          >
            📞 <strong>Telecaller</strong> (Priya)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('distributor@shanthiayurvedas.com')}
            className="px-2.5 py-1.5 text-left bg-slate-50 hover:bg-ayur-50 hover:text-ayur-800 rounded-lg border border-slate-200 transition-colors"
          >
            📊 <strong>Distributor</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
