"use client";

import { createContext, useContext } from "react";

interface NavMobileMenuContextValue {
  close: () => void;
}

const NavMobileMenuContext = createContext<NavMobileMenuContextValue>({
  close: () => {},
});

export function useNavMobileMenu() {
  return useContext(NavMobileMenuContext);
}

export { NavMobileMenuContext };
