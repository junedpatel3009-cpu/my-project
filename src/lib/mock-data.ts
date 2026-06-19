import {
  Wrench, Code, Paintbrush, Camera, Megaphone, GraduationCap,
  Hammer, Sparkles, Truck, Music, Briefcase, HeartPulse,
} from "lucide-react";

export const categories = [
  { name: "Home Services", icon: Wrench, count: 1240, color: "from-blue-500/10 to-blue-500/0" },
  { name: "Development", icon: Code, count: 3210, color: "from-violet-500/10 to-violet-500/0" },
  { name: "Design", icon: Paintbrush, count: 1875, color: "from-pink-500/10 to-pink-500/0" },
  { name: "Photography", icon: Camera, count: 642, color: "from-amber-500/10 to-amber-500/0" },
  { name: "Marketing", icon: Megaphone, count: 980, color: "from-teal-500/10 to-teal-500/0" },
  { name: "Tutoring", icon: GraduationCap, count: 470, color: "from-emerald-500/10 to-emerald-500/0" },
  { name: "Repair", icon: Hammer, count: 1520, color: "from-orange-500/10 to-orange-500/0" },
  { name: "Cleaning", icon: Sparkles, count: 890, color: "from-cyan-500/10 to-cyan-500/0" },
  { name: "Moving", icon: Truck, count: 320, color: "from-indigo-500/10 to-indigo-500/0" },
  { name: "Events", icon: Music, count: 260, color: "from-fuchsia-500/10 to-fuchsia-500/0" },
  { name: "Business", icon: Briefcase, count: 700, color: "from-slate-500/10 to-slate-500/0" },
  { name: "Wellness", icon: HeartPulse, count: 410, color: "from-rose-500/10 to-rose-500/0" },
];

export type Pro = {
  id: string;
  name: string;
  title: string;
  avatar: string;
  rating: number;
  reviews: number;
  hourly: number;
  location: string;
  distance: number;
  available: "Now" | "This week" | "Next week";
  verified: boolean;
  topRated: boolean;
  skills: string[];
  bio: string;
  completed: number;
};

const avatars = (seed: string) => `https://i.pravatar.cc/200?u=${seed}`;

export const professionals: Pro[] = [
  { id: "p1", name: "Amelia Chen", title: "Senior Full-Stack Engineer", avatar: avatars("amelia"), rating: 4.9, reviews: 312, hourly: 95, location: "San Francisco, CA", distance: 1.2, available: "Now", verified: true, topRated: true, skills: ["React", "Node", "AWS", "TypeScript"], bio: "10+ years building scalable SaaS products. Ex-Stripe, ex-Airbnb.", completed: 184 },
  { id: "p2", name: "Marcus Rivera", title: "Brand & Product Designer", avatar: avatars("marcus"), rating: 4.8, reviews: 221, hourly: 80, location: "Austin, TX", distance: 4.7, available: "This week", verified: true, topRated: true, skills: ["Figma", "Branding", "Webflow"], bio: "Designing distinctive brands for early-stage startups.", completed: 142 },
  { id: "p3", name: "Priya Patel", title: "Master Plumber", avatar: avatars("priya"), rating: 4.95, reviews: 478, hourly: 120, location: "Brooklyn, NY", distance: 0.8, available: "Now", verified: true, topRated: true, skills: ["Pipe fitting", "Emergency", "Renovation"], bio: "Licensed plumber, 15+ years. Same-day service available.", completed: 612 },
  { id: "p4", name: "Daniel Okafor", title: "Wedding Photographer", avatar: avatars("daniel"), rating: 4.7, reviews: 156, hourly: 250, location: "Los Angeles, CA", distance: 6.4, available: "Next week", verified: true, topRated: false, skills: ["Weddings", "Portraits", "Lightroom"], bio: "Cinematic wedding storytelling. Featured in Vogue.", completed: 98 },
  { id: "p5", name: "Sofia Müller", title: "Growth Marketer", avatar: avatars("sofia"), rating: 4.85, reviews: 189, hourly: 110, location: "Remote", distance: 0, available: "Now", verified: true, topRated: true, skills: ["SEO", "Paid ads", "Lifecycle"], bio: "Scaled 3 startups from $0 to $10M ARR.", completed: 76 },
  { id: "p6", name: "Jamal Wright", title: "Math & Physics Tutor", avatar: avatars("jamal"), rating: 5.0, reviews: 92, hourly: 60, location: "Chicago, IL", distance: 2.3, available: "This week", verified: true, topRated: false, skills: ["Calculus", "SAT prep", "Physics"], bio: "MIT graduate. 100% pass rate on AP exams.", completed: 54 },
  { id: "p7", name: "Hannah Kim", title: "Interior Designer", avatar: avatars("hannah"), rating: 4.9, reviews: 134, hourly: 140, location: "Seattle, WA", distance: 3.1, available: "Now", verified: true, topRated: true, skills: ["Residential", "3D Render", "Sourcing"], bio: "Creating warm, modern spaces that feel like home.", completed: 87 },
  { id: "p8", name: "Luca Rossi", title: "iOS Developer", avatar: avatars("luca"), rating: 4.75, reviews: 201, hourly: 105, location: "Remote", distance: 0, available: "This week", verified: true, topRated: false, skills: ["Swift", "SwiftUI", "Core Data"], bio: "Shipped 30+ apps to the App Store.", completed: 112 },
];

