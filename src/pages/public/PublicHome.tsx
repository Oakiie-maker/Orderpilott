import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  BarChart3,
  Menu,
  X,
  ArrowRight,
  Check,
  ClipboardList,
  Smartphone,
  Bell,
  Shield,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

const features = [
  {
    icon: Menu,
    title: 'Digital Menus',
    description: 'Create a beautiful online menu with categories, prices, images, and custom options. Update instantly — no reprints needed.',
  },
  {
    icon: QrCode,
    title: 'QR Code Ordering',
    description: 'Generate QR codes for your restaurant or individual tables. Customers scan, browse, and order without downloading an app.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen Display',
    description: 'A real-time kitchen view optimized for tablets. See incoming orders, track preparation, and move them through each stage.',
  },
  {
    icon: BarChart3,
    title: 'Sales Analytics',
    description: 'Track orders, revenue, average order value, and best-selling items. Filter by date to understand your business.',
  },
];

const steps = [
  {
    icon: QrCode,
    title: 'Customer scans QR',
    description: 'Diners scan the QR code at their table or on your counter to open your digital menu instantly.',
  },
  {
    icon: ClipboardList,
    title: 'Builds and submits order',
    description: 'Customers add items, choose options, and place their order. No app download or account required.',
  },
  {
    icon: Bell,
    title: 'Kitchen receives order',
    description: 'Your kitchen display shows the new order immediately. Staff accept, prepare, and mark it ready.',
  },
  {
    icon: Smartphone,
    title: 'Customer tracks progress',
    description: 'Customers check their order status in real time with a secure tracking link.',
  },
];

const useCases = [
  { title: 'Restaurants', description: 'Full-service dining with table-side QR ordering and kitchen management.' },
  { title: 'Cafés', description: 'Counter ordering with pickup options and customizable drink menus.' },
  { title: 'Takeaways', description: 'Fast order turnaround with collection and delivery support.' },
  { title: 'Food Trucks', description: 'Mobile QR ordering that moves with you, wherever you set up.' },
];

