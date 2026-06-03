import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import GlowButton from './ui/GlowButton';
import FloatingBlob from './ui/FloatingBlob';

const Hero: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    },
  };

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 -z-10" />
      <FloatingBlob top="10%" right="10%" color="bg-orange-600" delay={0} />
      <FloatingBlob bottom="20%" left="5%" color="bg-red-600" size="w-[500px] h-[500px]" delay={2} />
      
      {/* Horizontal lines with gradients */}
      <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent -z-5" />
      <div className="absolute bottom-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/10 to-transparent -z-5" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl"
        >
          {/* Badge */}
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-orange-500/30 mb-8"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">
              Agência Web Premium
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            variants={itemVariants}
            className="text-6xl md:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tight"
          >
            Transformamos seu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 animate-gradient">
              Negócio em Autoridade
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl leading-relaxed"
          >
            Criamos landing pages de alto impacto e sistemas web que vendem. 
            Design premium, performance extrema e foco total em conversão.
          </motion.p>

          {/* Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap gap-6 mb-16"
          >
            <GlowButton variant="primary" icon={ArrowRight} className="text-lg px-10">
              Quero meu Projeto
            </GlowButton>
            <button className="flex items-center gap-3 text-white font-bold hover:text-orange-500 transition-colors group">
              <div className="w-14 h-14 rounded-full glass flex items-center justify-center border-orange-500/20 group-hover:border-orange-500/50 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all">
                <Play className="fill-white ml-1" size={20} />
              </div>
              Ver Portfólio
            </button>
          </motion.div>

          {/* Benefits */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/10"
          >
            {[
              "Performance 100/100",
              "Design Exclusivo",
              "Suporte 24/7"
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 text-zinc-300">
                <CheckCircle2 className="text-orange-500" size={20} />
                <span className="font-medium">{benefit}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Hero Image / Decorative Element */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        className="absolute right-[-10%] top-1/2 -translate-y-1/2 hidden xl:block w-[700px] pointer-events-none"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-orange-600/20 blur-[120px] rounded-full animate-pulse-glow" />
          <img 
            src="/assets/hero.png" 
            alt="Premium Design" 
            className="relative z-10 w-full drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            onError={(e) => {
               const target = e.target as HTMLImageElement;
               target.src = 'https://via.placeholder.com/800x1000/0a0a0a/f97316?text=Premium+Design';
            }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
