import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Sfx } from "@/lib/sounds";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const firstRef = useRef(true);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    if (firstRef.current) { firstRef.current = false; return; }
    Sfx.page();
  }, [pathname]);
  return null;
};

export default ScrollToTop;
