import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAccounting } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, Search, Building2, User, Mail, Phone, MapPin, CreditCard, Globe, FileText, Package } from "lucide-react";
import type { Database } from "@/lib/database-types";
import { useTranslation } from "react-i18next";

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type ViewMode = "list" | "add" | "detail" | "edit";

const Suppliers = () => {
  const { t } = useTranslation();
  const { 
    suppliers, 
    loading, 
    error, 
    activeCompany,
    companies,
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    fetchInactiveSuppliers,
    reactivateSupplier,
    searchSuppliers
  } = useSuppliers();
  
  const { state } = useAccounting();
  
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [showInactiveSuppliers, setShowInactiveSuppliers] = useState(false);
  const [inactiveSuppliers, setInactiveSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Supplier[]>([]);
  
  // Form state
  const [supplierCode, setSupplierCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [supplierType, setSupplierType] = useState("MANUFACTURER");
  const [defaultCurrency, setDefaultCurrency] = useState("LYD");
  const [discountPercentage, setDiscountPercentage] = useState("");

  const supplierTypes = [
    { value: "MANUFACTURER", label: "Manufacturer" },
    { value: "DISTRIBUTOR", label: "Distributor" },
    { value: "WHOLESALER", label: "Wholesaler" },
    { value: "SERVICE", label: "Service Provider" },
    { value: "SUBCONTRACTOR", label: "Subcontractor" },
    { value: "VENDOR", label: "Vendor" },
    { value: "OTHER", label: "Other" }
  ];

  const currencies = [
    { value: "LYD", label: "Libyan Dinar (LYD)" },
    { value: "USD", label: "US Dollar (USD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "GBP", label: "British Pound (GBP)" },
    { value: "CAD", label: "Canadian Dollar (CAD)" },
    { value: "AUD", label: "Australian Dollar (AUD)" },
    { value: "JPY", label: "Japanese Yen (JPY)" },
    { value: "CHF", label: "Swiss Franc (CHF)" },
    { value: "CNY", label: "Chinese Yuan (CNY)" }
  ];

  const paymentTermsOptions = [
    { value: "NET_30", label: "Net 30" },
    { value: "NET_15", label: "Net 15" },
    { value: "NET_60", label: "Net 60" },
    { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
    { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
    { value: "PREPAID", label: "Prepaid" }
  ];

  const resetForm = () => {
    setSupplierCode("");
    setName("");
    setEmail("");
    setPhone("");
    setContactPerson("");
    setAddress("");
    setCity("");
    setStateProvince("");
    setZipCode("");
    setCountry("");
    setTaxId("");
    setCreditLimit("");
    setPaymentTerms("");
    setNotes("");
    setWebsite("");
    setIndustry("");
    setSupplierType("MANUFACTURER");
    setDefaultCurrency("LYD");
    setDiscountPercentage("");
  };

  const startAdd = () => {
    resetForm();
    setView("add");
  };

  const startDetail = (id: string) => {
    setSelectedId(id);
    setView("detail");
  };

  const startEdit = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) {
      setSupplierCode(supplier.supplier_code);
      setName(supplier.name);
      setEmail(supplier.email);
      setPhone(supplier.phone);
      setContactPerson(supplier.contact_person || "");
      setAddress(supplier.address || "");
      setCity(supplier.city || "");
      setStateProvince(supplier.state || "");
      setZipCode(supplier.zip_code || "");
      setCountry(supplier.country || "");
      setTaxId(supplier.tax_id || "");
      setCreditLimit(supplier.credit_limit?.toString() || "");
      setPaymentTerms(supplier.payment_terms || "");
      setNotes(supplier.notes || "");
      setWebsite(supplier.website || "");
      setIndustry(supplier.industry || "");
      setSupplierType(supplier.supplier_type);
      setDefaultCurrency(supplier.default_currency);
      setDiscountPercentage(supplier.discount_percentage?.toString() || "");
      setSelectedId(id);
      setView("edit");
    }
  };

  const backToList = () => {
    setSelectedId(undefined);
    setView("list");
    setSearchResults([]);
    setSearchTerm("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Name and email are required");
      return;
    }

    try {
      if (view === "add") {
        await addSupplier({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          contact_person: contactPerson.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateProvince.trim() || null,
          zip_code: zipCode.trim() || null,
          country: country.trim() || null,
          tax_id: taxId.trim() || null,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          payment_terms: paymentTerms || null,
          notes: notes.trim() || null,
          website: website.trim() || null,
          industry: industry.trim() || null,
          supplier_type: supplierType,
          default_currency: defaultCurrency,
          discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
          company_id: "" // This will be set by the hook
        });
        alert("Supplier added successfully!");
      } else if (view === "edit" && selectedId) {
        await updateSupplier(selectedId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          contact_person: contactPerson.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: stateProvince.trim() || null,
          zip_code: zipCode.trim() || null,
          country: country.trim() || null,
          tax_id: taxId.trim() || null,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          payment_terms: paymentTerms || null,
          notes: notes.trim() || null,
          website: website.trim() || null,
          industry: industry.trim() || null,
          supplier_type: supplierType,
          default_currency: defaultCurrency,
          discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
        });
        alert("Supplier updated successfully!");
      }
      backToList();
    } catch (error) {
      console.error("Failed to save supplier:", error);
      alert("Failed to save supplier. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
      try {
        await deleteSupplier(id);
        alert("Supplier deleted successfully!");
      } catch (error) {
        console.error("Failed to delete supplier:", error);
        alert("Failed to delete supplier. Please try again.");
      }
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      const results = await searchSuppliers(searchTerm);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const selected = suppliers.find(s => s.id === selectedId);

  const renderView = () => {
    if (view === "add" || view === "edit") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{view === "add" ? "Add New Supplier" : "Edit Supplier"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Code
                    </label>
                    <Input
                      value={supplierCode}
                      onChange={(e) => setSupplierCode(e.target.value)}
                      placeholder="Auto-generated if left empty"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Supplier name"
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="supplier@example.com"
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1-555-0123"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Primary contact name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier Type
                    </label>
                    <Select value={supplierType} onValueChange={setSupplierType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <Input
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="State or province"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP/Postal Code
                    </label>
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="ZIP or postal code"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Country"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Financial Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax ID
                    </label>
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="Tax identification number"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Limit
                    </label>
                    <Input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Terms
                    </label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTermsOptions.map(term => (
                          <SelectItem key={term.value} value={term.value}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Currency
                    </label>
                    <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage
                    </label>
                    <Input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry
                    </label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="Industry sector"
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes or comments"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {view === "add" ? "Add Supplier" : "Update Supplier"}
                </Button>
                <Button type="button" variant="outline" onClick={backToList} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      );
    }

    if (view === "detail" && selected) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Supplier Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                    <p className="text-sm text-gray-900 font-mono">{selected.supplier_code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">{selected.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{selected.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{selected.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <p className="text-sm text-gray-900">{selected.contact_person || "Not provided"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type</label>
                    <p className="text-sm text-gray-900">
                      {supplierTypes.find(t => t.value === selected.supplier_type)?.label || selected.supplier_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {(selected.address || selected.city || selected.state || selected.zip_code || selected.country) && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selected.address && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <p className="text-sm text-gray-900">{selected.address}</p>
                      </div>
                    )}
                    {selected.city && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <p className="text-sm text-gray-900">{selected.city}</p>
                      </div>
                    )}
                    {selected.state && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                        <p className="text-sm text-gray-900">{selected.state}</p>
                      </div>
                    )}
                    {selected.zip_code && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP/Postal Code</label>
                        <p className="text-sm text-gray-900">{selected.zip_code}</p>
                      </div>
                    )}
                    {selected.country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <p className="text-sm text-gray-900">{selected.country}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {(selected.tax_id || selected.credit_limit || selected.payment_terms || selected.discount_percentage) && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Financial Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selected.tax_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                        <p className="text-sm text-gray-900">{selected.tax_id}</p>
                      </div>
                    )}
                    {selected.credit_limit && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                        <p className="text-sm text-gray-900">${selected.credit_limit.toFixed(2)}</p>
                      </div>
                    )}
                    {selected.payment_terms && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                        <p className="text-sm text-gray-900">{selected.payment_terms}</p>
                      </div>
                    )}
                    {selected.discount_percentage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                        <p className="text-sm text-gray-900">{selected.discount_percentage}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {(selected.website || selected.industry || selected.notes) && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selected.website && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <p className="text-sm text-gray-900">
                          <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selected.website}
                          </a>
                        </p>
                      </div>
                    )}
                    {selected.industry && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                        <p className="text-sm text-gray-900">{selected.industry}</p>
                      </div>
                    )}
                    {selected.notes && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <p className="text-sm text-gray-900">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={() => startEdit(selected.id)} className="flex-1">
                  Edit Supplier
                </Button>
                <Button variant="outline" onClick={backToList} className="flex-1">
                  Back to List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <AppLayout title={t("suppliers.title")}>
      <SEO title={`${t("suppliers.title")} â€” FMS`} description="Manage supplier master data and relationships." />
      {!activeCompany ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Company Selected</h3>
          <p className="mt-1 text-sm text-gray-500">Please select a company from the navigation bar to manage suppliers.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Header with Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                Suppliers - {activeCompany.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage supplier relationships and information for {activeCompany.name}
              </p>
            </CardHeader>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Search suppliers by name, email, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button onClick={() => { setSearchResults([]); setSearchTerm(""); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          {view === "list" && (
            <>
              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Search Results ({searchResults.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        <span className="col-span-2">Code</span>
                        <span className="col-span-3">Name</span>
                        <span className="col-span-3">Email</span>
                        <span className="col-span-2">Type</span>
                        <span className="col-span-2">Actions</span>
                      </div>
                      <div className="divide-y">
                        {searchResults.map(supplier => (
                          <div key={supplier.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{supplier.supplier_code}</span>
                            <span className="col-span-3">{supplier.name}</span>
                            <span className="col-span-3 truncate">{supplier.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {supplierTypes.find(t => t.value === supplier.supplier_type)?.label || supplier.supplier_type}
                              </span>
                            </span>
                            <div className="col-span-2 flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => startDetail(supplier.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => startEdit(supplier.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Suppliers */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>All Suppliers ({suppliers.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={startAdd}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Supplier
                    </Button>
                    <Button variant="outline" onClick={async () => {
                      const inactive = await fetchInactiveSuppliers();
                      setInactiveSuppliers(inactive);
                      setShowInactiveSuppliers(true);
                    }}>
                      Show Inactive
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Loading suppliers...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-red-600">Error: {error}</p>
                      <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
                        Refresh Page
                      </Button>
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by creating your first supplier.</p>
                      <Button onClick={startAdd} className="mt-3">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Supplier
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        <span className="col-span-2">Code</span>
                        <span className="col-span-3">Name</span>
                        <span className="col-span-3">Email</span>
                        <span className="col-span-2">Type</span>
                        <span className="col-span-2">Actions</span>
                      </div>
                      <div className="divide-y">
                        {suppliers.map(supplier => (
                          <div key={supplier.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{supplier.supplier_code}</span>
                            <span className="col-span-3">{supplier.name}</span>
                            <span className="col-span-3 truncate">{supplier.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {supplierTypes.find(t => t.value === supplier.supplier_type)?.label || supplier.supplier_type}
                              </span>
                            </span>
                            <div className="col-span-2 flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => startDetail(supplier.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => startEdit(supplier.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(supplier.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inactive Suppliers */}
              {showInactiveSuppliers && inactiveSuppliers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Inactive Suppliers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        <span className="col-span-2">Code</span>
                        <span className="col-span-3">Name</span>
                        <span className="col-span-3">Email</span>
                        <span className="col-span-2">Type</span>
                        <span className="col-span-2">Actions</span>
                      </div>
                      <div className="divide-y">
                        {inactiveSuppliers.map(supplier => (
                          <div key={supplier.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{supplier.supplier_code}</span>
                            <span className="col-span-3">{supplier.name}</span>
                            <span className="col-span-3 truncate">{supplier.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {supplierTypes.find(t => t.value === supplier.supplier_type)?.label || supplier.supplier_type}
                              </span>
                            </span>
                            <div className="col-span-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await reactivateSupplier(supplier.id);
                                    setInactiveSuppliers(prev => prev.filter(s => s.id !== supplier.id));
                                    if (inactiveSuppliers.length === 1) {
                                      setShowInactiveSuppliers(false);
                                    }
                                  } catch (error) {
                                    console.error('Failed to reactivate supplier:', error);
                                  }
                                }}
                              >
                                Reactivate
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowInactiveSuppliers(false)}
                      className="mt-3"
                    >
                      Hide Inactive Suppliers
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Form Views */}
          {renderView()}
        </div>
      )}
    </AppLayout>
  );
};

export default Suppliers;
