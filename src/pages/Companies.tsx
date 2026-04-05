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
import { Link, useNavigate } from "react-router-dom";
import { Building2, Settings, CreditCard, Mail, Save, Upload, Image as ImageIcon, X, Users, Package, BarChart3, BookOpen, ArrowRight, ShoppingCart, MapPin, Boxes, RefreshCw } from "lucide-react";
import { db } from "@/lib/database-client";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "add" | "detail";

type CompanyWorkspaceStats = {
  customers: number;
  suppliers: number;
  items: number;
  accounts: number;
  invoices: number;
  journals: number;
};

const emptyStats: CompanyWorkspaceStats = {
  customers: 0,
  suppliers: 0,
  items: 0,
  accounts: 0,
  invoices: 0,
  journals: 0,
};

const Companies = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useAccounting();
  const { data: companies, loading, error, create, remove: removeFromDb, fetchAll } = useDatabase("companies");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState<CompanyWorkspaceStats>(emptyStats);
  const hasMounted = useRef(false);

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

  useEffect(() => {
    if (!hasMounted.current) {
      fetchAll();
      hasMounted.current = true;
    }
  }, []);

  useEffect(() => {
    if (companies && companies.length > 0 && state.activeCompanyId) {
      const activeCompany = companies.find((company) => company.id === state.activeCompanyId);
      if (!activeCompany) {
        dispatch({ type: "SET_ACTIVE_COMPANY", id: companies[0].id });
      }
    }
  }, [companies, state.activeCompanyId, dispatch]);

  const selected = companies.find((company) => company.id === selectedId);

  const handleInputChange = (field: string, value: string | boolean) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();

      img.onload = () => {
        let { width, height } = img;
        const maxSize = 400;

        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        setLogo(canvas.toDataURL("image/jpeg", 0.82));
      };

      img.src = result;
    };
    reader.readAsDataURL(file);
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
      await create({
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
      });

      resetForm();
      setView("list");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: string) => {
    await removeFromDb(id);
    setWorkspaceStats(emptyStats);
    setView("list");
  };

  const fetchTableCount = async (table: string, companyId: string) => {
    try {
      const { data, error: queryError } = await db.from(table).select("*").eq("company_id", companyId);
      if (queryError) return 0;
      return data?.length || 0;
    } catch {
      return 0;
    }
  };

  const loadCompanyWorkspace = async (companyId: string) => {
    setWorkspaceLoading(true);
    try {
      const [customers, suppliers, items, accounts, invoices, journals] = await Promise.all([
        fetchTableCount("customers", companyId),
        fetchTableCount("suppliers", companyId),
        fetchTableCount("items", companyId),
        fetchTableCount("chart_of_accounts", companyId),
        fetchTableCount("sales_invoices", companyId),
        fetchTableCount("journal_entries", companyId),
      ]);

      setWorkspaceStats({ customers, suppliers, items, accounts, invoices, journals });
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const startAdd = () => {
    resetForm();
    setView("add");
  };

  const startDetail = async (id: string) => {
    setSelectedId(id);
    setView("detail");
    dispatch({ type: "SET_ACTIVE_COMPANY", id });
    await loadCompanyWorkspace(id);
  };

  const backToList = () => {
    setSelectedId(undefined);
    setWorkspaceStats(emptyStats);
    setView("list");
  };

  const openCompanyArea = (path: string) => {
    if (selected?.id) {
      dispatch({ type: "SET_ACTIVE_COMPANY", id: selected.id });
    }
    navigate(path);
  };

  const statCards = [
    { label: "Customers", value: workspaceStats.customers, icon: Users },
    { label: "Suppliers", value: workspaceStats.suppliers, icon: ShoppingCart },
    { label: "Items", value: workspaceStats.items, icon: Package },
    { label: "Accounts", value: workspaceStats.accounts, icon: BookOpen },
    { label: "Sales", value: workspaceStats.invoices, icon: BarChart3 },
    { label: "Journals", value: workspaceStats.journals, icon: CreditCard },
  ];

  const areaCards = [
    { title: "Customers", description: "View customer records and activity.", path: "/customers", icon: Users },
    { title: "Suppliers", description: "Open supplier records for this company.", path: "/suppliers", icon: ShoppingCart },
    { title: "Inventory", description: "Manage items, stock, and inventory movement.", path: "/inventory", icon: Boxes },
    { title: "Sales", description: "Review invoices and sales activity.", path: "/invoices", icon: BarChart3 },
    { title: "Accounts", description: "Open chart of accounts and mappings.", path: "/accounts", icon: BookOpen },
    { title: "Reports", description: "See company reports and balances.", path: "/reports", icon: CreditCard },
  ];

  return (
    <AppLayout title="Companies">
      <SEO title="Companies - FMS" description="Add and manage companies for multi-company accounting." />

      <div className="grid gap-6">
        {view === "list" && (
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Companies</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground">Manage companies and open a company workspace.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchAll} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={startAdd}>Add Company</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading companies...</p>
              ) : error ? (
                <div className="text-red-600">
                  <p>Error loading companies: {error}</p>
                  <Button onClick={fetchAll} variant="outline" className="mt-3">Retry</Button>
                </div>
              ) : companies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-8 text-center text-muted-foreground">
                  No companies yet.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {companies.map((company) => (
                    <Card key={company.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <button className="flex min-w-0 flex-1 items-start gap-4 text-left" onClick={() => startDetail(company.id)}>
                            {company.logo ? (
                              <img src={company.logo} alt={`${company.name} Logo`} className="h-14 w-14 rounded-2xl object-cover border border-border" />
                            ) : (
                              <div className="metric-icon-shell flex h-14 w-14 items-center justify-center rounded-2xl">
                                <Building2 className="h-6 w-6 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-lg font-semibold text-foreground">{company.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{company.industry || "No industry set"}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {state.activeCompanyId === company.id && (
                                  <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">Active</span>
                                )}
                                {company.currency && (
                                  <span className="rounded-full bg-background-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{company.currency.toUpperCase()}</span>
                                )}
                                {company.company_size && (
                                  <span className="rounded-full bg-background-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{company.company_size}</span>
                                )}
                              </div>
                            </div>
                          </button>

                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: company.id })}>
                              Set Active
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => remove(company.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-background-secondary px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Contact</p>
                            <p className="mt-2 text-sm text-foreground">{company.email || company.phone || "Not set"}</p>
                          </div>
                          <div className="rounded-2xl bg-background-secondary px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Location</p>
                            <p className="mt-2 text-sm text-foreground">{[company.city, company.country].filter(Boolean).join(", ") || "Not set"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {view === "add" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-5 rounded-2xl bg-background-secondary p-6">
                  {logo ? (
                    <div className="relative">
                      <img src={logo} alt="Company Logo" className="h-36 w-36 rounded-2xl object-cover border border-border" />
                      <button
                        onClick={() => setLogo(null)}
                        className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-36 w-36 items-center justify-center rounded-2xl border border-dashed border-border bg-card">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  <div className="text-center">
                    <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <label htmlFor="logo-upload" className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      <Upload className="h-4 w-4" />
                      {logo ? "Change Logo" : "Upload Logo"}
                    </label>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={companyForm.name} onChange={(e) => handleInputChange("name", e.target.value)} placeholder="Enter company name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={companyForm.industry} onValueChange={(value) => handleInputChange("industry", value)}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={companyForm.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Short description" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={companyForm.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="company@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={companyForm.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="+218..." />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={companyForm.country} onChange={(e) => handleInputChange("country", e.target.value)} placeholder="Country" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={companyForm.city} onChange={(e) => handleInputChange("city", e.target.value)} placeholder="City" />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={companyForm.currency} onChange={(e) => handleInputChange("currency", e.target.value)} placeholder="LYD" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax ID</Label>
                    <Input value={companyForm.taxId} onChange={(e) => handleInputChange("taxId", e.target.value)} placeholder="Tax ID" />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input value={companyForm.timezone} onChange={(e) => handleInputChange("timezone", e.target.value)} placeholder="Africa/Tripoli" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-4">
                    <Label>Multi-currency</Label>
                    <Switch checked={companyForm.multiCurrency} onCheckedChange={(checked) => handleInputChange("multiCurrency", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-4">
                    <Label>Inventory Tracking</Label>
                    <Switch checked={companyForm.inventoryTracking} onCheckedChange={(checked) => handleInputChange("inventoryTracking", checked)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-background-secondary px-4 py-4">
                    <Label>Auto Backup</Label>
                    <Switch checked={companyForm.autoBackup} onCheckedChange={(checked) => handleInputChange("autoBackup", checked)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={backToList} disabled={isSaving}>Cancel</Button>
                  <Button onClick={add} disabled={isSaving || !companyForm.name.trim()}>
                    {isSaving ? "Creating..." : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
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
            <Card className="overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-5">
                    {selected.logo ? (
                      <img src={selected.logo} alt={`${selected.name} Logo`} className="h-20 w-20 rounded-3xl object-cover border border-border" />
                    ) : (
                      <div className="metric-icon-shell flex h-20 w-20 items-center justify-center rounded-3xl">
                        <Building2 className="h-9 w-9 text-primary" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{selected.name}</h2>
                        {state.activeCompanyId === selected.id && (
                          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">Active company</span>
                        )}
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {selected.description || "Open the main areas of this company from one place and review the key setup details below."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="rounded-full bg-background-secondary px-3 py-1">{selected.industry || "Industry not set"}</span>
                        <span className="rounded-full bg-background-secondary px-3 py-1">{selected.currency ? selected.currency.toUpperCase() : "Currency not set"}</span>
                        <span className="rounded-full bg-background-secondary px-3 py-1">{selected.company_size || "Size not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={backToList}>Back</Button>
                    <Button variant="outline" onClick={() => loadCompanyWorkspace(selected.id)} disabled={workspaceLoading}>
                      <RefreshCw className={cn("mr-2 h-4 w-4", workspaceLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: selected.id })}>Set Active</Button>
                    <Button onClick={() => openCompanyArea("/company-settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;

                return (
                  <Card key={stat.label}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
                          <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">
                            {workspaceLoading ? "..." : stat.value}
                          </p>
                        </div>
                        <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Open Company Areas</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {areaCards.map((area) => {
                    const Icon = area.icon;

                    return (
                      <button
                        key={area.title}
                        onClick={() => openCompanyArea(area.path)}
                        className="rounded-2xl border border-border bg-background-secondary p-4 text-left transition-colors hover:border-primary/20 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="metric-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-foreground">{area.title}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.description}</p>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Company Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-background-secondary p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Contact</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{selected.email || selected.phone || "No contact details set."}</p>
                  </div>

                  <div className="rounded-2xl bg-background-secondary p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Location</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {[selected.address, selected.city, selected.state, selected.country].filter(Boolean).join(", ") || "No address details set."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-background-secondary p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Financial Setup</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Currency: {selected.currency ? selected.currency.toUpperCase() : "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tax ID: {selected.tax_id || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-background-secondary p-4">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">System</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p>Inventory tracking: {selected.inventory_tracking ? "Enabled" : "Disabled"}</p>
                      <p>Multi-currency: {selected.multi_currency ? "Enabled" : "Disabled"}</p>
                      <p>Timezone: {selected.timezone || "Not set"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Need to make changes?</p>
                  <p className="mt-1 text-sm text-muted-foreground">Open company settings or remove the company from here.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/company-settings" onClick={() => dispatch({ type: "SET_ACTIVE_COMPANY", id: selected.id })}>
                      Edit Settings
                    </Link>
                  </Button>
                  <Button variant="destructive" onClick={() => remove(selected.id)}>
                    Delete Company
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
