import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useAccounting } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Building2, Settings, CreditCard, Mail, Save, Upload, Image, X, Info } from "lucide-react";
import { useSupabase } from "@/contexts/SupabaseContext";

type ViewMode = "list" | "add" | "detail";

const Companies = () => {
  const { state, dispatch } = useAccounting();
  const { data: companies, loading, error, create, update, remove: removeFromDb, fetchAll } = useDatabase('companies');
  const { supabase } = useSupabase();
  
  // State for company with account details
  const [selectedCompanyWithAccounts, setSelectedCompanyWithAccounts] = useState<any>(null);
  
  // Function to fetch company with account details
  const fetchCompanyWithAccounts = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          default_inventory_account:default_inventory_account_id(account_code, account_name),
          accounts_payable:accounts_payable_account_id(account_code, account_name),
          default_sales_revenue:default_sales_revenue_account_id(account_code, account_name),
          accounts_receivable:accounts_receivable_account_id(account_code, account_name),
          sales_tax_payable:sales_tax_payable_account_id(account_code, account_name)
        `)
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      console.log('Company with accounts:', data); // Debug log
      setSelectedCompanyWithAccounts(data);
    } catch (error) {
      console.error('Error fetching company with accounts:', error);
      setSelectedCompanyWithAccounts(null);
    }
  };
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const hasMounted = useRef(false);
  
  // Comprehensive company form state
  const [companyForm, setCompanyForm] = useState({
    name: "",
    description: "",
    industry: "",
    companySize: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    currency: "lyd",
    fiscalYearStart: "",
    taxId: "",
    multiCurrency: false,
    inventoryTracking: true,
    autoBackup: true,
    timezone: "",
  });
  const [logo, setLogo] = useState<string | null>(null);

  // Fetch companies from database when component mounts (only once)
  useEffect(() => {
    if (!hasMounted.current) {
      console.log('Fetching companies from database...');
      fetchAll();
      hasMounted.current = true;
    }
  }, []); // Empty dependency array to run only once

  // Sync active company from local state to database companies
  useEffect(() => {
    console.log('[Companies] useEffect triggered - companies:', companies?.length, 'activeCompanyId:', state.activeCompanyId);
    if (companies && companies.length > 0 && state.activeCompanyId) {
      const activeCompany = companies.find(c => c.id === state.activeCompanyId);
      if (!activeCompany) {
        // If active company doesn't exist in database, set first company as active
        console.log('[Companies] Setting first company as active:', companies[0].id);
        dispatch({ type: "SET_ACTIVE_COMPANY", id: companies[0].id });
      }
    }
  }, [companies, state.activeCompanyId, dispatch]);

  // Debug: Track companies data changes
  useEffect(() => {
    console.log('[Companies] Companies data changed:', {
      count: companies?.length,
      ids: companies?.map(c => c.id),
      loading,
      error
    });
  }, [companies, loading, error]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        
        // Compress the logo to reduce storage size
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          const img = new Image();
          
          img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;
            const maxSize = 400; // Increased from 200 to 400
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // Increased quality from 0.7 to 0.8
            setLogo(compressedDataUrl);
          };
          
          img.src = result;
        } catch (error) {
          console.warn('Failed to compress logo, using original:', error);
          setLogo(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
  };

  const resetForm = () => {
    setCompanyForm({
      name: "",
      description: "",
      industry: "",
      companySize: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      currency: "lyd",
      fiscalYearStart: "",
      taxId: "",
      multiCurrency: false,
      inventoryTracking: true,
      autoBackup: true,
      timezone: "",
    });
    setLogo(null);
  };

  const add = async () => {
    const trimmed = companyForm.name.trim();
    if (!trimmed) return;
    
    setIsSaving(true);
    
    try {
      // Map form fields to database fields (camelCase to snake_case)
      const companyData = {
        name: trimmed,
        logo: logo || undefined,
        description: companyForm.description,
        industry: companyForm.industry,
        company_size: companyForm.companySize,
        email: companyForm.email,
        phone: companyForm.phone,
        address: companyForm.address,
        city: companyForm.city,
        state: companyForm.state,
        zip: companyForm.zip,
        country: companyForm.country,
        currency: companyForm.currency,
        fiscal_year_start: companyForm.fiscalYearStart,
        tax_id: companyForm.taxId,
        multi_currency: companyForm.multiCurrency,
        inventory_tracking: companyForm.inventoryTracking,
        auto_backup: companyForm.autoBackup,
        timezone: companyForm.timezone,
      };
      
      const result = await create(companyData);
      console.log('Company created successfully:', result);
      
      resetForm();
      setView("list");
    } catch (error) {
      console.error('Error creating company:', error);
      // You could add toast notification here
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await removeFromDb(id);
      setView("list");
    } catch (error) {
      console.error('Error deleting company:', error);
      // You could add toast notification here
    }
  };
  const startAdd = () => { resetForm(); setView("add"); };
  const startDetail = (id: string) => { 
    setSelectedId(id); 
    setView("detail"); 
    fetchCompanyWithAccounts(id);
  };
  const backToList = () => { setSelectedId(undefined); setView("list"); };

  const selected = companies.find(c => c.id === selectedId);

  return (
    <AppLayout title="Companies">
      <SEO title="Companies — FMS" description="Add and manage companies for multi-company accounting." />
      <div className="grid gap-6">
        {view === "list" && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Companies</CardTitle>
              <div className="flex gap-2">
                <Button onClick={fetchAll} variant="outline" size="sm">
                  Refresh
                </Button>
                <Button onClick={startAdd}>Add New</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading companies...</p>
              ) : error ? (
                <div className="text-red-600">
                  <p>Error loading companies: {error}</p>
                  <Button onClick={fetchAll} variant="outline" className="mt-2">Retry</Button>
                </div>
              ) : companies.length === 0 ? (
                <p className="text-muted-foreground">No companies yet.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                    <span className="col-span-2">Logo</span>
                    <span className="col-span-6">Company Details</span>
                    <span className="col-span-4">Actions</span>
                  </div>
                  <div className="divide-y">
                    {companies.map(c => (
                      <div key={c.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                        <div className="col-span-2 flex justify-center">
                          {c.logo ? (
                            <img 
                              src={c.logo} 
                              alt={`${c.name} Logo`}
                              className="w-10 h-10 rounded-lg object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <button className="col-span-6 text-left hover:underline" onClick={() => startDetail(c.id)}>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {c.industry && `${c.industry} • `}
                            {c.company_size && `${c.company_size} • `}
                            {c.currency && c.currency.toUpperCase()}
                          </div>
                          {state.activeCompanyId === c.id && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              Active
                            </span>
                          )}
                        </button>
                        <div className="col-span-4 text-right space-x-2">
                          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: c.id })}>Set Active</Button>
                          <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {view === "add" && (
          <div className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Company Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Section */}
                <div className="space-y-8 w-full">
                  <div className="text-center">
                    <Label className="text-xl font-semibold text-foreground">Company Logo</Label>
                    <p className="text-sm text-muted-foreground mt-1">Upload your company logo to personalize your experience</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center gap-8 w-full">
                    {logo ? (
                      <div className="relative">
                        <img 
                          src={logo} 
                          alt="Company Logo" 
                          className="w-48 h-48 rounded-2xl object-cover border-2 border-border shadow-xl"
                        />
                        <button
                          onClick={removeLogo}
                          className="absolute -top-4 -right-4 w-10 h-10 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                        <Image className="w-20 h-20 text-muted-foreground" />
                      </div>
                    )}
                    
                    <div className="space-y-4 text-center">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors cursor-pointer font-semibold text-base shadow-lg"
                      >
                        <Upload className="w-6 h-6" />
                        {logo ? "Change Logo" : "Upload Logo"}
                      </label>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Recommended: 400x400px or larger, PNG or JPG format. Logo will be automatically resized and optimized.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input 
                      id="company-name" 
                      placeholder="Enter company name"
                      value={companyForm.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-description">Description</Label>
                    <Input 
                      id="company-description" 
                      placeholder="Brief description"
                      value={companyForm.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={companyForm.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select value={companyForm.companySize} onValueChange={(value) => handleInputChange("companySize", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="500+">500+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <CardTitle>Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="company@example.com"
                      value={companyForm.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+1 (555) 123-4567"
                      value={companyForm.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea 
                    id="address" 
                    placeholder="Enter company address"
                    value={companyForm.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      placeholder="City"
                      value={companyForm.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input 
                      id="state" 
                      placeholder="State"
                      value={companyForm.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP/Postal Code</Label>
                    <Input 
                      id="zip" 
                      placeholder="12345"
                      value={companyForm.zip}
                      onChange={(e) => handleInputChange("zip", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={companyForm.country} onValueChange={(value) => handleInputChange("country", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Financial Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle>Financial Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select value={companyForm.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lyd">LYD - Libyan Dinar</SelectItem>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                        <SelectItem value="eur">EUR - Euro</SelectItem>
                        <SelectItem value="gbp">GBP - British Pound</SelectItem>
                        <SelectItem value="cad">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="aud">AUD - Australian Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fiscal-year">Fiscal Year Start</Label>
                    <Select value={companyForm.fiscalYearStart} onValueChange={(value) => handleInputChange("fiscalYearStart", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="january">January</SelectItem>
                        <SelectItem value="april">April</SelectItem>
                        <SelectItem value="july">July</SelectItem>
                        <SelectItem value="october">October</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-id">Tax ID / EIN</Label>
                  <Input 
                    id="tax-id" 
                    placeholder="12-3456789"
                    value={companyForm.taxId}
                    onChange={(e) => handleInputChange("taxId", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle>System Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Multi-currency Support</Label>
                    <p className="text-sm text-muted-foreground">Allow transactions in multiple currencies</p>
                  </div>
                  <Switch 
                    checked={companyForm.multiCurrency}
                    onCheckedChange={(checked) => handleInputChange("multiCurrency", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Inventory Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track inventory levels and costs</p>
                  </div>
                  <Switch 
                    checked={companyForm.inventoryTracking}
                    onCheckedChange={(checked) => handleInputChange("inventoryTracking", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-backup</Label>
                    <p className="text-sm text-muted-foreground">Automatically backup data daily</p>
                  </div>
                  <Switch 
                    checked={companyForm.autoBackup}
                    onCheckedChange={(checked) => handleInputChange("autoBackup", checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={companyForm.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={backToList} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={add} disabled={isSaving || !companyForm.name.trim()} className="min-w-[120px]">
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Company
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {view === "detail" && selected && (
          <div className="space-y-6">
            {/* Company Header */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  {selected.logo ? (
                    <img 
                      src={selected.logo} 
                      alt={`${selected.name} Logo`}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-border shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-2xl">{selected.name}</CardTitle>
                    {selected.description && (
                      <p className="text-muted-foreground mt-1">{selected.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={backToList}>Back</Button>
                  <Button 
                    onClick={() => window.location.href = `/company-settings`}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button variant="destructive" onClick={() => { remove(selected.id); }}>Delete</Button>
                </div>
              </CardHeader>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle>Company Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Industry</div>
                    <div className="mt-1 font-medium">{selected.industry || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Company Size</div>
                    <div className="mt-1 font-medium">{selected.company_size || "Not specified"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="mt-1 font-medium">{selected.description || "No description provided"}</div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <CardTitle>Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Email Address</div>
                    <div className="mt-1 font-medium">{selected.email || "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone Number</div>
                    <div className="mt-1 font-medium">{selected.phone || "Not specified"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Address</div>
                  <div className="mt-1 font-medium">{selected.address || "Not specified"}</div>
                  {(selected.city || selected.state || selected.zip || selected.country) && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {[selected.city, selected.state, selected.zip, selected.country].filter(Boolean).join(", ") || "No additional address details"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <CardTitle>Financial Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Default Currency</div>
                    <div className="mt-1 font-medium">{selected.currency ? selected.currency.toUpperCase() : "Not specified"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fiscal Year Start</div>
                    <div className="mt-1 font-medium">{selected.fiscal_year_start ? selected.fiscal_year_start.charAt(0).toUpperCase() + selected.fiscal_year_start.slice(1) : "Not specified"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tax ID / EIN</div>
                  <div className="mt-1 font-medium">{selected.tax_id || "Not specified"}</div>
                </div>
              </CardContent>
            </Card>

            {/* System Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle>System Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Multi-currency Support</div>
                      <div className="text-sm text-muted-foreground">Allow transactions in multiple currencies</div>
                    </div>
                    <div className="flex items-center">
                      {selected.multi_currency ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Inventory Tracking</div>
                      <div className="text-sm text-muted-foreground">Track inventory levels and costs</div>
                    </div>
                    <div className="flex items-center">
                      {selected.inventory_tracking ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Auto-backup</div>
                      <div className="text-sm text-muted-foreground">Automatically backup data daily</div>
                    </div>
                    <div className="flex items-center">
                      {selected.auto_backup ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-muted-foreground">Time Zone</div>
                    <div className="mt-1 font-medium">{selected.timezone || "Not specified"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Default Accounts Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <CardTitle>Default Accounts Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6">
                {!selectedCompanyWithAccounts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* Purchase Invoice Accounts */}
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                        Purchase Invoice Defaults
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Inventory/Expense Account</div>
                          <div className="mt-1 font-medium">
                            {selectedCompanyWithAccounts?.default_inventory_account ? 
                              `${selectedCompanyWithAccounts.default_inventory_account.account_code} - ${selectedCompanyWithAccounts.default_inventory_account.account_name}` : 
                              'Not Set'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Accounts Payable</div>
                          <div className="mt-1 font-medium">
                            {selectedCompanyWithAccounts?.accounts_payable ? 
                              `${selectedCompanyWithAccounts.accounts_payable.account_code} - ${selectedCompanyWithAccounts.accounts_payable.account_name}` : 
                              'Not Set'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sales Invoice Accounts */}
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                        Sales Invoice Defaults
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Sales Revenue Account</div>
                          <div className="mt-1 font-medium">
                            {selectedCompanyWithAccounts?.default_sales_revenue ? 
                              `${selectedCompanyWithAccounts.default_sales_revenue.account_code} - ${selectedCompanyWithAccounts.default_sales_revenue.account_name}` : 
                              'Not Set'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Accounts Receivable</div>
                          <div className="mt-1 font-medium">
                            {selectedCompanyWithAccounts?.accounts_receivable ? 
                              `${selectedCompanyWithAccounts.accounts_receivable.account_code} - ${selectedCompanyWithAccounts.accounts_receivable.account_name}` : 
                              'Not Set'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Sales Tax Payable</div>
                          <div className="mt-1 font-medium">
                            {selectedCompanyWithAccounts?.sales_tax_payable ? 
                              `${selectedCompanyWithAccounts.sales_tax_payable.account_code} - ${selectedCompanyWithAccounts.sales_tax_payable.account_name}` : 
                              'Not Set'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Information Note */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">How to Update Default Accounts:</p>
                          <p className="mt-1">
                            Default accounts are automatically synced from your Account Mappings configuration. 
                            To change these accounts, update your Account Mappings in the Account Mappings section.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: selected.id })}>
                      Set Active
                    </Button>
                    {state.activeCompanyId === selected.id && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        Currently Active
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={() => window.location.href = `/company-settings`}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Companies;
