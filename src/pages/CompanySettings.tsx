import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDatabase } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { useAccounting } from "@/state/accounting";
import {
  Building2,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Settings,
  Upload,
  X,
} from "lucide-react";

type CompanyForm = {
  name: string;
  description: string;
  industry: string;
  company_size: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  currency: string;
  fiscal_year_start: string;
  tax_id: string;
  multi_currency: boolean;
  inventory_tracking: boolean;
  auto_backup: boolean;
  timezone: string;
};

const emptyForm: CompanyForm = {
  name: "",
  description: "",
  industry: "",
  company_size: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  currency: "LYD",
  fiscal_year_start: "01-01",
  tax_id: "",
  multi_currency: false,
  inventory_tracking: true,
  auto_backup: true,
  timezone: "Africa/Tripoli",
};

const CompanySettings = () => {
  const { state } = useAccounting();
  const { toast } = useToast();
  const { data: companies, loading, error, fetchAll, update } = useDatabase("companies");
  const [isSaving, setIsSaving] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [formData, setFormData] = useState<CompanyForm>(emptyForm);
  const hasMounted = useRef(false);

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  useEffect(() => {
    if (!hasMounted.current) {
      void fetchAll();
      hasMounted.current = true;
    }
  }, [fetchAll]);

  useEffect(() => {
    if (!activeCompany) {
      setFormData(emptyForm);
      setLogo(null);
      return;
    }

    setFormData({
      name: activeCompany.name || "",
      description: activeCompany.description || "",
      industry: activeCompany.industry || "",
      company_size: activeCompany.company_size || "",
      email: activeCompany.email || "",
      phone: activeCompany.phone || "",
      address: activeCompany.address || "",
      city: activeCompany.city || "",
      state: activeCompany.state || "",
      zip: activeCompany.zip || "",
      country: activeCompany.country || "",
      currency: activeCompany.currency || "LYD",
      fiscal_year_start: activeCompany.fiscal_year_start || "01-01",
      tax_id: activeCompany.tax_id || "",
      multi_currency: Boolean(activeCompany.multi_currency),
      inventory_tracking: activeCompany.inventory_tracking !== false,
      auto_backup: activeCompany.auto_backup !== false,
      timezone: activeCompany.timezone || "Africa/Tripoli",
    });
    setLogo(activeCompany.logo || null);
  }, [activeCompany]);

  const handleInputChange = <T extends keyof CompanyForm>(field: T, value: CompanyForm[T]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        setLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!activeCompany?.id) return;

    setIsSaving(true);
    try {
      const result = await update(activeCompany.id, {
        ...formData,
        logo: logo || undefined,
      });

      if (!result) {
        throw new Error("Unable to save company settings");
      }

      toast({
        title: "Company settings saved",
        description: "Your company profile and control preferences are now updated.",
      });
    } catch (saveError) {
      toast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unable to save company settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    await fetchAll();
  };

  if (!state.activeCompanyId) {
    return (
      <AppLayout title="Company Settings">
        <SEO title="Company Settings - FinanceHub" description="Configure the active company workspace." />
        <Card>
          <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center">
            <div className="metric-icon-shell flex h-16 w-16 items-center justify-center rounded-3xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Select a company first</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Company settings now follow the active company workspace. Pick a company and come back here to manage
                its control, contact, and financial defaults.
              </p>
            </div>
            <Button asChild>
              <Link to="/companies">Open Companies</Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Company Settings">
      <SEO
        title={activeCompany ? `${activeCompany.name} Settings - FinanceHub` : "Company Settings - FinanceHub"}
        description="Configure company identity, financial defaults, and workspace controls."
      />

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-4 py-2 text-sm text-muted-foreground">
                  <Settings className="h-4 w-4 text-primary" />
                  Active company settings
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  {activeCompany?.name || "Loading company"}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Keep one clean source of truth for company identity, finance defaults, and operating controls. These
                  settings update the persisted company record used across the app.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleRefresh} disabled={loading || isSaving}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button onClick={handleSave} disabled={loading || isSaving || !activeCompany}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card>
            <CardContent className="px-6 py-5 text-sm text-destructive">
              Unable to load company settings: {error}
            </CardContent>
          </Card>
        )}

        {!activeCompany && loading ? (
          <Card>
            <CardContent className="px-6 py-10 text-sm text-muted-foreground">Loading company settings...</CardContent>
          </Card>
        ) : activeCompany ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-5 rounded-3xl bg-background-secondary p-5 md:flex-row md:items-center">
                    {logo ? (
                      <div className="relative">
                        <img
                          src={logo}
                          alt={`${activeCompany.name} logo`}
                          className="h-24 w-24 rounded-3xl border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setLogo(null)}
                          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-border bg-card">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Company logo</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Optional branding for reports and workspace identity.
                        </p>
                      </div>
                      <input
                        id="company-logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="company-logo-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                      >
                        <Upload className="h-4 w-4" />
                        {logo ? "Change Logo" : "Upload Logo"}
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input
                        id="company-name"
                        value={formData.name}
                        onChange={(event) => handleInputChange("name", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={formData.industry || "other"} onValueChange={(value) => handleInputChange("industry", value === "other" ? "" : value)}>
                        <SelectTrigger id="industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="other">Other / not set</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-size">Company size</Label>
                      <Select
                        value={formData.company_size || "not-set"}
                        onValueChange={(value) => handleInputChange("company_size", value === "not-set" ? "" : value)}
                      >
                        <SelectTrigger id="company-size">
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="500+">500+ employees</SelectItem>
                          <SelectItem value="not-set">Not set</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-id">Tax ID</Label>
                      <Input
                        id="tax-id"
                        value={formData.tax_id}
                        onChange={(event) => handleInputChange("tax_id", event.target.value)}
                        placeholder="Tax or registration number"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(event) => handleInputChange("description", event.target.value)}
                      placeholder="Short company profile"
                      className="min-h-[120px] resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workspace Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SummaryRow icon={Mail} label="Email" value={formData.email || "Not set"} />
                  <SummaryRow icon={Phone} label="Phone" value={formData.phone || "Not set"} />
                  <SummaryRow
                    icon={MapPin}
                    label="Location"
                    value={[formData.city, formData.country].filter(Boolean).join(", ") || "Not set"}
                  />
                  <SummaryRow icon={Globe} label="Timezone" value={formData.timezone || "Not set"} />

                  <Separator />

                  <div className="rounded-2xl bg-background-secondary p-4">
                    <p className="text-sm font-medium text-foreground">Control defaults</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p>Base currency: {(formData.currency || "LYD").toUpperCase()}</p>
                      <p>Fiscal year start: {formatFiscalYearStart(formData.fiscal_year_start)}</p>
                      <p>Inventory tracking: {formData.inventory_tracking ? "Enabled" : "Disabled"}</p>
                      <p>Multi-currency: {formData.multi_currency ? "Enabled" : "Disabled"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Contact And Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(event) => handleInputChange("email", event.target.value)}
                        placeholder="finance@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(event) => handleInputChange("phone", event.target.value)}
                        placeholder="+218 ..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(event) => handleInputChange("address", event.target.value)}
                      placeholder="Street, building, district"
                      className="resize-none"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(event) => handleInputChange("city", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State / province</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(event) => handleInputChange("state", event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="zip">Postal code</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(event) => handleInputChange("zip", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(event) => handleInputChange("country", event.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={formData.currency}
                        onChange={(event) => handleInputChange("currency", event.target.value.toUpperCase())}
                        placeholder="LYD"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fiscal-year-start">Fiscal year start</Label>
                      <Select
                        value={formData.fiscal_year_start}
                        onValueChange={(value) => handleInputChange("fiscal_year_start", value)}
                      >
                        <SelectTrigger id="fiscal-year-start">
                          <SelectValue placeholder="Select fiscal year start" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="01-01">January 1</SelectItem>
                          <SelectItem value="04-01">April 1</SelectItem>
                          <SelectItem value="07-01">July 1</SelectItem>
                          <SelectItem value="10-01">October 1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(event) => handleInputChange("timezone", event.target.value)}
                      placeholder="Africa/Tripoli"
                    />
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      title="Multi-currency"
                      description="Allow the workspace to capture transactions in more than one currency."
                      checked={formData.multi_currency}
                      onCheckedChange={(checked) => handleInputChange("multi_currency", checked)}
                    />
                    <ToggleRow
                      title="Inventory tracking"
                      description="Keep stock, valuation, and inventory controls active for this company."
                      checked={formData.inventory_tracking}
                      onCheckedChange={(checked) => handleInputChange("inventory_tracking", checked)}
                    />
                    <ToggleRow
                      title="Auto backup"
                      description="Mark this company for automated backup preferences and recovery workflows."
                      checked={formData.auto_backup}
                      onCheckedChange={(checked) => handleInputChange("auto_backup", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
};

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-background-secondary p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-background-secondary px-4 py-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function formatFiscalYearStart(value: string) {
  switch (value) {
    case "04-01":
      return "April 1";
    case "07-01":
      return "July 1";
    case "10-01":
      return "October 1";
    case "01-01":
    default:
      return "January 1";
  }
}

export default CompanySettings;
