import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Settings, Globe, CreditCard, Mail, Phone, MapPin, Save, Upload, Image, X } from "lucide-react";
import { useAccounting, useActiveCompany } from "@/state/accounting";
import { useState } from "react";

const CompanySettings = () => {
  const { state, dispatch } = useAccounting();
  const activeCompany = useActiveCompany();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: activeCompany?.name || "",
    description: activeCompany?.description || "",
    industry: activeCompany?.industry || "",
    companySize: activeCompany?.companySize || "",
    email: activeCompany?.email || "",
    phone: activeCompany?.phone || "",
    address: activeCompany?.address || "",
    city: activeCompany?.city || "",
    state: activeCompany?.state || "",
    zip: activeCompany?.zip || "",
    country: activeCompany?.country || "",
    currency: activeCompany?.currency || "",
    fiscalYearStart: activeCompany?.fiscalYearStart || "",
    taxId: activeCompany?.taxId || "",
    multiCurrency: activeCompany?.multiCurrency || false,
    inventoryTracking: activeCompany?.inventoryTracking || true,
    autoBackup: activeCompany?.autoBackup || true,
    timezone: activeCompany?.timezone || "",
  });
  const [logo, setLogo] = useState<string | null>(activeCompany?.logo || null);

  if (!activeCompany) {
    return (
      <AppLayout title="Company Settings">
        <SEO title="Company Settings — FinanceHub" description="Configure your company settings" />
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Company Selected</h3>
              <p className="text-muted-foreground">Please select a company to configure its settings.</p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogo(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!activeCompany) return;
    
    setIsSaving(true);
    
    // Update company information
    dispatch({
      type: "UPDATE_COMPANY",
      id: activeCompany.id,
      updates: {
        ...formData,
        logo: logo || undefined,
      }
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <AppLayout title="Company Settings">
      <SEO title={`${activeCompany.name} Settings — FinanceHub`} description="Configure your company settings and preferences" />
      
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
            <div className="space-y-4">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logo ? (
                  <div className="relative">
                    <img 
                      src={logo} 
                      alt="Company Logo" 
                      className="w-20 h-20 rounded-lg object-cover border border-border"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    {logo ? "Change Logo" : "Upload Logo"}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 200x200px, PNG or JPG
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input 
                  id="company-name" 
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-code">Company Code</Label>
                <Input id="company-code" value={activeCompany.id} disabled />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-description">Description</Label>
              <Textarea 
                id="company-description" 
                placeholder="Brief description of your company"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange("industry", value)}>
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
                <Select value={formData.companySize} onValueChange={(value) => handleInputChange("companySize", value)}>
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
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea 
                id="address" 
                placeholder="Enter company address"
                value={formData.address}
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
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input 
                  id="state" 
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP/Postal Code</Label>
                <Input 
                  id="zip" 
                  placeholder="12345"
                  value={formData.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
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
                <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={formData.fiscalYearStart} onValueChange={(value) => handleInputChange("fiscalYearStart", value)}>
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
                value={formData.taxId}
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
                checked={formData.multiCurrency}
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
                checked={formData.inventoryTracking}
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
                checked={formData.autoBackup}
                onCheckedChange={(checked) => handleInputChange("autoBackup", checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Time Zone</Label>
              <Select value={formData.timezone} onValueChange={(value) => handleInputChange("timezone", value)}>
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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default CompanySettings;
