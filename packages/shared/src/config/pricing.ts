export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number | null;
  priceLabel?: string;
  paymentType: string;
  features: string[];
  cta: string;
  ctaLink: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: "individual",
    name: "Individual",
    description: "For professionals who want visibility into meeting ROI",
    price: 49,
    paymentType: "one-time payment",
    features: [
      "Track meeting ROI",
      "Track task ROI",
      "Personal dashboard",
      "HRIS integration",
      "Calendar sync",
      "Task management",
    ],
    cta: "Get Started",
    ctaLink: "/coming-soon",
  },
  {
    id: "team",
    name: "Team",
    description: "For teams of 2-50 people who need shared governance",
    price: 149,
    paymentType: "one-time payment",
    features: [
      "Everything in Individual",
      "Team dashboards",
      "Department views",
      "Shared thresholds",
      "Multi-user access",
      "Lifetime updates",
    ],
    cta: "Get Started",
    ctaLink: "/coming-soon",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For organizations that need governance at scale",
    price: null,
    priceLabel: "Custom Pricing",
    paymentType: "",
    features: [
      "Everything in Team",
      "SSO integration",
      "API access",
      "Custom workflows",
      "Dedicated support",
      "Quarterly reviews",
    ],
    cta: "Contact Sales",
    ctaLink: "/coming-soon",
  },
];