const plans = [
  {
    name: 'Starter',
    price: 'R0',
    period: 'per month',
    description: 'Get started with direct ordering',
    features: [
      '1 restaurant location',
      'Digital menu with QR ordering',
      'Kitchen display system',
      'Up to 100 orders per month',
      'Basic analytics',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 'R299',
    period: 'per month',
    description: 'Everything growing restaurants need',
    features: [
      '1 restaurant location',
      'Unlimited orders',
      'Advanced analytics & reporting',
      'Up to 10 staff seats',
      'Table-specific QR codes',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Multi-Location',
    price: 'R899',
    period: 'per month',
    description: 'For restaurants with multiple branches',
    features: [
      'Up to 5 restaurant locations',
      'Unlimited orders',
      'Cross-location reporting',
      'Unlimited staff seats',
      'Custom branding',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const faqs = [
  {
    q: 'Do customers need to download an app?',
    a: 'No. Customers scan a QR code with their phone camera and your menu opens directly in their browser. No app, no account, no friction.',
  },
  {
    q: 'Can I use OrderPilot for dine-in and takeaway?',
    a: 'Yes. You can enable or disable dine-in, collection, and delivery independently. Each order type shows only the relevant checkout fields.',
  },
  {
    q: 'How does payment work?',
    a: 'You can start with pay-on-collection or pay-on-delivery. Online payment gateway integration is available for South African providers.',
  },
  {
    q: 'Is my restaurant data isolated from others?',
    a: 'Yes. Every restaurant has its own isolated workspace protected by row-level security policies. Staff can only access the restaurant they belong to.',
  },
  {
    q: 'What devices does the kitchen display work on?',
    a: 'The kitchen display is responsive and works on tablets, laptops, and desktop monitors. It is optimized for touch interaction.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no long-term contracts. You can stop using OrderPilot at any time.',
  },
];

export default function PublicHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-navy-600 hover:text-navy-900">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-navy-600 hover:text-navy-900">How It Works</a>
            <a href="#use-cases" className="text-sm font-medium text-navy-600 hover:text-navy-900">For Restaurants</a>
            <a href="#pricing" className="text-sm font-medium text-navy-600 hover:text-navy-900">Pricing</a>
            <Link to="/login" className="text-sm font-medium text-navy-600 hover:text-navy-900">Login</Link>
            <Link to="/register" className="btn-primary btn-sm">Start Your Restaurant</Link>
          </nav>
          <button
            className="md:hidden text-navy-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-navy-100 bg-white md:hidden">
            <nav className="flex flex-col gap-2 px-4 py-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-navy-600">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-navy-600">How It Works</a>
              <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-navy-600">For Restaurants</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-sm font-medium text-navy-600">Pricing</a>
              <Link to="/login" className="py-2 text-sm font-medium text-navy-600">Login</Link>
              <Link to="/register" className="btn-primary btn-sm mt-2">Start Your Restaurant</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-400 ring-1 ring-primary-500/20">
                <Zap className="h-4 w-4" />
                QR-to-kitchen ordering platform
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Direct orders from
                <span className="text-primary-500"> QR to kitchen</span>
              </h1>
              <p className="mt-6 text-lg text-navy-200 max-w-xl">
                Stop paying marketplace commissions. OrderPilot lets your customers scan, order, and pay — while your kitchen receives orders in real time. Built for South African restaurants.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary btn-lg">
                  Start Your Restaurant
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a href="#how-it-works" className="btn btn-lg border border-navy-600 text-white hover:bg-navy-800">
                  View Demo
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-navy-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500" />
                  No app download for customers
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success-500" />
                  Works on any phone
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10 backdrop-blur">
                <div className="rounded-xl bg-navy-900 p-6 shadow-xl">
                  <div className="flex items-center justify-between border-b border-navy-700 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <QrCode className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Order #12</p>
                        <p className="text-xs text-navy-400">Table 5 · Dine-in</p>
                      </div>
                    </div>
                    <span className="badge-warning">Pending</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-200">2× Beef Burger</span>
                      <span className="text-white font-medium">R 180.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-200">1× Sweet Potato Fries</span>
                      <span className="text-white font-medium">R 45.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-navy-200">1× Coca Cola</span>
                      <span className="text-white font-medium">R 25.00</span>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-navy-700 pt-4">
                    <span className="text-sm text-navy-300">Total</span>
                    <span className="text-lg font-bold text-primary-500">R 250.00</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-navy-300">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
                  New order received in kitchen
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">Everything you need to run direct orders</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-2xl mx-auto">
              From menu creation to kitchen management to sales analytics, OrderPilot connects the entire ordering workflow.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="card-hover p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-navy-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-2xl mx-auto">
              A simple workflow from customer to kitchen to completion.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((step, idx) => (
              <div key={step.title} className="relative">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-bold text-navy-200">0{idx + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-navy-900">{step.title}</h3>
                <p className="mt-2 text-sm text-navy-600">{step.description}</p>
                {idx < steps.length - 1 && (
                  <ArrowRight className="absolute -right-4 top-6 hidden h-6 w-6 text-navy-200 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-20 bg-navy-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Built for every food business</h2>
            <p className="mt-4 text-lg text-navy-300 max-w-2xl mx-auto">
              Whether you run a fine dining restaurant or a street-side takeaway, OrderPilot adapts to how you work.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-xl bg-white/5 p-6 ring-1 ring-white/10">
                <UtensilsCrossed className="h-8 w-8 text-primary-500" />
                <h3 className="mt-4 text-lg font-semibold text-white">{uc.title}</h3>
                <p className="mt-2 text-sm text-navy-300">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-2xl mx-auto">
              Start free and upgrade as you grow. Every plan includes QR ordering and kitchen display.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-navy-900 text-white shadow-xl ring-2 ring-primary-500 scale-105'
                    : 'bg-white text-navy-900 shadow-sm ring-1 ring-navy-100'
                }`}
              >
                <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-navy-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.highlighted ? 'text-navy-300' : 'text-navy-500'}`}>
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-navy-300' : 'text-navy-500'}`}>{plan.period}</span>
                </div>
                <Link
                  to="/register"
                  className={`mt-6 w-full ${plan.highlighted ? 'btn-primary' : 'btn-outline'} block text-center`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlighted ? 'text-primary-500' : 'text-success-600'}`} />
                      <span className={plan.highlighted ? 'text-navy-200' : 'text-navy-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-navy-500">
            Prices are shown in South African Rand (ZAR) and are illustrative examples. Plan details and pricing may change.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy-900 sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="card overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="text-base font-semibold text-navy-900">{faq.q}</span>
                  {openFaq === idx ? <X className="h-5 w-5 text-navy-400" /> : <Menu className="h-5 w-5 text-navy-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-sm text-navy-600 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-600">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to take direct orders?</h2>
          <p className="mt-4 text-lg text-primary-100">
            Set up your restaurant in minutes. No technical skills required.
          </p>
          <Link to="/register" className="mt-8 inline-flex btn btn-lg bg-white text-primary-700 hover:bg-primary-50">
            Start Your Restaurant
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Logo size="md" variant="light" />
              <p className="mt-4 text-sm text-navy-400 max-w-xs">
                QR-to-kitchen ordering platform for independent restaurants.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-navy-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-navy-400">
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Get Started</h4>
              <ul className="mt-3 space-y-2 text-sm text-navy-400">
                <li><Link to="/register" className="hover:text-white">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-navy-800 pt-8">
            <p className="text-sm text-navy-500">© 2026 OrderPilot. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-navy-500">
              <Shield className="h-4 w-4" />
              <span>Built for South Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
