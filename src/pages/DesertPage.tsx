import { useEffect, useRef, useState } from 'react';

function createWindSound(ctx: AudioContext) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 200;
  lowpass.Q.value = 0.5;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 100;
  lfo.connect(lfoGain);
  lfoGain.connect(lowpass.frequency);
  lfo.start();

  const secondFilter = ctx.createBiquadFilter();
  secondFilter.type = 'lowpass';
  secondFilter.frequency.value = 400;
  secondFilter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  source.connect(lowpass);
  lowpass.connect(secondFilter);
  secondFilter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  return { source, gain, lfo };
}

function WheatStalk({ delay, x, height, swayAmount }: { delay: number; x: number; height: number; swayAmount: number }) {
  return (
    <div
      className="absolute bottom-0"
      style={{
        left: `${x}%`,
        height: `${height}px`,
        width: '3px',
        transformOrigin: 'bottom center',
        animation: `wheatSway ${2.5 + delay * 0.3}s ease-in-out ${delay}s infinite alternate`,
        '--sway': `${swayAmount}deg`,
      } as React.CSSProperties}
    >
      <div className="w-full h-full rounded-t-full" style={{ background: 'linear-gradient(to top, #8B7355, #C4A265)' }} />
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2"
        style={{
          width: '8px',
          height: '16px',
          background: 'linear-gradient(to top, #D4B896, #E8D5B7)',
          borderRadius: '50% 50% 30% 30%',
          animation: `wheatHeadSway ${2.5 + delay * 0.3}s ease-in-out ${delay}s infinite alternate`,
          '--headSway': `${swayAmount * 1.2}deg`,
        } as React.CSSProperties}
      />
    </div>
  );
}

function SandDune({ className, gradient }: { className: string; gradient: string }) {
  return (
    <div
      className={`absolute bottom-0 ${className}`}
      style={{ background: gradient }}
    />
  );
}

function FloatingParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${20 + Math.random() * 40}%`,
        width: `${2 + Math.random() * 3}px`,
        height: `${2 + Math.random() * 3}px`,
        background: 'rgba(228, 210, 170, 0.5)',
        animation: `floatParticle ${8 + delay * 2}s linear ${delay}s infinite`,
        opacity: 0,
      }}
    />
  );
}

export function DesertPage() {
  const ctxRef = useRef<AudioContext | null>(null);
  const windRef = useRef<ReturnType<typeof createWindSound> | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!entered) return;
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, [entered]);

  const toggleSound = () => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      windRef.current = createWindSound(ctx);
    }

    if (soundOn) {
      windRef.current?.gain.gain.linearRampToValueAtTime(0, ctxRef.current!.currentTime + 1);
      setSoundOn(false);
    } else {
      if (ctxRef.current!.state === 'suspended') ctxRef.current!.resume();
      windRef.current?.gain.gain.linearRampToValueAtTime(0.15, ctxRef.current!.currentTime + 2);
      setSoundOn(true);
    }
  };

  useEffect(() => {
    return () => {
      windRef.current?.source.stop();
      ctxRef.current?.close();
    };
  }, []);

  const wheatStalks = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: 5 + (i / 60) * 90,
    delay: Math.random() * 2,
    height: 40 + Math.random() * 60,
    swayAmount: 5 + Math.random() * 10,
  }));

  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden cursor-pointer select-none" onClick={() => { if (!entered) setEntered(true); }}>
      <style>{`
        @keyframes wheatSway {
          0% { transform: rotate(calc(var(--sway) * -1)); }
          100% { transform: rotate(var(--sway)); }
        }
        @keyframes wheatHeadSway {
          0% { transform: translateX(-50%) rotate(calc(var(--headSway) * -1)); }
          100% { transform: translateX(-50%) rotate(var(--headSway)); }
        }
        @keyframes floatParticle {
          0% { opacity: 0; transform: translateX(0) translateY(0); }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { opacity: 0; transform: translateX(80px) translateY(-20px); }
        }
        @keyframes sunPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
        @keyframes sunRays {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Sky */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #1a0a2e 0%, #3d1a54 15%, #b74a1a 40%, #e8842a 55%, #f4a940 65%, #f7c96b 75%, #f5d89a 85%, #f0deb4 100%)',
        }}
      />

      {/* Stars (top part) */}
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 20}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            opacity: 0.3 + Math.random() * 0.5,
            animation: `sunPulse ${3 + Math.random() * 3}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* Sun */}
      <div
        className="absolute"
        style={{
          top: '35%',
          left: '50%',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fff8e1 0%, #ffcc02 30%, #ff8a00 60%, transparent 70%)',
          boxShadow: '0 0 60px 30px rgba(255, 200, 0, 0.4), 0 0 120px 60px rgba(255, 140, 0, 0.2)',
          animation: 'sunPulse 6s ease-in-out infinite',
          zIndex: 1,
        }}
      />
      <div
        className="absolute"
        style={{
          top: '35%',
          left: '50%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,200,0,0.15) 0%, transparent 60%)',
          animation: 'sunPulse 6s ease-in-out infinite',
          zIndex: 0,
        }}
      />

      {/* Heat haze shimmer */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(transparent 55%, rgba(255,200,100,0.05) 60%, transparent 65%)',
          animation: 'shimmer 4s ease-in-out infinite',
          backgroundSize: '200% 100%',
        }}
      />

      {/* Far dunes */}
      <SandDune
        className="z-[2]"
        gradient="linear-gradient(180deg, #c4955a 0%, #b8874e 100%)"
        {...{ style: { height: '35%', borderRadius: '50% 60% 0 0 / 100% 100% 0 0', left: '-10%', width: '70%' } } as any}
      />
      <SandDune
        className="z-[2]"
        gradient="linear-gradient(180deg, #b8885a 0%, #a87840 100%)"
        {...{ style: { height: '30%', borderRadius: '60% 50% 0 0 / 100% 100% 0 0', right: '-5%', width: '60%' } } as any}
      />

      {/* Mid dunes */}
      <div
        className="absolute bottom-0 z-[3]"
        style={{
          height: '22%',
          width: '120%',
          left: '-10%',
          background: 'linear-gradient(180deg, #d4a55a 0%, #c49040 50%, #b07830 100%)',
          borderRadius: '40% 45% 0 0 / 100% 100% 0 0',
        }}
      />

      {/* Particles (floating sand) */}
      <div className="absolute inset-0 z-[5]">
        {particles.map(p => (
          <FloatingParticle key={p.id} delay={p.delay} x={p.x} />
        ))}
      </div>

      {/* Near dune (with wheat) */}
      <div
        className="absolute bottom-0 z-[6]"
        style={{
          height: '18%',
          width: '130%',
          left: '-15%',
          background: 'linear-gradient(180deg, #d4a860 0%, #c49050 40%, #9a7040 100%)',
          borderRadius: '35% 50% 0 0 / 100% 100% 0 0',
        }}
      />

      {/* Wheat field */}
      <div className="absolute bottom-0 left-0 right-0 h-[20%] z-[7]">
        {wheatStalks.map(w => (
          <WheatStalk key={w.id} x={w.x} delay={w.delay} height={w.height} swayAmount={w.swayAmount} />
        ))}
      </div>

      {/* Ground sand */}
      <div
        className="absolute bottom-0 z-[8]"
        style={{
          height: '6%',
          width: '110%',
          left: '-5%',
          background: 'linear-gradient(180deg, #a07830 0%, #8a6828 100%)',
        }}
      />

      {/* Sound toggle button */}
      {entered && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleSound(); }}
          className="absolute top-6 right-6 z-[20] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: soundOn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}
        >
          {soundOn ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      )}

      {/* Enter overlay */}
      {!entered && (
        <div
          className="absolute inset-0 z-[25] flex flex-col items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)',
          }}
        >
          <div style={{ animation: 'fadeInUp 1.5s ease-out' }}>
            <img
              src="/logo.jpg"
              alt="CodeMaster"
              className="w-20 h-20 rounded-2xl shadow-2xl mb-6 mx-auto"
              style={{
                animation: 'gentleFloat 3s ease-in-out infinite',
                boxShadow: '0 0 40px rgba(244, 169, 64, 0.4)',
              }}
            />
          </div>
          <p
            className="text-white/60 text-sm tracking-[0.3em] uppercase"
            style={{ animation: 'fadeInUp 1.5s ease-out 0.5s both' }}
          >
            Click to enter
          </p>
        </div>
      )}

      {/* Logo + desert button */}
      {entered && showButton && (
        <div
          className="absolute inset-0 z-[15] flex flex-col items-center justify-center pointer-events-none"
        >
          <div style={{ animation: 'fadeInUp 1.2s ease-out' }}>
            <img
              src="/logo.jpg"
              alt="CodeMaster"
              className="w-16 h-16 rounded-xl shadow-xl mb-8 mx-auto pointer-events-auto cursor-pointer"
              style={{
                boxShadow: '0 0 30px rgba(244, 169, 64, 0.3)',
                animation: 'gentleFloat 4s ease-in-out infinite',
              }}
              onClick={(e) => { e.stopPropagation(); window.location.href = '/'; }}
            />
          </div>

          <div style={{ animation: 'fadeInUp 1.2s ease-out 0.4s both' }}>
            <button
              className="pointer-events-auto group relative px-10 py-4 rounded-2xl font-bold text-lg tracking-wider uppercase transition-all duration-500 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #92400e 100%)',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
              }}
              onClick={(e) => { e.stopPropagation(); window.location.href = '/'; }}
            >
              <span className="relative z-10 flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                CodeMaster
              </span>
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                CodeMaster
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
