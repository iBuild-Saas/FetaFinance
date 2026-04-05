import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import { useDatabase } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { useAccounting } from "@/state/accounting";
import { BookOpen, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";

type JournalEntryRecord = {
  id: string;
  company_id: string;
  entry_date?: string | null;
  entry_number?: string | null;
  journal_number?: string | null;
  memo?: string | null;
  description?: string | null;
  reference?: string | null;
  reference_number?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type JournalLineRecord = {
  id: string;
  journal_entry_id: string;
  account_id?: string | null;
  line_number?: number | null;
  debit_amount?: number | string | null;
  credit_amount?: number | string | null;
  description?: string | null;
};

type AccountRecord = {
  id: string;
  account_code?: string | null;
  account_name?: string | null;
};

type JournalLineDetail = {
  id: string;
  lineNumber: number;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
};

type JournalEntryDetail = JournalEntryRecord & {
  displayNumber: string;
  displayMemo: string;
  displayReference: string;
  displayStatus: string;
  totalDebits: number;
  totalCredits: number;
  lines: JournalLineDetail[];
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const JournalEntries = () => {
  const { supabase } = useDatabaseContext();
  const { toast } = useToast();
  const { data: companies, fetchAll: fetchCompanies } = useDatabase("companies");
  const { state } = useAccounting();

  const activeCompany = companies?.find((company) => company.id === state.activeCompanyId) || null;

  const [entries, setEntries] = useState<JournalEntryDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (activeCompany) {
      void fetchJournalEntries();
    } else {
      setEntries([]);
      setSelectedEntryId(null);
    }
  }, [activeCompany]);

  const fetchJournalEntries = async () => {
    if (!activeCompany?.id) return;

    try {
      setLoading(true);

      const { data: entriesData, error: entriesError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("company_id", activeCompany.id)
        .eq("is_active", true)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (entriesError) {
        console.error("Error fetching journal entries:", entriesError);
        throw entriesError;
      }

      const baseEntries = (entriesData || []) as JournalEntryRecord[];
      const entryIds = new Set(baseEntries.map((entry) => entry.id));

      const [linesResult, accountsResult] = await Promise.all([
        supabase.from("journal_entry_lines").select("*"),
        supabase
          .from("chart_of_accounts")
          .select("id, account_code, account_name")
          .eq("company_id", activeCompany.id),
      ]);

      if (linesResult.error) {
        console.warn("Unable to load journal lines:", linesResult.error);
      }

      if (accountsResult.error) {
        console.warn("Unable to load chart of accounts for journals:", accountsResult.error);
      }

      const accountMap = new Map(
        (((accountsResult.data || []) as AccountRecord[]) || []).map((account) => [account.id, account]),
      );
      const linesByEntryId = new Map<string, JournalLineDetail[]>();

      (((linesResult.data || []) as JournalLineRecord[]) || [])
        .filter((line) => entryIds.has(line.journal_entry_id))
        .forEach((line, index) => {
          const account = line.account_id ? accountMap.get(line.account_id) : null;
          const nextLine: JournalLineDetail = {
            id: line.id,
            lineNumber: line.line_number ?? index + 1,
            accountCode: account?.account_code || "N/A",
            accountName: account?.account_name || "Unknown account",
            description: line.description || "",
            debitAmount: toNumber(line.debit_amount),
            creditAmount: toNumber(line.credit_amount),
          };

          const current = linesByEntryId.get(line.journal_entry_id) || [];
          current.push(nextLine);
          linesByEntryId.set(line.journal_entry_id, current);
        });

      const normalizedEntries = baseEntries.map((entry, index) => {
        const lines = (linesByEntryId.get(entry.id) || []).slice().sort((a, b) => a.lineNumber - b.lineNumber);
        const totalDebits = lines.reduce((sum, line) => sum + line.debitAmount, 0);
        const totalCredits = lines.reduce((sum, line) => sum + line.creditAmount, 0);

        return {
          ...entry,
          displayNumber: entry.journal_number || entry.entry_number || `JE-${String(index + 1).padStart(4, "0")}`,
          displayMemo: entry.memo || entry.description || "No memo",
          displayReference: entry.reference_number || entry.reference || "No reference",
          displayStatus: String(entry.status || "POSTED").toUpperCase(),
          totalDebits,
          totalCredits,
          lines,
        };
      });

      setEntries(normalizedEntries);
      setSelectedEntryId((current) => {
        if (current && normalizedEntries.some((entry) => entry.id === current)) {
          return current;
        }
        return normalizedEntries[0]?.id || null;
      });
    } catch (error) {
      console.error("Journal entry page failed to load:", error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
      setEntries([]);
      setSelectedEntryId(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesStatus = statusFilter === "all" || entry.displayStatus === statusFilter;
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      searchValue.length === 0 ||
      entry.displayNumber.toLowerCase().includes(searchValue) ||
      entry.displayMemo.toLowerCase().includes(searchValue) ||
      entry.displayReference.toLowerCase().includes(searchValue);

    return matchesStatus && matchesSearch;
  });

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedEntryId) ||
    entries.find((entry) => entry.id === selectedEntryId) ||
    null;

  const postedCount = entries.filter((entry) => entry.displayStatus === "POSTED").length;
  const draftCount = entries.filter((entry) => entry.displayStatus === "DRAFT").length;
  const balancedCount = entries.filter((entry) => Math.abs(entry.totalDebits - entry.totalCredits) < 0.001).length;
  const totalMovement = entries.reduce((sum, entry) => sum + entry.totalDebits, 0);

  const renderStatusBadge = (status: string) => {
    if (status === "DRAFT") {
      return <Badge variant="secondary">Draft</Badge>;
    }

    if (status === "CANCELLED") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    return <Badge variant="outline">{status}</Badge>;
  };

  if (!activeCompany) {
    return (
      <AppLayout title="Journal Entries">
        <SEO title="Journal Entries - FinanceHub" description="Review company journal entries and their posting lines" />
        <div className="py-8 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Select a Company</h3>
          <p className="text-muted-foreground">Please select a company to view journal entries.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Journal Entries">
      <SEO title="Journal Entries - FinanceHub" description="Review company journal entries and their posting lines" />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Journal Entries</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {activeCompany.name}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void fetchJournalEntries()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{entries.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{postedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balanced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{balancedCount}</div>
              <p className="text-xs text-muted-foreground">${totalMovement.toFixed(2)} total debits</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr,220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by journal number, memo, or reference"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Journal List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading journal entries...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No journal entries matched the current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow
                          key={entry.id}
                          className={`cursor-pointer hover:bg-muted/50 ${selectedEntryId === entry.id ? "bg-muted/40" : ""}`}
                          onClick={() => setSelectedEntryId(entry.id)}
                        >
                          <TableCell>{entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : "N/A"}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.displayNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.displayMemo}</div>
                              <div className="text-sm text-muted-foreground">{entry.displayReference}</div>
                            </div>
                          </TableCell>
                          <TableCell>{renderStatusBadge(entry.displayStatus)}</TableCell>
                          <TableCell className="text-right">${entry.totalDebits.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${entry.totalCredits.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entry Detail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEntry ? (
                <>
                  <div className="rounded-2xl bg-background-secondary p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">{selectedEntry.displayNumber}</p>
                        <p className="mt-1 text-lg font-semibold">{selectedEntry.displayMemo}</p>
                      </div>
                      {renderStatusBadge(selectedEntry.displayStatus)}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Date</p>
                        <p className="mt-1 text-sm">{selectedEntry.entry_date ? new Date(selectedEntry.entry_date).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Reference</p>
                        <p className="mt-1 text-sm">{selectedEntry.displayReference}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Debits</p>
                        <p className="mt-1 text-sm">${selectedEntry.totalDebits.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total Credits</p>
                        <p className="mt-1 text-sm">${selectedEntry.totalCredits.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Line</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntry.lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                              No journal lines were found for this entry.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedEntry.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.lineNumber}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-mono text-sm">{line.accountCode}</div>
                                  <div className="text-sm text-muted-foreground">{line.accountName}</div>
                                  {line.description && <div className="text-sm text-muted-foreground">{line.description}</div>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">${line.debitAmount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${line.creditAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Select a journal entry to review its lines.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default JournalEntries;
