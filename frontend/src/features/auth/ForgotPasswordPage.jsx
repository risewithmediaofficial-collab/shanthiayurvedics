import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Reset Password</h3>
        <p className="text-xs text-slate-500 mt-1">
          Enter your staff email to receive secure recovery instructions
        </p>
      </div>

      {isSubmitted ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-emerald-900">Recovery Link Sent</h4>
          <p className="text-xs text-emerald-700">
            If an account exists for <span className="font-semibold">{email}</span>, a secure password reset link has been dispatched.
          </p>
          <div className="pt-2">
            <Link to="/login" className="crm-btn-secondary text-xs">
              Back to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Staff Email"
            type="email"
            placeholder="name@shanthiayurvedas.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Send Reset Instructions
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

export default ForgotPasswordPage;
