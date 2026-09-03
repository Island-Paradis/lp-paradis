import type {
  Contact,
  Faq,
  Footer,
  GetQuotePage,
  Hero,
  Homepage,
  Media,
  Menu,
  Project,
  Service,
  Testimonial,
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

// `form.interests` é gerado como `(number | Service)[]` porque um relationship
// pode vir por id. A `depth: 2` do `getGlobal` popula-o, então o override é só
// o relationship de dentro do grupo `form` — o resto do grupo passa intacto.
type PopulatedGetQuotePage = Omit<GetQuotePage, "form"> & {
  form?:
    | (Omit<NonNullable<GetQuotePage["form"]>, "interests"> & {
        interests?: Service[] | null;
      })
    | null;
};

// A prop da faixa de contacto direto do footer: a junção das suas duas fontes.
// Os títulos vêm do grupo `directContact` do global `footer`, que é cópia
// traduzível; o e-mail vem da coleção `contact`, que é um facto da empresa com
// dono próprio e não é traduzível.
//
// O nome difere do grupo do CMS de propósito — `contactBand` aqui,
// `directContact` lá. São formas diferentes com o mesmo conteúdo nominal, e com
// o mesmo nome a interseção `PopulatedFooter & { ... }` no componente exigiria
// as duas ao mesmo tempo, o que nenhum valor satisfaz. Renomear o campo do CMS
// em vez desta prop custaria uma migração de schema no Postgres partilhado.
//
// Não há `PopulatedContact` a acompanhar isto porque não faz falta: os tipos
// `Populated*` acima existem para trocar relacionamentos `id | objeto` pela
// forma povoada, e `Contact` não tem um único campo de relação. Um alias vazio
// só daria a impressão de que tem.
// Os títulos entram crus, tal como todos os outros textos do footer: o piso é
// aplicado dentro do componente, que já é onde vivem os pisos da tagline, do
// heading do CTA e dos rótulos dos botões. Resolvê-los aqui poria metade dos
// fallbacks do footer num sítio e metade noutro.
type FooterContactBand = {
  reachHeading?: string | null;
  socialHeading?: string | null;
  /** Ausente quando a coleção `contact` está vazia ou sem e-mail. */
  email?: string | null;
};

export type {
  PopulatedHomepage,
  PopulatedNavBar,
  PopulatedFooter,
  PopulatedGetQuotePage,
  FooterContactBand,
};
