import { submitQuoteRequest } from "@/app/(app)/[locale]/(pages)/get-quote/actions";
import type { Locale } from "@/i18n/routing";
import { textOr } from "@/lib/cms-text";
import {
  QUOTE_MESSAGE_FALLBACK,
  type QuoteMessages,
} from "@/lib/quote-request";
import type { PopulatedGetQuotePage } from "@/service/types";
import QuoteForm, { type QuoteInterest } from "./QuoteForm";

const FALLBACK = {
  headline: "Let's build something that moves you forward.",
  intro:
    "We're excited to hear what you're building. Drop the details below and we'll reply within one business day.",
  availabilityLabel: "Available for new projects",
  eyebrow: "THE BRIEF",
  nameLabel: "Your name",
  emailLabel: "Your email",
  interestsLabel: "I'm interested in…",
  messageLabel: "Tell us about your project",
  submitLabel: "Send enquiry",
  privacyNote: "Your details are safe — no ads, no spam.",
};

interface GetQuoteProps extends PopulatedGetQuotePage {
  locale: Locale;
}

export default function 



GetQuote({ locale, ...content }: GetQuoteProps) {
  const { availability, form } = content;

  const headline = textOr(content.hero?.headline, FALLBACK.headline);
  const intro = textOr(content.hero?.intro, FALLBACK.intro);
  const showPill = availability?.enabled !== false;
  const availabilityLabel = textOr(
    availability?.label,
    FALLBACK.availabilityLabel,
  );
  const location = availability?.location?.trim() ?? "";
  const interests: QuoteInterest[] = (form?.interests ?? []).flatMap(
    (service) => {
      if (!service || typeof service !== "object") return [];
      const slug = service.slug?.trim();
      const title = service.title?.trim();
      if (!slug || !title) return [];
      return [{ slug, title }];
    },
  );

  const messages: QuoteMessages = {
    success: textOr(form?.messages?.success, QUOTE_MESSAGE_FALLBACK.success),
    error: textOr(form?.messages?.error, QUOTE_MESSAGE_FALLBACK.error),
    nameRequired: textOr(
      form?.messages?.nameRequired,
      QUOTE_MESSAGE_FALLBACK.nameRequired,
    ),
    emailRequired: textOr(
      form?.messages?.emailRequired,
      QUOTE_MESSAGE_FALLBACK.emailRequired,
    ),
    emailInvalid: textOr(
      form?.messages?.emailInvalid,
      QUOTE_MESSAGE_FALLBACK.emailInvalid,
    ),
    messageRequired: textOr(
      form?.messages?.messageRequired,
      QUOTE_MESSAGE_FALLBACK.messageRequired,
    ),
    tooLong: textOr(form?.messages?.tooLong, QUOTE_MESSAGE_FALLBACK.tooLong),
  };

  const action = submitQuoteRequest.bind(null, locale);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-20 sm:px-10 lg:px-20 lg:py-28">
      <h1 className="max-w-3xl font-gilroy text-4xl font-bold gradient-text leading-[1.08] tracking-tight text-primary whitespace-pre-line sm:text-5xl lg:text-6xl xl:text-7xl">
        {headline}
      </h1>

      <div className="mt-14 flex flex-col gap-10 lg:mt-24 lg:flex-row lg:items-end lg:justify-between">
        {showPill ? (
          <p className="inline-flex w-fit items-center gap-2.5 rounded-full border border-secondary px-5 py-2.5 text-sm text-primary">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-green-500"
            />
            {availabilityLabel}
            {location ? (
              <span className="text-neutral-400">
                {"·"} {location}
              </span>
            ) : null}
          </p>
        ) : null}

        <p className="max-w-sm text-lg leading-8 text-primary lg:text-right">
          {intro}
        </p>
      </div>

      {form?.enabled === false ? null : (
        <section className="mt-20 lg:mt-28">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
            {textOr(form?.eyebrow, FALLBACK.eyebrow)}
          </h2>

          <QuoteForm
            action={action}
            interests={interests}
            labels={{
              name: textOr(form?.nameLabel, FALLBACK.nameLabel),
              email: textOr(form?.emailLabel, FALLBACK.emailLabel),
              interests: textOr(form?.interestsLabel, FALLBACK.interestsLabel),
              message: textOr(form?.messageLabel, FALLBACK.messageLabel),
              submit: textOr(form?.submitLabel, FALLBACK.submitLabel),
              privacyNote: textOr(form?.privacyNote, FALLBACK.privacyNote),
            }}
            messages={messages}
          />
        </section>
      )}
    </main>
  );
}
