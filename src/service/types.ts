import type {
  Homepage,
  Hero,
  Project,
  Service,
  Testimonial,
  Faq,
  Contact,
  Menu,
  Media,
  Footer,
} from "../../payload-types";


type PopulatedHomepage = Omit<
  Homepage,
  "hero" | "projects" | "services" | "testimonials" | "faqs" | "contact"
> & {
  hero?: { enabled?: boolean | null; item?: Hero | null };
  projects?: Omit<NonNullable<Homepage["projects"]>, "items"> & {
    items?: Project[] | null;
  };
  services?: Omit<NonNullable<Homepage["services"]>, "items"> & {
    items?: Service[] | null;
  };
  testimonials?: Omit<NonNullable<Homepage["testimonials"]>, "items"> & {
    items?: Testimonial[] | null;
  };
  faqs?: Omit<NonNullable<Homepage["faqs"]>, "items"> & {
    items?: Faq[] | null;
  };
  contact?: { enabled?: boolean | null; item?: Contact | null };
};



type PopulatedNavBar = Omit<Menu, "logo"> & {
  logo?: {
    image?: Media | null;
    imageLight?: Media | null;
    url?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
};


type PopulatedFooter = Omit<Footer, "logo"> & {
  logo?: {
    image?: Media | null;
    url?: string | null;
    width?: number | null;
    height?: number | null;
    alt?: string | null;
  } | null;
};

export type { PopulatedHomepage, PopulatedNavBar, PopulatedFooter };