export type Job = {
  id: string;
  title: string;
  category: string;
  budget: string;
  description: string;
  postedAt: string;
  proposals: number;
  location: string;
  remote: boolean;
  urgency: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Completed";
  client: { name: string; avatar: string; rating: number; jobsPosted: number };
};

export const jobs: Job[] = [
  { id: "j1", title: "Build a Shopify storefront with custom theme", category: "Development", budget: "$3,000–$5,000", description: "Looking for an experienced Shopify developer to build a custom storefront with Liquid theme customization, product filtering, and a smooth checkout experience.", postedAt: "2h ago", proposals: 12, location: "Remote", remote: true, urgency: "High", status: "Open", client: { name: "Northwind Co.", avatar: avatars("nw"), rating: 4.8, jobsPosted: 14 } },
  { id: "j2", title: "Kitchen sink leak — need same-day fix", category: "Home Services", budget: "$150–$300", description: "Slow leak under the kitchen sink. Need a licensed plumber today, anytime after 2pm.", postedAt: "30m ago", proposals: 5, location: "Brooklyn, NY", remote: false, urgency: "High", status: "Open", client: { name: "Sarah Mitchell", avatar: avatars("sarah"), rating: 4.9, jobsPosted: 3 } },
  { id: "j3", title: "Logo + brand identity for fintech startup", category: "Design", budget: "$1,500–$2,500", description: "We're launching a B2B fintech product and need a complete brand identity: logo, color system, type, and basic brand book.", postedAt: "1d ago", proposals: 28, location: "Remote", remote: true, urgency: "Medium", status: "In Progress", client: { name: "Ledger Labs", avatar: avatars("ll"), rating: 4.7, jobsPosted: 9 } },
  { id: "j4", title: "Wedding photography — 8 hours coverage", category: "Photography", budget: "$2,000–$3,500", description: "Outdoor ceremony + indoor reception, ~120 guests. Need a photographer with portfolio of weddings.", postedAt: "3d ago", proposals: 17, location: "Los Angeles, CA", remote: false, urgency: "Low", status: "Open", client: { name: "Emily & Jordan", avatar: avatars("ej"), rating: 5.0, jobsPosted: 1 } },
  { id: "j5", title: "SEO audit and 90-day growth plan", category: "Marketing", budget: "$2,500", description: "B2B SaaS with 50k monthly visits. Looking for a senior SEO to audit and build a 90-day plan with execution.", postedAt: "5h ago", proposals: 9, location: "Remote", remote: true, urgency: "Medium", status: "Open", client: { name: "Acme SaaS", avatar: avatars("acme"), rating: 4.6, jobsPosted: 22 } },
];

export type Proposal = {
  id: string;
  pro: Pro;
  bid: number;
  duration: string;
  cover: string;
  submittedAt: string;
};

export const proposals: Proposal[] = [
  { id: "pr1", pro: professionals[0], bid: 4200, duration: "3 weeks", cover: "I've shipped 12 Shopify storefronts in the last 2 years. I can deliver a polished, performant theme with custom filtering and a delightful checkout in 3 weeks.", submittedAt: "1h ago" },
  { id: "pr2", pro: professionals[7], bid: 3800, duration: "4 weeks", cover: "Happy to take this on. I'll start with a clickable Figma prototype, then build with Hydrogen for the best performance.", submittedAt: "3h ago" },
  { id: "pr3", pro: professionals[1], bid: 4500, duration: "3.5 weeks", cover: "I'd love to design and build this. My approach: brand-led design first, then a fast Liquid theme.", submittedAt: "5h ago" },
];

export const milestones = [
  { id: "m1", title: "Discovery & wireframes", status: "completed", due: "Week 1", amount: 800 },
  { id: "m2", title: "High-fidelity design", status: "completed", due: "Week 2", amount: 1200 },
  { id: "m3", title: "Theme development", status: "in_progress", due: "Week 3", amount: 1600 },
  { id: "m4", title: "QA, launch & handoff", status: "pending", due: "Week 4", amount: 600 },
];

export const transactions = [
  { id: "t1", date: "May 8, 2026", desc: "Milestone — Theme development", type: "Earning", amount: 1600, status: "Completed" },
  { id: "t2", date: "May 4, 2026", desc: "Withdrawal to bank •••4521", type: "Withdrawal", amount: -2000, status: "Completed" },
  { id: "t3", date: "Apr 29, 2026", desc: "Milestone — Hi-fi design", type: "Earning", amount: 1200, status: "Completed" },
  { id: "t4", date: "Apr 22, 2026", desc: "Milestone — Discovery", type: "Earning", amount: 800, status: "Completed" },
  { id: "t5", date: "Apr 18, 2026", desc: "Service fee", type: "Fee", amount: -120, status: "Completed" },
  { id: "t6", date: "Apr 14, 2026", desc: "Bonus tip — Acme SaaS", type: "Earning", amount: 250, status: "Completed" },
];

