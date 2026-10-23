import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2, MessageSquare, Mail, Truck, CheckCircle2, Shield, Key, BellRing } from 'lucide-react';
import apiClient from '../../api/apiClient.js';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { NotificationTestingPage } from './NotificationTestingPage.jsx';

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('integrations');
  const [selectedCourier, setSelectedCourier] = useState('INDIA_POST');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.indiapost.gov.in/v1');

  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/integrations');
      return res.data?.data;
    }
  });

  const updateCourierMutation = useMutation({
    mutationFn: (data) => apiClient.post('/integrations/courier', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setApiKey('');
    }
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation Switcher */}
      <div className="crm-table-wrap w-full max-w-full overflow-x-auto pb-1">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation min-h-[38px] ${
              activeTab === 'integrations'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Share2 className="w-4 h-4" />
            External Integrations & Webhooks
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('push')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer touch-manipulation min-h-[38px] ${
              activeTab === 'push'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BellRing className="w-4 h-4" />
            Web Push Notifications Testing Hub
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800">
              TEST TAB
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'push' ? (
        <NotificationTestingPage />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">External Integrations & Webhooks</h2>
            <p className="text-xs text-slate-500">
              Connect Meta Lead Ads, WhatsApp Cloud API, SMTP email servers, and courier logistics APIs
            </p>
          </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meta Lead Ads */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <Badge variant="emerald" size="sm">Active</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Meta Lead Ads Webhook</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Receives Facebook & Instagram leads with instant duplicate protection
            </p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg text-[10px] font-mono text-slate-600 break-all">
            {window.location.origin}/api/integrations/webhooks/meta
          </div>
        </Card>

        {/* WhatsApp Cloud API */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <Badge variant="emerald" size="sm">Connected</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">WhatsApp Business Cloud API</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dispatches order confirmation, AWB dispatch updates, and delivery alerts
            </p>
          </div>
          <div className="text-xs text-slate-600 font-medium">Provider: Meta Cloud API Engine</div>
        </Card>

        {/* SMTP Mailer */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <Badge variant="emerald" size="sm">Configured</Badge>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Transactional SMTP Mailer</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Automated invoice generation and staff password reset notifications
            </p>
          </div>
          <div className="text-xs text-slate-600 font-medium">Host: smtp.gmail.com:587</div>
        </Card>
      </div>

      {/* Courier Partner Credentials */}
      <Card title="Courier Logistics Credentials" subtitle="Store encrypted API tokens for Speed Post and Professional Courier">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateCourierMutation.mutate({
              code: selectedCourier,
              name: selectedCourier === 'INDIA_POST' ? 'India Post' : 'The Professional Courier',
              apiKey,
              apiEndpoint
            });
          }}
          className="space-y-4 max-w-xl"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCourier('INDIA_POST');
                setApiEndpoint('https://api.indiapost.gov.in/v1');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                selectedCourier === 'INDIA_POST' ? 'bg-ayur-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              India Post Speed Post
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCourier('PROFESSIONAL_COURIER');
                setApiEndpoint('https://api.tpcindia.com/v2');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                selectedCourier === 'PROFESSIONAL_COURIER' ? 'bg-ayur-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              The Professional Courier
            </button>
          </div>

          <Input
            label="API Base URL Endpoint *"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            required
          />

          <Input
            label="API Secret Key / Bearer Token *"
            type="password"
            placeholder="••••••••••••••••••••••••"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" isLoading={updateCourierMutation.isPending}>
            Save Carrier Credentials
          </Button>
        </form>
      </Card>
        </div>
      )}
    </div>
  );
}


export default IntegrationsPage;
