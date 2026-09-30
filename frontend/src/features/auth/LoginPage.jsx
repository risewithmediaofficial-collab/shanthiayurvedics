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
        password: data.password
      });
      navigate(from, { replace: true });
    } catch (err) {
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

      </form>

    </div>
  );
}

export default LoginPage;