export const earningsChart = [
  { month: "Nov", value: 3200 },
  { month: "Dec", value: 4100 },
  { month: "Jan", value: 3800 },
  { month: "Feb", value: 5200 },
  { month: "Mar", value: 4800 },
  { month: "Apr", value: 6100 },
  { month: "May", value: 7400 },
];

export const notifications = [
  { id: "n1", type: "job", title: "New proposal on “Shopify storefront”", desc: "Amelia Chen submitted a proposal for $4,200.", time: "2m ago", unread: true },
  { id: "n2", type: "payment", title: "Milestone payment released", desc: "$1,600 released for Theme development.", time: "1h ago", unread: true },
  { id: "n3", type: "review", title: "New 5-star review", desc: "“Best contractor we've worked with.” — Sarah M.", time: "4h ago", unread: false },
  { id: "n4", type: "job", title: "Job invitation", desc: "Ledger Labs invited you to a $2,500 design project.", time: "Yesterday", unread: false },
  { id: "n5", type: "payment", title: "Withdrawal completed", desc: "$2,000 sent to your bank account.", time: "2d ago", unread: false },
  { id: "n6", type: "review", title: "Verification approved", desc: "Your identity verification is complete.", time: "3d ago", unread: false },
];

export const testimonials = [
  { name: "Olivia Bennett", role: "Founder, Lumen", text: "Hired a full design team in 48 hours. The platform paid for itself in a week.", avatar: avatars("olivia") },
  { name: "Ethan Park", role: "Homeowner", text: "Found a plumber within an hour, fixed the leak the same day. Incredible.", avatar: avatars("ethan") },
  { name: "Maya Singh", role: "CTO, Stackline", text: "The quality of engineers here is on par with top agencies, at half the cost.", avatar: avatars("maya") },
];

export const adminUsers = [
  { id: "u1", name: "Amelia Chen", email: "amelia@chen.dev", role: "Professional", status: "Active", joined: "2024-08-12" },
  { id: "u2", name: "Sarah Mitchell", email: "sarah.m@gmail.com", role: "Client", status: "Active", joined: "2025-01-04" },
  { id: "u3", name: "Marcus Rivera", email: "marcus@studio.co", role: "Professional", status: "Pending", joined: "2026-04-22" },
  { id: "u4", name: "Northwind Co.", email: "ops@northwind.com", role: "Client", status: "Active", joined: "2023-11-30" },
  { id: "u5", name: "Daniel Okafor", email: "daniel@okaforphoto.com", role: "Professional", status: "Suspended", joined: "2024-02-18" },
];

export const verifications = [
  { id: "v1", name: "Marcus Rivera", type: "Identity", submitted: "2d ago" },
  { id: "v2", name: "Hannah Kim", type: "Business license", submitted: "5h ago" },
  { id: "v3", name: "Luca Rossi", type: "Identity", submitted: "1d ago" },
];

export const disputes = [
  { id: "d1", job: "Logo + brand identity", parties: "Ledger Labs vs. Marcus Rivera", amount: 1500, opened: "1d ago", status: "Open" },
  { id: "d2", job: "Kitchen renovation", parties: "Sarah M. vs. Priya Patel", amount: 3200, opened: "4d ago", status: "Mediation" },
];

export const portfolio = [
  { title: "FinOps dashboard", tag: "Web app" },
  { title: "Acme rebrand", tag: "Branding" },
  { title: "Shopify Hydrogen store", tag: "E-commerce" },
  { title: "Mobile banking", tag: "iOS" },
];

export const reviews = [
  { id: "r1", author: "Sarah Mitchell", avatar: avatars("sarah"), rating: 5, date: "Apr 28, 2026", text: "Exceptional work. Communicated clearly, delivered ahead of schedule, and the quality was unmatched." },
  { id: "r2", author: "Northwind Co.", avatar: avatars("nw"), rating: 5, date: "Mar 15, 2026", text: "Truly senior engineer. Architected our checkout flow and increased conversion by 18%." },
  { id: "r3", author: "Acme SaaS", avatar: avatars("acme"), rating: 4, date: "Feb 02, 2026", text: "Great experience overall. Would hire again for any infra-heavy project." },
];

export const activityFeed = [
  { id: "a1", actor: "Amelia Chen", action: "uploaded 3 files to", target: "Theme development", time: "1h ago" },
  { id: "a2", actor: "You", action: "approved milestone", target: "Hi-fi design", time: "Yesterday" },
  { id: "a3", actor: "Amelia Chen", action: "marked complete", target: "Discovery & wireframes", time: "Apr 22" },
  { id: "a4", actor: "You", action: "started project", target: "Shopify storefront", time: "Apr 14" },
];
