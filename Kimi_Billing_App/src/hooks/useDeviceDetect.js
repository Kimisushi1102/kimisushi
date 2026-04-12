import { useState, useEffect } from 'react';

export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const handleMobileChange = (e) => setIsMobile(e.matches);
    const handleTabletChange = (e) => setIsTablet(e.matches);

    mobileQuery.addEventListener('change', handleMobileChange);
    tabletQuery.addEventListener('change', handleTabletChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      tabletQuery.removeEventListener('change', handleTabletChange);
    };
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}
