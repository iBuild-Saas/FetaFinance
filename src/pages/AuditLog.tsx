import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccounting } from "@/state/accounting";
import { useDatabase } from "@/hooks/useDatabase";
import { ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";

type AuditEvent = {
  id: string;
  actor_name?: string;
  action_type: string;
  resource_type: string;
  resource_label?: string;
  status: string;
  summary: string;
  occurred_at: string;
};

const statusVariant = (status: string) => (status === "BLOCKED" ? "destructive" : "outline");

const AuditLog = () => {
  const { t, i18n } = useTranslation();
  const { data: companies } = useDatabase("companies");
  const { state } = useAccounting();
  const locale = i18n.language === "ar" ? "ar" : "en-US";

  const activeCompany = useMemo(
    () => companies?.find((company) => company.id === state.activeCompanyId) || null,
    [companies, state.activeCompanyId],
  );

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  const loadAudit = async () => {
    if (!activeCompany?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/company_audit/${activeCompany.id}`);
      const payload = await response.json();
      setEvents(payload.events || []);
    } catch (error) {
      console.error("Failed to load audit log", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAudit();
  }, [activeCompany?.id]);

  return (
    <AppLayout title={t("auditLog.title")}>
      <SEO title={`${t("auditLog.title")} - FinanceHub`} description={t("auditLog.description")} />

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeCompany?.name || t("company.selectCompany")}</Badge>
                <Badge variant="outline">{t("auditLog.badge")}</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{t("auditLog.heroTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("auditLog.heroDescription")}</p>
            </div>
            <Button variant="outline" onClick={() => void loadAudit()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.refresh")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {t("auditLog.recentEvents")}
            </CardTitle>
            <Badge variant="secondary">{t("auditLog.eventCount", { count: events.length })}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {!activeCompany ? (
              <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-6 text-sm text-muted-foreground">
                {t("auditLog.selectCompany")}
              </div>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">{t("auditLog.loading")}</p>
            ) : events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background-secondary p-8 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">{t("auditLog.empty")}</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="rounded-2xl border border-border bg-background-secondary p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                        <Badge variant="outline">{event.action_type}</Badge>
                        <Badge variant="outline">{event.resource_type}</Badge>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">{event.summary}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {event.resource_label || t("auditLog.resourceFallback")} · {event.actor_name || t("auditLog.actorFallback")}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString(locale)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AuditLog;
