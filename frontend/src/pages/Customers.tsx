import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { useCustomers } from "@/hooks/useCustomers";
import { useAccounting } from "@/state/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Eye, Search, Building2, User, Mail, Phone, MapPin, CreditCard, Globe, FileText } from "lucide-react";
import type { Database } from "@/lib/database-types";
import { useTranslation } from "react-i18next";

type Customer = Database['public']['Tables']['customers']['Row'];
type ViewMode = "list" | "add" | "detail" | "edit";

const Customers = () => {
  const { t } = useTranslation();
  const { 
    customers, 
    loading, 
    error, 
    activeCompany,
    companies,
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    fetchInactiveCustomers,
    reactivateCustomer,
    searchCustomers
  } = useCustomers();
  
  const { state } = useAccounting();
  
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [showInactiveCustomers, setShowInactiveCustomers] = useState(false);
  const [inactiveCustomers, setInactiveCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  
  // Form state
  const [customerCode, setCustomerCode] = useState("");
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
  const [customerType, setCustomerType] = useState("RETAIL");
  const [defaultCurrency, setDefaultCurrency] = useState("LYD");
  const [discountPercentage, setDiscountPercentage] = useState("");

  const customerTypes = [
    { value: "RETAIL", label: "Retail" },
    { value: "WHOLESALE", label: "Wholesale" },
    { value: "DISTRIBUTOR", label: "Distributor" },
    { value: "MANUFACTURER", label: "Manufacturer" },
    { value: "SERVICE", label: "Service Provider" },
    { value: "GOVERNMENT", label: "Government" },
    { value: "NON_PROFIT", label: "Non-Profit" },
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
    setCustomerCode("");
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
    setCustomerType("RETAIL");
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
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setCustomerCode(customer.customer_code);
      setName(customer.name);
      setEmail(customer.email);
      setPhone(customer.phone);
      setContactPerson(customer.contact_person || "");
      setAddress(customer.address || "");
      setCity(customer.city || "");
      setStateProvince(customer.state || "");
      setZipCode(customer.zip_code || "");
      setCountry(customer.country || "");
      setTaxId(customer.tax_id || "");
      setCreditLimit(customer.credit_limit?.toString() || "");
      setPaymentTerms(customer.payment_terms || "");
      setNotes(customer.notes || "");
      setWebsite(customer.website || "");
      setIndustry(customer.industry || "");
      setCustomerType(customer.customer_type);
      setDefaultCurrency(customer.default_currency);
      setDiscountPercentage(customer.discount_percentage?.toString() || "");
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
      alert('Name and Email are required fields.');
      return;
    }

    try {
      if (view === "add") {
        await addCustomer({
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
          customer_type: customerType,
          default_currency: defaultCurrency,
          discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
          company_id: "" // This will be set by the hook
        });
      } else if (view === "edit" && selectedId) {
        await updateCustomer(selectedId, {
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
          customer_type: customerType,
          default_currency: defaultCurrency,
          discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
        });
      }
      backToList();
    } catch (error) {
      console.error("Failed to save customer:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const customerToDelete = customers.find(cust => cust.id === id);
    if (!customerToDelete) return;

    const confirmMessage = `Are you sure you want to delete "${customerToDelete.name}" (${customerToDelete.customer_code})?\n\nThis will:\n- Mark the customer as inactive\n- Remove them from the customers view\n- Preserve any historical data\n\nThis action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      try {
        await deleteCustomer(id);
      } catch (error) {
        console.error("Failed to delete customer:", error);
      }
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      const results = await searchCustomers(searchTerm);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const selected = customers.find(c => c.id === selectedId);

  const renderView = () => {
    if (view === "add" || view === "edit") {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{view === "add" ? t("customers.addNewCustomer") : t("customers.editCustomer")}</CardTitle>
              <Button variant="outline" onClick={backToList}>
                {t("customers.backToCustomers")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.customerCode")}
                    </label>
                    <Input
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder={t("customers.autoGeneratedIfEmpty")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.customerName")} *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("customers.customerNamePlaceholder")}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("common.email")} *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("customers.emailPlaceholder")}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("common.phone")}
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("customers.phonePlaceholder")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.contactPerson")}
                    </label>
                    <Input
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder={t("customers.contactPersonPlaceholder")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.customerType")}
                    </label>
                    <Select value={customerType} onValueChange={setCustomerType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customerTypes.map(type => (
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
                      {t("customers.address")}
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("customers.streetAddressPlaceholder")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.city")}
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
                      {t("customers.stateProvince")}
                    </label>
                    <Input
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder={t("customers.stateProvincePlaceholder")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.zipPostalCode")}
                    </label>
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder={t("customers.zipPostalCodePlaceholder")}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("customers.country")}
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
                      placeholder="https://www.example.com"
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
                      placeholder="e.g., Technology, Healthcare, Retail"
                      className="w-full"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes about the customer"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={handleSubmit} disabled={!name.trim() || !email.trim()}>
                  {view === "add" ? "Create Customer" : "Update Customer"}
                </Button>
                <Button variant="outline" onClick={backToList}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (view === "detail" && selected) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Details</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => startEdit(selected.id)}>
                  Edit
                </Button>
                <Button variant="outline" onClick={backToList}>
                  Back to Customers
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Customer Code</label>
                    <p className="text-lg font-mono font-semibold">{selected.customer_code}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Customer Name</label>
                    <p className="text-lg font-semibold">{selected.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selected.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <p className="text-lg flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selected.phone}
                    </p>
                  </div>
                  {selected.contact_person && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Contact Person</label>
                      <p className="text-lg">{selected.contact_person}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Customer Type</label>
                    <p className="text-lg">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customerTypes.find(t => t.value === selected.customer_type)?.label || selected.customer_type}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {(selected.address || selected.city || selected.state || selected.zip_code || selected.country) && (
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t("customers.addressInformation")}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selected.address && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                        <p className="text-lg">{selected.address}</p>
                      </div>
                    )}
                    {selected.city && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                        <p className="text-lg">{selected.city}</p>
                      </div>
                    )}
                    {selected.state && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">State/Province</label>
                        <p className="text-lg">{selected.state}</p>
                      </div>
                    )}
                    {selected.zip_code && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">ZIP/Postal Code</label>
                        <p className="text-lg">{selected.zip_code}</p>
                      </div>
                    )}
                    {selected.country && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                        <p className="text-lg">{selected.country}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Financial Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selected.tax_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Tax ID</label>
                      <p className="text-lg font-mono">{selected.tax_id}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Credit Limit</label>
                    <p className="text-lg">
                      {selected.credit_limit ? `$${selected.credit_limit.toLocaleString()}` : 'Not set'}
                    </p>
                  </div>
                  {selected.payment_terms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Payment Terms</label>
                      <p className="text-lg">
                        {paymentTermsOptions.find(t => t.value === selected.payment_terms)?.label || selected.payment_terms}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Default Currency</label>
                    <p className="text-lg font-mono">{selected.default_currency}</p>
                  </div>
                  {selected.discount_percentage && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Discount Percentage</label>
                      <p className="text-lg">{selected.discount_percentage}%</p>
                    </div>
                  )}
                </div>
              </div>

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
                        <label className="block text-sm font-medium text-gray-500 mb-1">Website</label>
                        <p className="text-lg">
                          <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selected.website}
                          </a>
                        </p>
                      </div>
                    )}
                    {selected.industry && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Industry</label>
                        <p className="text-lg">{selected.industry}</p>
                      </div>
                    )}
                    {selected.notes && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                        <p className="text-lg bg-gray-50 p-3 rounded-md">{selected.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />
              
              <div className="text-sm text-gray-500">
                <p>Created: {new Date(selected.created_at).toLocaleDateString()}</p>
                <p>Last Updated: {new Date(selected.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <AppLayout title={t("customers.title")}>
      <SEO title={`${t("customers.title")} - FMS`} description="Manage customer master data and relationships." />
      
      {!activeCompany ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Please select a company to manage customers.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Header with Company Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-6 w-6" />
                    {t("customers.title")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("customers.managingFor")} {activeCompany.name}
                  </p>
                </div>
                <Button onClick={startAdd} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t("customers.addCustomer")}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Search Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t("customers.searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                </div>
                                  <Button onClick={handleSearch} disabled={!searchTerm.trim()}>
                    {t("common.search")}
                  </Button>
                {searchTerm && (
                                      <Button variant="outline" onClick={() => { setSearchTerm(""); setSearchResults([]); }}>
                      {t("common.clear")}
                    </Button>
                )}
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
                    <CardTitle>{t("customers.searchResults")} ({searchResults.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        <span className="col-span-2">{t("common.code")}</span>
                        <span className="col-span-3">{t("common.name")}</span>
                        <span className="col-span-3">{t("common.email")}</span>
                        <span className="col-span-2">{t("common.type")}</span>
                        <span className="col-span-2">{t("common.actions")}</span>
                      </div>
                      <div className="divide-y">
                        {searchResults.map(customer => (
                          <div key={customer.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{customer.customer_code}</span>
                            <button className="col-span-3 text-left font-medium hover:underline" onClick={() => startDetail(customer.id)}>
                              {customer.name}
                            </button>
                            <span className="col-span-3 truncate">{customer.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {customerTypes.find(t => t.value === customer.customer_type)?.label || customer.customer_type}
                              </span>
                            </span>
                            <div className="col-span-2 flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startDetail(customer.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => startEdit(customer.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)} className="text-destructive">
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

              {/* All Customers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t("customers.allCustomers")} ({customers.length})</CardTitle>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        const inactive = await fetchInactiveCustomers();
                        if (inactive.length > 0) {
                          setShowInactiveCustomers(true);
                          setInactiveCustomers(inactive);
                        } else {
                          alert('No inactive customers found.');
                        }
                      }}
                    >
                      {t("customers.showInactive")} ({inactiveCustomers.length || 0})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">{t("customers.loadingCustomers")}</p>
                    </div>
                  ) : error ? (
                    <div className="text-destructive p-4 border border-destructive/20 rounded-lg">
                      <p className="font-medium mb-2">{t("common.error")}:</p>
                      <p>{error}</p>
                      <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
                        {t("common.refresh")}
                      </Button>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">{t("customers.noCustomersFound")}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t("customers.getStartedMessage")}</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-12 bg-secondary px-3 py-2 text-xs text-muted-foreground">
                        <span className="col-span-2">{t("common.code")}</span>
                        <span className="col-span-3">{t("common.name")}</span>
                        <span className="col-span-3">{t("common.email")}</span>
                        <span className="col-span-2">{t("common.type")}</span>
                        <span className="col-span-2">{t("common.actions")}</span>
                      </div>
                      <div className="divide-y">
                        {customers.map(customer => (
                          <div key={customer.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{customer.customer_code}</span>
                            <button className="col-span-3 text-left font-medium hover:underline" onClick={() => startDetail(customer.id)}>
                              {customer.name}
                            </button>
                            <span className="col-span-3 truncate">{customer.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {customerTypes.find(t => t.value === customer.customer_type)?.label || customer.customer_type}
                              </span>
                            </span>
                            <div className="col-span-2 flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startDetail(customer.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => startEdit(customer.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)} className="text-destructive">
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

              {/* Inactive Customers */}
              {showInactiveCustomers && inactiveCustomers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("customers.inactiveCustomers")}</CardTitle>
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
                        {inactiveCustomers.map(customer => (
                          <div key={customer.id} className="grid grid-cols-12 items-center px-3 py-2 hover:bg-secondary/60">
                            <span className="col-span-2 font-mono text-sm">{customer.customer_code}</span>
                            <span className="col-span-3">{customer.name}</span>
                            <span className="col-span-3 truncate">{customer.email}</span>
                            <span className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {customerTypes.find(t => t.value === customer.customer_type)?.label || customer.customer_type}
                              </span>
                            </span>
                            <div className="col-span-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await reactivateCustomer(customer.id);
                                    setInactiveCustomers(prev => prev.filter(c => c.id !== customer.id));
                                    if (inactiveCustomers.length === 1) {
                                      setShowInactiveCustomers(false);
                                    }
                                  } catch (error) {
                                    console.error('Failed to reactivate customer:', error);
                                  }
                                }}
                              >
                                {t("customers.reactivate")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowInactiveCustomers(false)}
                      className="mt-3"
                    >
                      {t("customers.hideInactive")}
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

export default Customers;

