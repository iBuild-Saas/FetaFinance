import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useAccounting } from "@/state/accounting";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Types
interface AccountMapping {
  transaction_type: string;
  mapping_key: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description?: string;
}

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
}

interface AccountMappingForm {
  [key: string]: string;
}

const AccountMappings = () => {
  const { t } = useTranslation();
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase('companies');
  const { state } = useAccounting();
  
  // Get the active company from the navbar selection
  const activeCompany = companies?.find(c => c.id === state.activeCompanyId) || null;
  
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data for account mappings
  const [salesMappings, setSalesMappings] = useState<AccountMappingForm>({});
  const [purchaseMappings, setPurchaseMappings] = useState<AccountMappingForm>({});

  // Mapping configuration
  const mappingConfigs = {
    SALES_INVOICE: [
      {
        key: 'receivable_account',
        label: 'Accounts Receivable',
        description: 'Account to debit when creating sales invoices',
        accountTypes: ['ASSET']
      },
      {
        key: 'default_sales_account',
        label: 'Default Sales Revenue',
        description: 'Default account to credit for sales revenue (when item has no specific account)',
        accountTypes: ['INCOME', 'REVENUE']
      },
      {
        key: 'tax_payable_account',
        label: 'Tax Payable',
        description: 'Account to credit for sales tax collected',
        accountTypes: ['LIABILITY']
      }
    ],
    PURCHASE_INVOICE: [
      {
        key: 'payable_account',
        label: 'Accounts Payable',
        description: 'Account to credit when creating purchase invoices',
        accountTypes: ['LIABILITY']
      },
      {
        key: 'default_inventory_account',
        label: 'Default Inventory/Expense',
        description: 'Default account to debit for purchases (when item has no specific account)',
        accountTypes: ['ASSET', 'EXPENSE']
      },
      {
        key: 'tax_receivable_account',
        label: 'Tax Receivable',
        description: 'Account to debit for purchase tax paid',
        accountTypes: ['ASSET']
      }
    ]
  };

  // Fetch companies first
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch data when active company changes
  useEffect(() => {
    if (activeCompany) {
      fetchAccounts();
      fetchAccountMappings();
    }
  }, [activeCompany]);

  // Fetch chart of accounts
  const fetchAccounts = async () => {
    if (!activeCompany?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', activeCompany.id)
        .eq('is_active', true)
        .order('account_code');

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      toast({
        title: "Error",
        description: "Failed to fetch chart of accounts",
        variant: "destructive",
      });
    }
  };

  // Fetch existing account mappings
  const fetchAccountMappings = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_company_account_mappings', {
          p_company_id: activeCompany.id
        });

      if (error) {
        console.error('Error fetching account mappings:', error);
        if (error.message.includes('function get_company_account_mappings')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the CREATE_DYNAMIC_ACCOUNT_MAPPING.sql script first.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }
      
      setAccountMappings(data || []);
      
      // Populate form data
      const salesData: AccountMappingForm = {};
      const purchaseData: AccountMappingForm = {};
      
      (data || []).forEach((mapping: AccountMapping) => {
        if (mapping.transaction_type === 'SALES_INVOICE') {
          salesData[mapping.mapping_key] = mapping.account_id;
        } else if (mapping.transaction_type === 'PURCHASE_INVOICE') {
          purchaseData[mapping.mapping_key] = mapping.account_id;
        }
      });
      
      setSalesMappings(salesData);
      setPurchaseMappings(purchaseData);
      
    } catch (err) {
      console.error('Account mappings fetch error:', err);
      toast({
        title: "Error",
        description: "Failed to fetch account mappings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save account mappings
  const saveAccountMappings = async () => {
    if (!activeCompany?.id) return;
    
    try {
      setSaving(true);
      
      // Combine all mappings
      const allMappings = [
        ...Object.entries(salesMappings).map(([key, accountId]) => ({
          transaction_type: 'SALES_INVOICE',
          mapping_key: key,
          account_id: accountId,
          description: mappingConfigs.SALES_INVOICE.find(c => c.key === key)?.description
        })),
        ...Object.entries(purchaseMappings).map(([key, accountId]) => ({
          transaction_type: 'PURCHASE_INVOICE',
          mapping_key: key,
          account_id: accountId,
          description: mappingConfigs.PURCHASE_INVOICE.find(c => c.key === key)?.description
        }))
      ].filter(mapping => mapping.account_id); // Only save mappings with selected accounts
      
      // Save each mapping
      for (const mapping of allMappings) {
        const { error } = await supabase
          .rpc('set_account_mapping', {
            p_company_id: activeCompany.id,
            p_transaction_type: mapping.transaction_type,
            p_mapping_key: mapping.mapping_key,
            p_account_id: mapping.account_id,
            p_description: mapping.description
          });
          
        if (error) {
          console.error('Error saving mapping:', error);
          throw error;
        }
      }
      
      toast({
        title: "Success",
        description: "Account mappings saved successfully",
      });
      
      // Refresh the mappings
      fetchAccountMappings();
      
    } catch (err) {
      console.error('Error saving account mappings:', err);
      toast({
        title: "Error",
        description: "Failed to save account mappings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter accounts by type
  const getAccountsByType = (accountTypes: string[]) => {
    return accounts.filter(account => 
      accountTypes.includes(account.account_type.toUpperCase())
    );
  };

  // Get account display name
  const getAccountDisplay = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : '';
  };

  // Check if mapping is complete
  const isMappingComplete = (transactionType: string) => {
    const configs = mappingConfigs[transactionType as keyof typeof mappingConfigs];
    const mappings = transactionType === 'SALES_INVOICE' ? salesMappings : purchaseMappings;
    
    return configs.every(config => mappings[config.key]);
  };

  if (!activeCompany) {
    return (
      <AppLayout title={t("accountMappings.title")}>
        <SEO title={`${t("accountMappings.title")} â€” FinanceHub`} description={t("accountMappings.description")} />
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("accountMappings.selectCompany")}</h3>
          <p className="text-muted-foreground">{t("accountMappings.selectCompanyDescription")}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t("accountMappings.title")}>
      <SEO title={`${t("accountMappings.title")} â€” FinanceHub`} description={t("accountMappings.description")} />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-semibold">{t("accountMappings.title")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {activeCompany.name}
            </Badge>
            <Button onClick={saveAccountMappings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("accountMappings.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("accountMappings.saveMapping")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Information Card */}


        {/* Main Content Tabs */}
        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <span>{t("accountMappings.salesInvoiceMapping")}</span>
              {isMappingComplete('SALES_INVOICE') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
            </TabsTrigger>
            <TabsTrigger value="purchase" className="flex items-center gap-2">
              <span>{t("accountMappings.purchaseInvoiceMapping")}</span>
              {isMappingComplete('PURCHASE_INVOICE') ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
            </TabsTrigger>
            <TabsTrigger value="current">{t("accountMappings.currentMappings")}</TabsTrigger>
          </TabsList>

          {/* Sales Invoice Mappings */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                                     {t("accountMappings.salesInvoiceMapping")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mappingConfigs.SALES_INVOICE.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <Label className="text-sm font-medium">{config.label} *</Label>
                    <Select 
                      value={salesMappings[config.key] || ''} 
                      onValueChange={(value) => setSalesMappings(prev => ({...prev, [config.key]: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${config.label.toLowerCase()} account`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountsByType(config.accountTypes).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {account.account_type}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Invoice Mappings */}
          <TabsContent value="purchase" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                                     {t("accountMappings.purchaseInvoiceMapping")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mappingConfigs.PURCHASE_INVOICE.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <Label className="text-sm font-medium">{config.label} *</Label>
                    <Select 
                      value={purchaseMappings[config.key] || ''} 
                      onValueChange={(value) => setPurchaseMappings(prev => ({...prev, [config.key]: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${config.label.toLowerCase()} account`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountsByType(config.accountTypes).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {account.account_type}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Current Mappings */}
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                                     {t("accountMappings.currentMappings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                         <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                                                 <TableHead>{t("common.type")}</TableHead>
                         <TableHead>{t("accountMappings.mapping")}</TableHead>
                         <TableHead>{t("common.account")}</TableHead>
                         <TableHead>{t("common.description")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountMappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                         {t("accountMappings.noMappingsConfigured")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        accountMappings.map((mapping, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="outline">
                                {mapping.transaction_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {mappingConfigs[mapping.transaction_type as keyof typeof mappingConfigs]
                                ?.find(c => c.key === mapping.mapping_key)?.label || mapping.mapping_key}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-mono text-sm">{mapping.account_code}</div>
                                <div className="text-sm text-muted-foreground">{mapping.account_name}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {mapping.description}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AccountMappings;
