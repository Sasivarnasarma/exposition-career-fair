import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AdminLoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-16"
    >
      <Card className="w-full max-w-md">
        <LockKeyhole aria-hidden="true" className="mb-7 size-8 text-primary" />
        <p className="eyebrow">Exposition organisers</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Admin access</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Organiser sign-in is not available yet. Please contact the organising
          committee if you need access.
        </p>
      </Card>
    </main>
  );
}
