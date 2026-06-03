import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

const faqs = [
  {
    question: "Quanto tempo leva para meu site ficar pronto?",
    answer: "O prazo médio para entrega de uma landing page premium é de 7 a 15 dias úteis, dependendo da complexidade do projeto e da agilidade no envio dos materiais necessários."
  },
  {
    question: "Eu mesmo poderei editar o conteúdo do site?",
    answer: "Sim! Desenvolvemos nossos sites de forma modular e, se solicitado, integramos um painel administrativo intuitivo para que você possa alterar textos e imagens sem precisar de código."
  },
  {
    question: "O site já vem otimizado para o Google (SEO)?",
    answer: "Com certeza. Todos os nossos projetos seguem as diretrizes mais rigorosas de SEO técnico, garantindo que sua página tenha a melhor base possível para rankear bem nas buscas."
  },
  {
    question: "Vocês fazem a identidade visual da minha marca?",
    answer: "Embora nosso foco principal seja o desenvolvimento web, oferecemos pacotes que incluem o design da interface (UI) seguindo seu guia de marca ou criando um conceito visual do zero."
  },
  {
    question: "Terei suporte após a entrega do projeto?",
    answer: "Sim, oferecemos suporte técnico especializado e garantia contra qualquer erro técnico por 30 dias após o lançamento. Também temos planos de manutenção mensal."
  }
];

const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({
  question,
  answer,
  isOpen,
  onClick
}) => {
  return (
    <div 
      className={`mb-4 overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOpen ? 'border-orange-500/50 glass-orange' : 'border-white/10 glass hover:border-white/20'
      }`}
    >
      <button
        onClick={onClick}
        className="w-full px-8 py-6 flex items-center justify-between text-left transition-colors"
      >
        <span className={`text-xl font-bold ${isOpen ? 'text-white' : 'text-zinc-300'}`}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className={`flex-shrink-0 ml-4 ${isOpen ? 'text-orange-500' : 'text-zinc-500'}`}
        >
          <ChevronDown size={24} />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-8 pb-6 text-zinc-400 leading-relaxed text-lg border-t border-orange-500/10 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 relative">
      <div className="container mx-auto px-6">
        <SectionHeader 
          title="Dúvidas Frequentes"
          subtitle="Tudo o que você precisa saber antes de começarmos sua jornada digital de sucesso."
        />

        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
