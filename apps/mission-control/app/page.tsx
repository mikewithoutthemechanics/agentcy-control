'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface MagneticProps { children: React.ReactNode; className?: string; strength?: number; }

function Magnetic({ children, className = '', strength = 0.3 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }, [x, y, strength]);

  const handleLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function WordReveal({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const words = ref.current.querySelectorAll('.word');
    gsap.fromTo(words,
      { y: 60, opacity: 0, rotateX: -40 },
      {
        y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 80%', toggleActions: 'play none none none' },
      }
    );
  }, []);

  return (
    <div ref={ref} className={`perspective-[1000px] ${className}`}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="word inline-block mr-[0.25em]" style={{ opacity: 0, transformStyle: 'preserve-3d' }}>
          {word}
        </span>
      ))}
    </div>
  );
}

function Odometer({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value, duration: 2.5, ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%', toggleActions: 'play none none none' },
      onUpdate: () => setDisplay(Math.floor(obj.val)),
    });
  }, [value]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').split('.')[0] + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[10px] tracking-widest text-[#5a554f]">{time}</span>;
}

const telemetryData = [
  'SYS_ONLINE', 'UPTIME_99.97%', 'DEPLOYS_1427', 'INCIDENTS_0',
  'REGIONS_12', 'AGENCIES_482', 'PROJECTS_12400', 'LATENCY_24MS',
  'STATUS_GREEN', 'ENCRYPTION_AES-256', 'BACKUP_OK', 'AUDIT_CLEAN',
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [navVisible, setNavVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useEffect(() => {
    const onScroll = () => setNavVisible(window.scrollY > 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-line',
        { y: 120, opacity: 0, skewY: 8 },
        { y: 0, opacity: 1, skewY: 0, duration: 1.4, stagger: 0.12, ease: 'power4.out', delay: 0.3 }
      );
      gsap.fromTo('.hero-meta',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 1.2 }
      );
      gsap.fromTo('.hero-cta',
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 1.6 }
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.parallax-slow').forEach((el) => {
        gsap.to(el, { y: -60, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.5 } });
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((el) => {
        gsap.fromTo(el, { y: 80, opacity: 0 }, {
          y: 0, opacity: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const strip = document.querySelector<HTMLElement>('.telemetry-strip-inner');
    if (!strip) return;
    const total = strip.scrollWidth - window.innerWidth;
    gsap.to(strip, {
      x: -total, ease: 'none',
      scrollTrigger: { trigger: '.telemetry-section', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#f5f0e8] overflow-x-hidden selection:bg-[#e85d04] selection:text-white">
      <div className="pointer-events-none fixed z-[9999] w-[400px] h-[400px] rounded-full opacity-20 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(232,93,4,0.15) 0%, transparent 70%)',
          transform: `translate(${cursorPos.x - 200}px, ${cursorPos.y - 200}px)`,
          transition: 'transform 0.15s ease-out',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-40 opacity-[0.03]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }}
      />
      <motion.nav
        initial={false}
        animate={navVisible ? { y: 0, opacity: 1 } : { y: -20, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-[100] backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-[#1a1a1a]"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-[#e85d04] rounded-sm group-hover:rotate-45 transition-transform duration-500" />
            <span className="text-sm font-bold tracking-[0.2em] uppercase">Agentcy</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {['Capabilities', 'Telemetry', 'Transmission'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-[11px] tracking-[0.15em] uppercase text-[#8a8279] hover:text-[#f5f0e8] transition-colors duration-300 relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#e85d04] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <Link href="/auth">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="text-[11px] tracking-[0.15em] uppercase px-5 py-2 border border-[#e85d04] text-[#e85d04] hover:bg-[#e85d04] hover:text-white transition-colors duration-300 cursor-pointer">
                Initiate
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.nav>
      <section ref={heroRef} className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#050505]" />
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(232,93,4,0.3) 0%, transparent 60%)', animation: 'pulse 8s ease-in-out infinite' }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(157,2,8,0.25) 0%, transparent 60%)', animation: 'pulse 10s ease-in-out infinite 2s' }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.04]"
            style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(232,93,4,0.4) 60deg, transparent 120deg)', animation: 'spin 12s linear infinite' }}
          />
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen" poster="">
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, transparent 30%, #0a0a0a 85%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 pt-24 pb-16">
          <div className="hero-meta flex items-center gap-6 mb-12 opacity-0">
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#e85d04] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-[#e85d04] rounded-full animate-pulse" />
              System Online
            </span>
            <span className="w-px h-3 bg-[#2a2a2a]" />
            <LiveClock />
          </div>
          <h1 className="text-[clamp(3rem,12vw,10rem)] font-black leading-[0.85] tracking-[-0.04em] uppercase">
            <span className="hero-line block opacity-0">Command</span>
            <span className="hero-line block opacity-0 text-[#8a8279]">&</span>
            <span className="hero-line block opacity-0">Control</span>
          </h1>
          <div className="hero-meta max-w-xl mb-14 opacity-0">
            <p className="text-[15px] leading-relaxed text-[#8a8279] font-light">
              Mission-critical infrastructure for agencies that refuse to operate in the dark.
              Real-time telemetry. Automated response. Unified command.
            </p>
          </div>
          <div className="hero-cta flex flex-col sm:flex-row items-start sm:items-center gap-8 opacity-0">
            <Magnetic strength={0.4}>
              <Link href="/auth">
                <motion.span
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#e85d04] text-white text-[11px] tracking-[0.25em] uppercase font-bold hover:bg-[#ff6b1a] transition-colors duration-300 cursor-pointer"
                >
                  Initiate Sequence
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
                </motion.span>
              </Link>
            </Magnetic>
            <div className="font-mono text-[10px] tracking-widest text-[#5a554f] space-y-1">
              <div>LOC: 40.7128 N, 74.0060 W</div>
              <div>STATUS: NOMINAL</div>
            </div>
          </div>
        </div>
        <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span className="text-[9px] tracking-[0.3em] uppercase text-[#5a554f]">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#5a554f] to-transparent" />
        </motion.div>
      </section>
      <section className="telemetry-section py-8 border-y border-[#1a1a1a] overflow-hidden bg-[#0d0d0d]">
        <div className="telemetry-strip-inner flex items-center gap-12 whitespace-nowrap">
          {[...telemetryData, ...telemetryData, ...telemetryData].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="font-mono text-[11px] tracking-[0.2em] text-[#5a554f] uppercase">{item}</span>
              <span className="w-1.5 h-1.5 bg-[#e85d04] rounded-full opacity-60" />
            </div>
          ))}
        </div>
      </section>
      {/* MANIFESTO */}
      <section className="py-32 lg:py-48 px-6 lg:px-10 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-4">
            <motion.span initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="block text-[10px] tracking-[0.3em] uppercase text-[#e85d04] mb-6 font-mono">
              [ 01 / Manifesto ]
            </motion.span>
          </div>
          <div className="lg:col-span-8">
            <WordReveal
              text="Most agencies run on chaos. Spreadsheets, Slack threads, and hope. When systems fail, nobody knows who owns the response. Clients panic. Revenue evaporates."
              className="text-[clamp(1.5rem,4vw,3.5rem)] font-light leading-[1.15] tracking-[-0.02em] text-[#f5f0e8] mb-12"
            />
            <div className="reveal-up w-24 h-px bg-[#e85d04] mb-12" />
            <WordReveal
              text="Agentcy is different. It is the operating system for agencies that treat reliability as a competitive advantage."
              className="text-[clamp(1.2rem,2.5vw,1.8rem)] font-light leading-[1.3] tracking-[-0.01em] text-[#8a8279]"
            />
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="py-32 px-6 lg:px-10 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 lg:gap-32 items-start">
          <div className="lg:sticky lg:top-24">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: 'easeOut' }}
              className="relative aspect-[4/5] bg-[#111] rounded-sm overflow-hidden border border-[#1a1a1a]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {[1,2,3,4].map((ring) => (
                    <div key={ring} className="absolute inset-0 rounded-full border border-[#e85d04]"
                      style={{ transform: `scale(${ring * 0.25})`, opacity: 0.15 }} />
                  ))}
                  <div className="absolute inset-0" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(232,93,4,0.3) 5deg, transparent 10deg)', animation: 'spin 4s linear infinite' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#e85d04] rounded-full animate-pulse" />
                </div>
              </div>
              <div className="absolute top-4 left-4 font-mono text-[9px] tracking-[0.2em] text-[#5a554f] uppercase">Radar<br />Active</div>
              <div className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.2em] text-[#5a554f] uppercase text-right">Range<br />Unlimited</div>
            </motion.div>
          </div>

          <div className="space-y-24">
            {[
              { num: '01', title: 'Unified Telemetry', body: 'Every metric, log, and heartbeat from every environment flowing into one coherent stream. No more tab archaeology.' },
              { num: '02', title: 'Autonomous Response', body: 'When anomalies fire, runbooks execute automatically. On-call rotations trigger. Stakeholders notify. The system heals before humans even open Slack.' },
              { num: '03', title: 'Client Transparency', body: 'Branded status pages that update in real time. Your clients see exactly what you see. Build trust through radical visibility.' },
              { num: '04', title: 'Cost Intelligence', body: 'Per-project burn tracking with predictive forecasting. Know which client is eating your margin before the invoice lands.' },
            ].map((cap) => (
              <motion.div key={cap.num} initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }} className="group">
                <span className="block font-mono text-[10px] tracking-[0.3em] text-[#e85d04] mb-4">[ {cap.num} ]</span>
                <h3 className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] mb-5 group-hover:text-[#e85d04] transition-colors duration-500">{cap.title}</h3>
                <p className="text-[15px] leading-[1.7] text-[#8a8279] max-w-md">{cap.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-32 lg:py-48 px-6 lg:px-10 border-y border-[#1a1a1a] bg-[#080808]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="block text-[10px] tracking-[0.3em] uppercase text-[#e85d04] mb-6 font-mono">
                [ 02 / Operating Data ]
              </motion.span>
              <h2 className="text-2xl lg:text-3xl font-light tracking-[-0.02em] leading-tight">
                Numbers that matter to agencies running real systems.
              </h2>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { value: 482, suffix: '', label: 'Active Agencies' },
                { value: 12400, suffix: '', label: 'Monitored Projects' },
                { value: 99, suffix: '.97%', label: 'Mean Uptime' },
                { value: 40, suffix: '%', label: 'Deploy Velocity Gain' },
              ].map((stat) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="group">
                  <div className="text-[clamp(2.5rem,6vw,5rem)] font-black tracking-[-0.04em] text-[#f5f0e8] group-hover:text-[#e85d04] transition-colors duration-500">
                    <Odometer value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[11px] tracking-[0.15em] uppercase text-[#5a554f] mt-2">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
      {/* FIELD REPORTS */}
      <section id="telemetry" className="py-32 lg:py-48 px-6 lg:px-10 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-2">
            <span className="block text-[10px] tracking-[0.3em] uppercase text-[#e85d04] font-mono">
              [ 03 /<br />Field<br />Report ]
            </span>
          </div>
          <div className="lg:col-span-10 space-y-20">
            {[
              { quote: 'We were running on five different platforms before Agentcy. Now we have one source of truth. Deployment velocity up forty percent. Incident response time cut in half.', author: 'Sarah Chen', role: 'CTO, PixelForge' },
              { quote: 'The incident management alone saved us during a critical outage last month. The runbook automation is genuinely game-changing.', author: 'Marcus Johnson', role: 'DevOps Lead, StackStream' },
              { quote: 'Client portals mean our customers see real-time status without flooding our Slack. That alone paid for the subscription in the first month.', author: 'Elena Rodriguez', role: 'VP Engineering, CloudNine' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.8 }} className="group border-l-2 border-[#1a1a1a] pl-8 hover:border-[#e85d04] transition-colors duration-500">
                <p className="text-[clamp(1.2rem,2.5vw,1.6rem)] font-light leading-[1.4] tracking-[-0.01em] text-[#f5f0e8] mb-6 italic">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#e85d04] to-[#9d0208] rounded-sm flex items-center justify-center text-[10px] font-bold">
                    {t.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.author}</div>
                    <div className="text-xs text-[#5a554f]">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSMISSION */}
      <section id="transmission" className="py-32 lg:py-48 px-6 lg:px-10 border-t border-[#1a1a1a]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="block text-[10px] tracking-[0.3em] uppercase text-[#e85d04] mb-6 font-mono">
                [ 04 / Transmission ]
              </motion.span>
              <h2 className="text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.04em] leading-[0.95] mb-8">
                Ready to<br />assume control?
              </h2>
              <p className="text-[15px] leading-[1.7] text-[#8a8279] max-w-md mb-10">
                Join the agencies that refuse to run on hope. Start your deployment in under five minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Magnetic strength={0.3}>
                  <Link href="/auth">
                    <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-[#e85d04] text-white text-[11px] tracking-[0.25em] uppercase font-bold hover:bg-[#ff6b1a] transition-colors duration-300 cursor-pointer">
                      Begin Deployment
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
                    </motion.span>
                  </Link>
                </Magnetic>
                <span className="font-mono text-[10px] tracking-widest text-[#5a554f] py-4">
                  NO CREDIT CARD / 14-DAY TRIAL
                </span>
              </div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
              className="relative aspect-square bg-[#111] border border-[#1a1a1a] overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-mono text-[10px] tracking-[0.3em] text-[#5a554f] mb-4">SYSTEM STATUS</div>
                  <div className="text-6xl font-black text-[#e85d04] animate-pulse">GO</div>
                  <div className="font-mono text-[10px] tracking-widest text-[#5a554f] mt-4">ALL SYSTEMS NOMINAL</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 lg:px-10 border-t border-[#1a1a1a] bg-[#050505]">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#e85d04] rounded-sm" />
            <span className="text-xs font-bold tracking-[0.2em] uppercase">Agentcy</span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.2em] text-[#5a554f] uppercase">
            &copy; 2025 Agentcy Control. All systems monitored.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] tracking-[0.15em] uppercase text-[#5a554f] hover:text-[#f5f0e8] transition-colors">Status</a>
            <a href="#" className="text-[10px] tracking-[0.15em] uppercase text-[#5a554f] hover:text-[#f5f0e8] transition-colors">Security</a>
            <a href="#" className="text-[10px] tracking-[0.15em] uppercase text-[#5a554f] hover:text-[#f5f0e8] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
