'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildApiUrl, createAuthHeaders } from '@/lib/xskill-api';
import { loadRazorpayCheckout } from '@/lib/razorpay';
import { ArrowDownLeft, ArrowUpRight, CreditCard, IndianRupee, Wallet } from 'lucide-react';

interface PaymentSummary {
  role: 'client' | 'student' | 'admin';
  currency: string;
  total_expense?: number;
  platform_fees_paid?: number;
  paid_to_students?: number;
  pending_amount?: number;
  total_income?: number;
  gross_received?: number;
  platform_fees_deducted?: number;
  pending_income?: number;
}

interface PaymentTransaction {
  id: number;
  trial_id: number;
  status: 'paid' | 'pending';
  method: string;
  date: string;
  gross_amount: number;
  platform_fee: number;
  student_amount: number;
  client_name?: string;
  student_name?: string;
}

interface TrialItem {
  id: number;
  status: string;
  task_description: string;
  student_name?: string;
}

export default function Payments() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<string>('');
  const [amount, setAmount] = useState<string>('1000');
  const [isPaying, setIsPaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isClient = user?.role === 'client';
  const isStudent = user?.role === 'student';

  const loadSummary = async () => {
    const res = await fetch(buildApiUrl('/api/payments/summary'), {
      headers: createAuthHeaders(false),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load payment summary');
    setSummary(data.summary || null);
    setTransactions(data.transactions || []);
  };

  const loadTrials = async () => {
    if (!isClient) return;
    const res = await fetch(buildApiUrl('/api/trials'), {
      headers: createAuthHeaders(false),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load trials');
    const eligible = (data.trials || []).filter((trial: TrialItem) =>
      ['In Progress', 'Submitted', 'Approved'].includes(trial.status)
    );
    setTrials(eligible);
    if (eligible.length > 0) {
      setSelectedTrialId(String(eligible[0].id));
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadSummary(), loadTrials()]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isClient]);

  const paidTransactions = useMemo(
    () => transactions.filter((tx) => tx.status === 'paid'),
    [transactions]
  );

  const totalPaidVolume = useMemo(
    () => paidTransactions.reduce((acc, tx) => acc + tx.gross_amount, 0),
    [paidTransactions]
  );

  const openUpiPayment = async () => {
    if (!selectedTrialId || !amount) {
      window.alert('Please select a trial and amount.');
      return;
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      window.alert('Enter a valid amount.');
      return;
    }

    setIsPaying(true);
    try {
      const orderRes = await fetch(buildApiUrl('/api/payments/create-order'), {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          trial_id: Number(selectedTrialId),
          amount: amountNumber,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create UPI order');
      }

      const loaded = await loadRazorpayCheckout();
      if (!loaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load');
      }

      const rzp = new window.Razorpay({
        key: orderData.gateway.key_id,
        amount: orderData.gateway.amount,
        currency: orderData.gateway.currency,
        order_id: orderData.gateway.order_id,
        name: 'XSkill',
        description: `Trial #${selectedTrialId} payment`,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        notes: {
          trial_id: String(selectedTrialId),
        },
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          const verifyRes = await fetch(buildApiUrl('/api/payments/verify'), {
            method: 'POST',
            headers: createAuthHeaders(),
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.error || 'Payment verification failed');
          }
          await loadSummary();
          window.alert('UPI payment completed successfully.');
        },
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
      });

      rzp.open();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  const formatCurrency = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Payments (UPI)</h1>
        <p className="text-muted-foreground mt-1">
          {isClient ? 'Pay students via UPI. Platform fee is 10% per transaction.' : 'Track your real income from completed UPI transactions.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">{isClient ? 'Total Expense' : 'Total Income'}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(isClient ? summary?.total_expense || 0 : summary?.total_income || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {isClient ? 'Platform Fees (10%)' : 'Fees Deducted'}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(isClient ? summary?.platform_fees_paid || 0 : summary?.platform_fees_deducted || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paid Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPaidVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isClient && (
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Create UPI Payment</CardTitle>
            <CardDescription>Only UPI payments are enabled. Cards and netbanking are disabled.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Trial</Label>
                <Select value={selectedTrialId} onValueChange={setSelectedTrialId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trial" />
                  </SelectTrigger>
                  <SelectContent>
                    {trials.map((trial) => (
                      <SelectItem key={trial.id} value={String(trial.id)}>
                        #{trial.id} - {trial.student_name || 'Student'} ({trial.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (INR)</Label>
                <Input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <Button onClick={openUpiPayment} disabled={isPaying || !selectedTrialId}>
              {isPaying ? 'Processing...' : 'Pay Using UPI'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>{isLoading ? 'Loading...' : `${transactions.length} records`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent p-2">
                  {isClient ? <ArrowUpRight className="w-4 h-4 text-red-500" /> : <ArrowDownLeft className="w-4 h-4 text-emerald-500" />}
                </div>
                <div>
                  <p className="font-medium">
                    Trial #{tx.trial_id} {isClient ? `to ${tx.student_name || 'student'}` : `from ${tx.client_name || 'client'}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={tx.status === 'paid' ? 'default' : 'secondary'}>{tx.status}</Badge>
                <p className="text-sm mt-1">{formatCurrency(isClient ? tx.gross_amount : tx.student_amount)}</p>
              </div>
            </div>
          ))}
          {!isLoading && transactions.length === 0 && (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
