import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Split Background */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-gradient-to-br from-blue-600 to-blue-800"></div>
        <div className="flex-1 bg-slate-950"></div>
      </div>
      
      {/* Atmospheric Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/30 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      
      {/* Glass Overlay for the whole page to tie it together */}
      <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]"></div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
      
      <div className="fixed bottom-6 z-10 text-white/40 text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Marmonil Factory Operations</div>
    </div>
  );
};

export default PublicLayout;