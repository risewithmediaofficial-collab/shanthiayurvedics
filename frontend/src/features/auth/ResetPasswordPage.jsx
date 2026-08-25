import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import apiClient from '../../api/apiClient.js';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]).{10,}$/,
        'Requires uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || 'demo_reset_token';
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(resetSchema)
  });

  const onSubmit = async (data) => {
    try {
      setErrorMessage('');
      // In production calls reset password API
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Password reset failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h3>
        <p className="text-xs text-slate-500 mt-1">
          Create a secure password with 10+ characters, symbols and numbers
        </p>
      </div>

      {isSuccess ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-emerald-900">Password Updated</h4>
          <p className="text-xs text-emerald-700">
            Your password has been changed successfully. Redirecting to login...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}

          <Input
            label="New Password"
            type="password"
            placeholder="••••••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••••••"
            icon={Lock}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Update Password
          </Button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-slate-600 hover:text-slate-900">
              Cancel & Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default ResetPasswordPage;
