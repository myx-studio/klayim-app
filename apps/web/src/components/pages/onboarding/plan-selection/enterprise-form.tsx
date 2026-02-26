"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSalesSchema } from "@klayim/shared";
import type { ContactSalesRequest } from "@klayim/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useContactSales } from "@/hooks/use-billing";
import { useState } from "react";

interface EnterpriseFormProps {
  organizationId: string;
  defaultEmail?: string;
  onBack: () => void;
}

export function EnterpriseForm({ organizationId, defaultEmail, onBack }: EnterpriseFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const contactSales = useContactSales();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactSalesRequest>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: {
      organizationId,
      email: defaultEmail || "",
    },
  });

  const onSubmit = async (data: ContactSalesRequest) => {
    await contactSales.mutateAsync(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="mb-2 text-xl font-semibold">Thank you!</h2>
          <p className="text-muted-foreground mb-4">
            Our sales team will be in touch within 24 hours.
          </p>
          <Button variant="outline" onClick={onBack}>
            Back to plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-2 w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to plans
        </Button>
        <CardTitle>Contact Sales</CardTitle>
        <CardDescription>
          Tell us about your organization and we&apos;ll get back to you within 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("organizationId")} />

          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input id="name" {...register("name")} placeholder="John Doe" />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john@company.com"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" {...register("company")} placeholder="Acme Inc." />
            {errors.company && (
              <p className="text-destructive text-sm">{errors.company.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Tell us about your needs..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={contactSales.isPending}>
            {contactSales.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
