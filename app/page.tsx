"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Eye,
  Zap,
  Globe,
  Users,
  ArrowRight,
  Star,
  CheckCircle,
  KeyRound,
  CreditCard,
  FileText,
  ScanLine,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Hero Animations
      const tl = gsap.timeline();
      tl.from(".hero-badge", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      })
        .from(
          ".hero-title",
          { y: 40, opacity: 0, duration: 0.8, ease: "power3.out" },
          "-=0.4",
        )
        .from(
          ".hero-desc",
          { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" },
          "-=0.6",
        )
        .from(
          ".hero-cta",
          { scale: 0.9, opacity: 0, duration: 0.6, ease: "back.out(1.7)" },
          "-=0.4",
        )
        .from(
          ".hero-visual",
          { y: 100, opacity: 0, duration: 1.2, ease: "power4.out" },
          "-=0.8",
        );

      // Section Reveals
      gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            toggleActions: "play none none none",
          },
          y: 60,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
        });
      });

      // Feature Cards Stagger
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 75%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
      });

      // Floating animation for visual elements
      gsap.to(".floating", {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Logo rotation on scroll
      gsap.to(".security-lock", {
        scrollTrigger: {
          trigger: ".security-section",
          start: "top 90%",
          end: "bottom 10%",
          scrub: 1,
        },
        rotate: 360,
        scale: 1.1,
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <div className="logo-icon">
              <Shield size={20} color="white" />
            </div>
            <span>Vaultora</span>
          </div>
          <div className="nav-links">
            <Link href="/signin" className="nav-link">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary nav-cta">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Star
              size={14}
              fill="var(--accent-amber)"
              color="var(--accent-amber)"
            />
            <span>Used by 50,000+ security experts</span>
          </div>
          <h1 className="hero-title">
            Your Digital Life, <br />
            <span className="gradient-text">Encrypted & Infinite.</span>
          </h1>
          <p className="hero-desc">
            Vaultora is the world's most advanced credential manager. Store
            passwords, documents, and payment cards in an unbreakable,
            zero-knowledge private vault.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary hero-btn">
              Create Your Free Vault <ArrowRight size={18} />
            </Link>
            <p className="hero-sub-cta">
              No credit card required. Free forever for individuals.
            </p>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card floating">
            <div className="visual-icons">
              <KeyRound className="v-icon icon-1" />
              <CreditCard className="v-icon icon-2" />
              <FileText className="v-icon icon-3" />
              <ScanLine className="v-icon icon-4" />
            </div>
            <div className="visual-lines">
              <div className="v-line" style={{ width: "80%" }}></div>
              <div className="v-line" style={{ width: "60%" }}></div>
              <div className="v-line" style={{ width: "90%" }}></div>
            </div>
          </div>
          <div className="visual-blur shadow-glow"></div>
        </div>
      </section>

      {/* Security Section */}
      <section className="security-section reveal-section">
        <div className="section-header">
          <div className="security-lock">
            <Lock size={40} color="var(--accent-primary)" />
          </div>
          <h2 className="section-title">Zero-Knowledge Architecture</h2>
          <p className="section-desc">
            We don't know your password. We can't see your data. Even if we were
            compromised, your vault remains a black box to everyone but you.
          </p>
        </div>

        <div className="security-grid">
          <div className="sec-item">
            <div className="sec-icon">
              <Shield size={24} />
            </div>
            <h3>AES-256 Bit Encryption</h3>
            <p>
              Military-grade encryption for all your stored credentials and
              documents.
            </p>
          </div>
          <div className="sec-item">
            <div className="sec-icon">
              <Zap size={24} />
            </div>
            <h3>Quantum-Resistant</h3>
            <p>
              Built with future-proof algorithms that stand against the next
              generation of threats.
            </p>
          </div>
          <div className="sec-item">
            <div className="sec-icon">
              <Globe size={24} />
            </div>
            <h3>Localized Keys</h3>
            <p>
              Your decryption keys never leave your device. Your data is yours
              alone.
            </p>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="features-section reveal-section">
        <div className="section-header">
          <h2 className="section-title">
            Everything You Need <br /> To Stay Secure
          </h2>
        </div>

        <div className="features-grid">
          <div className="feature-card password">
            <div className="f-icon">
              <KeyRound size={28} />
            </div>
            <h3>Secure Passwords</h3>
            <p>
              Generate unbreakable passwords and store them with custom fields
              and secure notes.
            </p>
            <ul className="f-list">
              <li>
                <CheckCircle size={14} /> Password Audit
              </li>
              <li>
                <CheckCircle size={14} /> Passkey Support
              </li>
              <li>
                <CheckCircle size={14} /> Auto-fill Anywhere
              </li>
            </ul>
          </div>

          <div className="feature-card card">
            <div className="f-icon">
              <CreditCard size={28} />
            </div>
            <h3>PCI-Compliant Cards</h3>
            <p>
              Store your credit and debit cards with beautiful visuals and
              quick-copy functionality.
            </p>
            <ul className="f-list">
              <li>
                <CheckCircle size={14} /> Virtual Previews
              </li>
              <li>
                <CheckCircle size={14} /> Expiry Notifications
              </li>
              <li>
                <CheckCircle size={14} /> CVV Protection
              </li>
            </ul>
          </div>

          <div className="feature-card document">
            <div className="f-icon">
              <FileText size={28} />
            </div>
            <h3>Private Documents</h3>
            <p>
              Upload passports, ID cards, and sensitive files. All encrypted
              before they reach us.
            </p>
            <ul className="f-list">
              <li>
                <CheckCircle size={14} /> PDF/Image Support
              </li>
              <li>
                <CheckCircle size={14} /> Multi-page Scanning
              </li>
              <li>
                <CheckCircle size={14} /> Secure Attachments
              </li>
            </ul>
          </div>

          <div className="feature-card scan">
            <div className="f-icon">
              <ScanLine size={28} />
            </div>
            <h3>Intelligent OCR</h3>
            <p>
              Scan physical documents. Our built-in AI extracts the data and
              stores it automatically.
            </p>
            <ul className="f-list">
              <li>
                <CheckCircle size={14} /> ID Auto-Detection
              </li>
              <li>
                <CheckCircle size={14} /> Text Recognition
              </li>
              <li>
                <CheckCircle size={14} /> Metadata Extraction
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Collaboration Section */}
      <section className="collab-section reveal-section">
        <div className="collab-content">
          <h2 className="section-title">
            Built for Families <br /> & Teams
          </h2>
          <p className="section-desc">
            Securely share items with your family or colleagues without exposing
            raw passwords. Revoke access at any time with one click.
          </p>
          <div className="collab-stats">
            <div className="stat">
              <Users size={32} />
              <div className="stat-info">
                <h4>Granular Permissions</h4>
                <p>Read-only, Admin, or Full Control.</p>
              </div>
            </div>
            <div className="stat">
              <Globe size={32} />
              <div className="stat-info">
                <h4>Sync Everywhere</h4>
                <p>Desktop, Mobile, and Browser.</p>
              </div>
            </div>
          </div>
          <Link href="/signup" className="btn btn-secondary">
            Learn About Sharing
          </Link>
        </div>
        <div className="collab-visual shadow-glow">
          <div className="v-circle"></div>
          <div className="v-circle-2"></div>
          <Shield
            size={120}
            className="floating"
            color="rgba(99, 102, 241, 0.4)"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section reveal-section">
        <div className="cta-card">
          <h2 className="cta-title">
            Ready to take control <br /> of your security?
          </h2>
          <p className="cta-desc">
            Join millions of users who trust Vaultora with their most sensitive
            data.
          </p>
          <div className="cta-buttons">
            <Link href="/signup" className="btn btn-primary cta-btn">
              Get Started Now
            </Link>
            <Link href="/signin" className="btn btn-ghost cta-btn">
              Already have a vault?
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <Shield size={24} color="var(--accent-primary)" />
            <span>Vaultora</span>
          </div>
          <p className="footer-credits">
            © 2026 Vaultora Vaults. All rights reserved. <br /> Built for
            absolute privacy.
          </p>
        </div>
      </footer>
    </div>
  );
}
