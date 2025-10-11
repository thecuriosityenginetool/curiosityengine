'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface GSAPRevealProps {
  children: React.ReactNode;
  className?: string;
}

export default function GSAPReveal({ children, className = '' }: GSAPRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const text = element.querySelector('.headline');

    if (!text) {
      console.warn('GSAPReveal: No .headline element found');
      return;
    }

    try {
      // Set initial state
      gsap.set(text, { opacity: 1 });

      // Split text into characters
      const chars = text.textContent?.split('') || [];
      
      if (chars.length === 0) {
        console.warn('GSAPReveal: No text content found');
        return;
      }
      
      // Clear the text content
      text.textContent = '';
      
      // Create character spans
      chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'scale(0) translateY(80px) rotateX(180deg)';
        span.style.transformOrigin = '0% 50% -50px';
        text.appendChild(span);
      });

      const charElements = text.querySelectorAll('span');

      // Create scroll trigger animation
      ScrollTrigger.create({
        trigger: element,
        start: 'top 80%',
        onEnter: () => {
          gsap.to(charElements, {
            duration: 0.8,
            opacity: 1,
            scale: 1,
            y: 0,
            rotationX: 0,
            ease: 'back.out(1.7)',
            stagger: 0.03,
          });
        }
      });
    } catch (error) {
      console.error('GSAPReveal error:', error);
    }

    // Cleanup
    return () => {
      try {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      } catch (error) {
        console.error('GSAPReveal cleanup error:', error);
      }
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
