import AppLayout from "@/components/layout/AppLayout";
import SEO from "@/components/SEO";

const NotFound = () => {
  return (
    <AppLayout title="Page not found">
      <SEO title="404 — Page not found" description="The page you are looking for does not exist." canonical={window.location.href} />
      <p className="text-muted-foreground">Try navigating using the menu above.</p>
    </AppLayout>
  );
};

export default NotFound;
