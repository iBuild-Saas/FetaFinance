import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useAccounting } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { FileText, DollarSign, Calendar, Building } from "lucide-react";

type SupplierPayable = {
  supplier_id: string;
  supplier_name: string;
  email?: string;
  phone?: string;
  account_code: string;
  account_name: string;
  reference_document_type?: string;
  reference_document_id?: string;
  entry_date: string;
  due_date?: string;
  description?: string;
  reference?: string;
  balance: number;
  aging_bucket: string;
  days_overdue?: number;
};

type SupplierPayableAging = {
  supplier_id: string;
  supplier_name: string;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_balance: number;
};

const AccountsPayable = () => {
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const { data: companies } = useDatabase('companies');
  const { state } = useAccounting();
  
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [agingSummary, setAgingSummary] = useState<SupplierPayableAging[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'detail' | 'aging'>('aging');

  // Fetch supplier payables
  const fetchPayables = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 Fetching supplier payables for company:', activeCompany.id);
      
      const { data, error } = await supabase
        .from('supplier_payables')
        .select('*')
        .order('supplier_name', { ascending: true });
      
      console.log('📊 Supplier payables result:', { data, error });
      
      if (error) throw error;
      
      setPayables(data || []);
    } catch (err) {
      console.error('Error fetching payables:', err);
      toast({
        title: "Error",
        description: `Failed to fetch accounts payable: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch aging summary
  const fetchAgingSummary = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 Fetching supplier aging summary for company:', activeCompany.id);
      
      const { data, error } = await supabase
        .from('supplier_payables_aging')
        .select('*')
        .order('total_balance', { ascending: false });
      
      console.log('📊 Supplier aging summary result:', { data, error });
      
      if (error) throw error;
      
      setAgingSummary(data || []);
    } catch (err) {
      console.error('Error fetching aging summary:', err);
      toast({
        title: "Error",
        description: `Failed to fetch aging summary: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.id) {
      fetchPayables();
      fetchAgingSummary();
    }
  }, [activeCompany?.id]);

  const totalPayables = agingSummary.reduce((sum, item) => sum + item.total_balance, 0);

  return (
    <AppLayout title="Accounts Payable">
      <SEO title="Accounts Payable — FinanceHub" description="Track supplier payables and aging" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Accounts Payable</h1>
            <p className="text-muted-foreground">Track supplier balances and aging</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={view === 'aging' ? 'default' : 'outline'} 
              onClick={() => setView('aging')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Aging Summary
            </Button>
            <Button 
              variant={view === 'detail' ? 'default' : 'outline'} 
              onClick={() => setView('detail')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Detail Report
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayables.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${agingSummary.reduce((sum, item) => sum + item.current_amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">1-30 Days</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${agingSummary.reduce((sum, item) => sum + item.days_1_30, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Over 30 Days</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${agingSummary.reduce((sum, item) => sum + item.days_31_60 + item.days_61_90 + item.over_90_days, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aging Summary View */}
        {view === 'aging' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Supplier Aging Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Supplier</th>
                      <th className="text-right p-2 font-medium">Current</th>
                      <th className="text-right p-2 font-medium">1-30 Days</th>
                      <th className="text-right p-2 font-medium">31-60 Days</th>
                      <th className="text-right p-2 font-medium">61-90 Days</th>
                      <th className="text-right p-2 font-medium">Over 90 Days</th>
                      <th className="text-right p-2 font-medium">Total Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingSummary.map((supplier) => (
                      <tr key={supplier.supplier_id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{supplier.supplier_name}</td>
                        <td className="p-2 text-right text-green-600">
                          ${supplier.current_amount.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-yellow-600">
                          ${supplier.days_1_30.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-orange-600">
                          ${supplier.days_31_60.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          ${supplier.days_61_90.toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-red-700 font-medium">
                          ${supplier.over_90_days.toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-bold">
                          ${supplier.total_balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail View */}
        {view === 'detail' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detailed Payables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Supplier</th>
                      <th className="text-left p-2 font-medium">Account</th>
                      <th className="text-left p-2 font-medium">Reference</th>
                      <th className="text-left p-2 font-medium">Entry Date</th>
                      <th className="text-left p-2 font-medium">Due Date</th>
                      <th className="text-left p-2 font-medium">Aging</th>
                      <th className="text-right p-2 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payables.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{item.supplier_name}</div>
                            {item.email && <div className="text-sm text-muted-foreground">{item.email}</div>}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            <div>{item.account_code}</div>
                            <div className="text-muted-foreground">{item.account_name}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="text-sm">
                            {item.reference_document_type && (
                              <Badge variant="outline" className="mb-1">
                                {item.reference_document_type}
                              </Badge>
                            )}
                            <div>{item.reference || item.description}</div>
                          </div>
                        </td>
                        <td className="p-2 text-sm">
                          {new Date(item.entry_date).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-sm">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              item.aging_bucket === 'Current' ? 'default' :
                              item.aging_bucket === '1-30 Days' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {item.aging_bucket}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${item.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default AccountsPayable;
