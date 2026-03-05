
import React, { useState, useEffect } from 'react';
import { TourStep } from '../types';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface WalkthroughTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const WalkthroughTour: React.FC<WalkthroughTourProps> = ({ steps, isActive, onComplete, onSkip }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = steps[currentStepIndex];
      const element = document.getElementById(step.targetId);

      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Set Highlight Box
        setHighlightStyle({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        });

        // Set Tooltip Position
        let top = 0;
        let left = 0;
        const tooltipWidth = 320; // Approx width
        
        if (step.position === 'bottom') {
           top = rect.bottom + 16;
           left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        } else if (step.position === 'top') {
           top = rect.top - 180; // approximate height of tooltip
           left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        } else if (step.position === 'right') {
           top = rect.top;
           left = rect.right + 16;
        } else if (step.position === 'left') {
           top = rect.top;
           left = rect.left - tooltipWidth - 16;
        }

        // Boundary checks
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 10;

        setTooltipStyle({ top, left });
        
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Small delay to allow DOM to render
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStepIndex, isActive, steps]);

  if (!isActive) return null;

  const step = steps[currentStepIndex];
  const isLast = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) onComplete();
    else setCurrentStepIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  };

  return (
    <>
      <div className="tour-overlay"></div>
      <div className="tour-highlight" style={highlightStyle}></div>
      <div className="tour-tooltip" style={tooltipStyle}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{step.title}</h3>
          <button onClick={onSkip} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
          {step.content}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Step {currentStepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={handleBack} 
              disabled={currentStepIndex === 0}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNext} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              {isLast ? 'Finish' : 'Next'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WalkthroughTour;
