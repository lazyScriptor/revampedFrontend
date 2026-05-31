import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── YouTube product demo (Sinhala walkthrough) ──────────────────────────────
// Lite-embed pattern: show a static thumbnail until the user clicks Play,
// then swap to the real iframe. This keeps the LCP fast, avoids loading the
// ~500 KB YouTube player bundle on every visit, and defers YT cookies until
// the visitor actually consents. ?t=56 jumps past the intro reel.
const DEMO_VIDEO = {
  id: "SvrlC_b1XMg",
  startSeconds: 56,
  // maxresdefault for retina, hqdefault as automatic fallback if the channel
  // hasn't rendered the 1280×720 thumbnail yet.
  posterMax: "https://i.ytimg.com/vi/SvrlC_b1XMg/maxresdefault.jpg",
  posterHq: "https://i.ytimg.com/vi/SvrlC_b1XMg/hqdefault.jpg",
};

const GearGridLanding = () => {
  // Modal & Flow State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState("auth");
  const [userEmail, setUserEmail] = useState("");
  const [demoMessage, setDemoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Toggles the YouTube iframe in the video showcase. False = poster + play
  // button; true = real iframe loaded with autoplay from t=56s.
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // --- Premium Animation Easing ---
  const transition = { duration: 0.8, ease: [0.22, 1, 0.36, 1] };
  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition },
  };
  const scaleUp = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition },
  };

  // --- Demo Flow Handlers ---
  const handleSimulateSSOLogin = (provider) => {
    // Simulating Google/Microsoft login return
    setTimeout(() => {
      const simulatedEmail = `director@enterprise.com`;
      setUserEmail(simulatedEmail);
      setDemoMessage(
        `To the GearGrid Enterprise Implementation Team,\n\nI am formally requesting trial access to the GearGrid Rental Management System. \n\nPlease provision a secure demo workspace linked to my authenticated corporate account: ${simulatedEmail}.\n\nI am primarily interested in evaluating the Data Arena and Multi-Warehouse routing capabilities for our current fleet operations.\n\nI look forward to discussing integration possibilities.\n\nBest regards.`,
      );
      setDemoStep("form");
    }, 600);
  };

  const handleSubmitDemoRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use the correct production endpoint when deployed
      const response = await fetch(
        import.meta.env.PROD 
          ? "https://api.geargrid.live/api/contact/request-demo"
          : "http://localhost:8086/api/contact/request-demo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            message: demoMessage,
            companyName: "Corporate Request",
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to send request");

      // Move to success screen
      setDemoStep("success");
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setTimeout(() => setDemoStep("auth"), 500);
      }, 3000);
    } catch (error) {
      console.error("Error sending demo request:", error);
      alert(
        "Failed to send the request. Please ensure the backend is running.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isDemoModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
  }, [isDemoModalOpen]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 selection:bg-amber-500 selection:text-white overflow-hidden relative">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[30%] w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.08) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>

      {/* --- Glassmorphic Navigation --- */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ ...transition, duration: 1 }}
        className="fixed w-full bg-white/70 backdrop-blur-2xl z-40 border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between h-24 items-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex-shrink-0 flex items-center gap-3 cursor-pointer"
            >
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                GearGrid
              </span>
            </motion.div>

            <div className="hidden md:flex items-center space-x-10">
              <a
                href="#bento"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Modules
              </a>
              <a
                href="#architecture"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Architecture
              </a>
              <a
                href="#contact"
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Contact
              </a>

              <div className="w-px h-6 bg-slate-200"></div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDemoModalOpen(true)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-full hover:border-slate-300 shadow-sm transition-colors duration-300"
              >
                Request Demo
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/login"
                className="px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-amber-500 shadow-lg shadow-slate-900/10 transition-colors duration-300"
              >
                Launch System
              </motion.a>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- Extravagant Hero Section --- */}
      <section className="relative pt-48 pb-32 lg:pt-64 lg:pb-40 z-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-6 lg:px-8 text-center"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 font-semibold text-xs tracking-widest uppercase mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Enterprise Rental Logic
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-900 mb-8 leading-[1.1]"
          >
            Intelligent{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              Machinery
            </span>{" "}
            <br />
            Management.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed font-light"
          >
            An extravagantly engineered ecosystem for industry leaders. Connect
            multi-tenant warehouses, automate complex POS invoicing, and track
            heavy equipment at unparalleled scale.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDemoModalOpen(true)}
              className="px-10 py-5 text-lg font-bold rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:bg-amber-500 transition-colors flex items-center justify-center gap-3 group"
            >
              Request Trial Demo
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* --- Abstract Floating UI --- */}
      <section className="relative w-full max-w-7xl mx-auto px-6 h-64 md:h-96 -mt-20 z-0">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full bg-white rounded-t-3xl border-t border-x border-slate-200 shadow-2xl shadow-slate-900/5 relative overflow-hidden"
        >
          <div className="h-12 border-b border-slate-100 flex items-center px-6 gap-2 bg-slate-50/50">
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
            <div className="ml-4 h-4 w-48 bg-slate-200 rounded-md"></div>
          </div>
          <div className="p-8 grid grid-cols-3 gap-8 opacity-40">
            <div className="space-y-4">
              <div className="h-3 w-1/2 bg-amber-500/20 rounded"></div>
              <div className="h-2 w-full bg-slate-100 rounded"></div>
              <div className="h-2 w-full bg-slate-100 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-3 w-1/3 bg-blue-500/20 rounded"></div>
              <div className="h-2 w-full bg-slate-100 rounded"></div>
              <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- Bento Box Features Grid --- */}
      <section
        id="bento"
        className="py-32 relative z-10 bg-white border-t border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
              Designed for Complexity.
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">
              Every module is deeply interconnected. From multi-tenant
              configurations to intricate POS ledger settlements.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6"
          >
            <motion.div
              variants={scaleUp}
              className="md:col-span-2 md:row-span-1 bg-[#F8F9FA] rounded-[2rem] p-10 border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-500 group overflow-hidden relative"
            >
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-8 text-slate-900 group-hover:text-amber-500 transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Enterprise POS Checkout
              </h3>
              <p className="text-slate-600 text-lg leading-relaxed max-w-md">
                Comprehensive checkout terminal handling complex return
                settlements, automated bulk invoicing, and real-time payment
                ledger synchronization.
              </p>
            </motion.div>

            <motion.div
              variants={scaleUp}
              className="bg-[#F8F9FA] rounded-[2rem] p-10 border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-500 group relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-8 text-slate-900 group-hover:text-red-500 transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Defect Tracking
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Log, monitor, and resolve machinery defects instantly via the
                dedicated maintenance portal.
              </p>
            </motion.div>

            <motion.div
              variants={scaleUp}
              className="bg-[#F8F9FA] rounded-[2rem] p-10 border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-500 group relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-8 text-slate-900 group-hover:text-blue-500 transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Multi-Warehouse
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Cross-depot transfers and real-time inventory geolocation
                mapping.
              </p>
            </motion.div>

            <motion.div
              variants={scaleUp}
              className="md:col-span-2 md:row-span-1 bg-slate-900 rounded-[2rem] p-10 border border-slate-800 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-8 text-amber-500">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                The Data Arena (Bulk Ops)
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Our exclusive bulk-management engine. Ingest thousands of
                equipment logs, customers, and invoice records without latency.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- Deep Dive: Architecture & RBAC --- */}
      <section id="architecture" className="py-32 relative z-10 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={transition}
            >
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
                Secure. Multi-Tenant. <br />
                <span className="text-slate-400">Strictly Governed.</span>
              </h2>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed font-light">
                GearGrid implements a highly sophisticated Role-Based Access
                Control (RBAC) model out of the box. Protect sensitive financial
                data and restrict warehouse operations down to the individual
                permission level.
              </p>

              <div className="space-y-8">
                {[
                  {
                    title: "Tenant Configuration",
                    desc: "Isolate data structures across completely separate corporate entities.",
                  },
                  {
                    title: "Granular Permissions",
                    desc: "Assign precise read/write access to roles across 15+ backend modules.",
                  },
                  {
                    title: "Action Tracing",
                    desc: "Immutable invoice traces and user action logs for compliance auditing.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {item.title}
                      </h4>
                      <p className="text-slate-600 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={transition}
              className="relative"
            >
              <div className="absolute inset-0 bg-slate-200/50 rounded-3xl transform rotate-3"></div>
              <div className="relative bg-white border border-slate-200 shadow-xl rounded-3xl p-10">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                  <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold">
                    Admin
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      System Administrator
                    </div>
                    <div className="text-sm text-amber-500 font-semibold">
                      Full Access Configured
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    "Manage_Users",
                    "Execute_Bulk_Invoice",
                    "Edit_Tenant_Config",
                    "Resolve_Defect_Log",
                  ].map((perm, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <span className="font-mono text-sm text-slate-600">
                        {perm}
                      </span>
                      <div className="w-10 h-6 bg-amber-500 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- Contact Section --- */}
      <section
        id="contact"
        className="py-32 relative z-10 bg-white border-t border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-[#FAFAFA] border border-slate-200 rounded-[3rem] p-10 md:p-20 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-16 relative z-10">
              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
                  Let's build your grid.
                </h2>
                <p className="text-xl text-slate-500 mb-12 font-light">
                  Speak directly with our implementation engineers to architect
                  a rental system tailored perfectly to your operational scale.
                </p>

                <div className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Direct Line
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        +94 77 772 2295
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Enterprise Email
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        contact@geargrid.live
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white p-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50"
              >
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Corporate Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Official Email
                    </label>
                    <input
                      type="email"
                      className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                      placeholder="leader@company.com"
                    />
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-slate-900/10 mt-4"
                  >
                    Initialize Contact
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Interactive Demo Modal (SSO Simulation + Email Send) --- */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsDemoModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Request Enterprise Demo
                </h3>
                <button
                  disabled={isSubmitting}
                  onClick={() => setIsDemoModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-8">
                <AnimatePresence mode="wait">
                  {demoStep === "auth" && (
                    <motion.div
                      key="auth"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="text-center py-4"
                    >
                      <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">
                        Verify Corporate Identity
                      </h4>
                      <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                        To provision a secure environment, please authenticate
                        using your enterprise account.
                      </p>

                      <div className="space-y-4 max-w-md mx-auto">
                        <button
                          onClick={() => handleSimulateSSOLogin("google")}
                          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all font-semibold text-slate-700"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Continue with Google
                        </button>
                        <button
                          onClick={() => handleSimulateSSOLogin("microsoft")}
                          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all font-semibold text-slate-700"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 21 21">
                            <path fill="#f25022" d="M1 1h9v9H1z" />
                            <path fill="#00a4ef" d="M1 11h9v9H1z" />
                            <path fill="#7fba00" d="M11 1h9v9h-9z" />
                            <path fill="#ffb900" d="M11 11h9v9h-9z" />
                          </svg>
                          Continue with Microsoft
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {demoStep === "form" && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="flex items-center gap-3 mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100">
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm font-semibold">
                          Authenticated as:{" "}
                          <span className="font-bold underline">
                            {userEmail}
                          </span>
                        </span>
                      </div>

                      <form onSubmit={handleSubmitDemoRequest}>
                        <div className="mb-6">
                          <label className="block text-sm font-bold text-slate-900 mb-2">
                            Formal Demo Request
                          </label>
                          <textarea
                            value={demoMessage}
                            onChange={(e) => setDemoMessage(e.target.value)}
                            rows={9}
                            disabled={isSubmitting}
                            className="w-full bg-[#FAFAFA] border border-slate-200 rounded-xl px-5 py-4 text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all text-sm leading-relaxed resize-none disabled:opacity-50"
                          />
                        </div>
                        <motion.button
                          disabled={isSubmitting}
                          whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                          type="submit"
                          className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                          {isSubmitting
                            ? "Transmitting Request..."
                            : "Send Request to GearGrid"}
                          {!isSubmitting && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          )}
                        </motion.button>
                      </form>
                    </motion.div>
                  )}

                  {demoStep === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-10"
                    >
                      <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-10 h-10"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h4 className="text-2xl font-bold text-slate-900 mb-2">
                        Request Transmitted
                      </h4>
                      <p className="text-slate-500 max-w-sm mx-auto">
                        Our implementation team will review your requirements
                        and contact you at <strong>{userEmail}</strong> shortly.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Standard Minimal Footer --- */}
      <footer className="bg-white border-t border-slate-200 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">GG</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              GearGrid
            </span>
          </div>
          <div className="flex gap-8 text-sm font-semibold text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-slate-900 transition-colors">
              Terms
            </a>
            <a href="/login" className="hover:text-amber-500 transition-colors">
              Login
            </a>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            © {new Date().getFullYear()} GearGrid Technologies.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GearGridLanding;
