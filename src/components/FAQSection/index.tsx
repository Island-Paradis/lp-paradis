import { RichText } from "@payloadcms/richtext-lexical/react";
import { isPopulated } from "@/lib/utils";
import type { Faq, Homepage } from "../../../payload-types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export default function FAQSection(props: Homepage["faqs"]) {
  const items = props?.items?.filter(isPopulated<Faq>) ?? [];

  return (
    <div className="w-full h-full flex flex-col justify-center items-center gap-8">
      <div className="w-full max-w-md h-full flex items-center justify-center gap-4 flex-col text-center">
        <h2 className="text-3xl font-medium">{props?.title}</h2>
        <p className="text-lg text-primary">{props?.subtitle}</p>
      </div>
      <div className="w-full max-w-5xl h-full flex items-center justify-center">
        <Accordion
          type="single"
          className="w-full flex flex-col gap-5"
          collapsible
        >
          {items.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={`faq-${faq.id}`}
              className="w-full border-x-2 border-y-2 rounded-2xl py-5 px-7 last:border-b-2"
            >
              <AccordionTrigger className="text-lg font-medium w-full">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-primary/80 text-base w-full">
                <RichText data={faq.answer} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
