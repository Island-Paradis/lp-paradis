"use client";

import { useActionState, useState } from "react";
import {
  type QuoteErrorCode,
  type QuoteFormState,
  type QuoteMessages,
  type QuoteSubmission,
  quoteSubmissionSchema,
  toFieldErrors,
} from "@/lib/quote-request";
import { cn } from "@/lib/utils";
import Button from "../Button";

// Restrições de bundle que este módulo cumpre, cada uma por um erro já pago
// neste repo (ver a capability `get-quote-page`):
//
//   • NENHUM import de `@/i18n/navigation`. Tanto o `Link` quanto o
//     `getPathname` de lá arrastam o parser ICU do `@formatjs`: +33,6 KB num
//     único chunk, medido no footer. Este formulário não navega, então não
//     precisa de nenhum dos dois — e o texto já chega traduzido do servidor.
//   • NENHUM ícone de biblioteca. O `+` dos chips é um caractere. O erro que o
//     `Button/index.tsx` documenta (12,7 MB retidos por `Icons[nome]` sobre um
//     `import * as`) começou por precisar de dois ícones.

export interface QuoteInterest {
  slug: string;
  title: string;
}

interface QuoteFormProps {
  action: (
    previous: QuoteFormState,
    formData: FormData,
  ) => Promise<QuoteFormState>;
  interests: QuoteInterest[];
  labels: {
    name: string;
    email: string;
    interests: string;
    message: string;
    submit: string;
    privacyNote: string;
  };
  messages: QuoteMessages;
}

type FieldErrors = Partial<Record<keyof QuoteSubmission, QuoteErrorCode>>;

const FIELD_LINE =
  "w-full border-b border-secondary bg-transparent pb-3 text-lg text-primary outline-none transition-colors placeholder:text-neutral-400 focus:border-primary";

export default function QuoteForm({
  action,
  interests,
  labels,
  messages,
}: QuoteFormProps) {
  const [state, formAction, isPending] = useActionState<
    QuoteFormState,
    FormData
  >(action, { status: "idle" });

  const [selected, setSelected] = useState<string[]>([]);


  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const serverErrors: FieldErrors =
    state.status === "invalid" ? state.fieldErrors : {};

  function errorFor(field: keyof QuoteSubmission): string | null {
    const code = clientErrors[field] ?? serverErrors[field];
    return code ? messages[code] : null;
  }

  function toggleInterest(slug: string) {
    setSelected((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const parsed = quoteSubmissionSchema.safeParse({
      name: data.get("name") ?? "",
      email: data.get("email") ?? "",
      message: data.get("message") ?? "",
      interests: data.getAll("interests").map(String),
      honeypot: "",
    });

    if (!parsed.success) {
      event.preventDefault();
      setClientErrors(toFieldErrors(parsed.error.issues));
      return;
    }

    setClientErrors({});
  }


  if (state.status === "success") {
    return (
      <output className="mt-12 block max-w-2xl text-lg leading-8 text-primary">
        {messages.success}
      </output>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] size-0 overflow-hidden"
      >
        <label htmlFor="quote-company">Company</label>
        <input
          id="quote-company"
          name="honeypot"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-12">
        <div>
          <label
            htmlFor="quote-name"
            className="block pb-2 text-lg text-primary"
          >
            {labels.name}
          </label>
          <input
            id="quote-name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errorFor("name"))}
            aria-describedby={errorFor("name") ? "quote-name-error" : undefined}
            className={FIELD_LINE}
          />
          {errorFor("name") ? (
            <p id="quote-name-error" className="pt-2 text-sm text-red-600">
              {errorFor("name")}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="quote-email"
            className="block pb-2 text-lg text-primary"
          >
            {labels.email}
          </label>
          <input
            id="quote-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errorFor("email"))}
            aria-describedby={
              errorFor("email") ? "quote-email-error" : undefined
            }
            className={FIELD_LINE}
          />
          {errorFor("email") ? (
            <p id="quote-email-error" className="pt-2 text-sm text-red-600">
              {errorFor("email")}
            </p>
          ) : null}
        </div>
      </div>
      {interests.length > 0 ? (
        <fieldset className="mt-16 border-0 p-0">
          <legend className="pb-6 text-lg font-medium text-primary">
            {labels.interests}
          </legend>
          <div className="flex flex-wrap gap-4">
            {interests.map((interest) => {
              const isSelected = selected.includes(interest.slug);
              return (
                <button
                  key={interest.slug}
                  type="button"
                  onClick={() => toggleInterest(interest.slug)}
                  aria-pressed={isSelected}
                  data-cursor="hover"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-3 text-base transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-secondary text-primary hover:border-primary",
                  )}
                >
                  <span aria-hidden="true">{isSelected ? "−" : "+"}</span>
                  {interest.title}
                </button>
              );
            })}
          </div>
          {/* A seleção viaja em inputs escondidos e não no estado do React:
              `formData.getAll("interests")` é o que a action lê. */}
          {selected.map((slug) => (
            <input key={slug} type="hidden" name="interests" value={slug} />
          ))}
        </fieldset>
      ) : null}

      <div className="mt-16">
        <label
          htmlFor="quote-message"
          className="block pb-2 text-lg text-primary"
        >
          {labels.message}
        </label>
        <textarea
          id="quote-message"
          name="message"
          rows={3}
          aria-invalid={Boolean(errorFor("message"))}
          aria-describedby={
            errorFor("message") ? "quote-message-error" : undefined
          }
          className={cn(FIELD_LINE, "resize-y")}
        />
        {errorFor("message") ? (
          <p id="quote-message-error" className="pt-2 text-sm text-red-600">
            {errorFor("message")}
          </p>
        ) : null}
      </div>

      <div className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* `disabled` durante a submissão é o que impede o duplo clique de criar
            dois documentos. */}
        <Button type="submit" variant="primary" size="lg" disabled={isPending} shine className="border-2 " >
          {labels.submit}
        </Button>
        <p className="text-sm text-neutral-400">{labels.privacyNote}</p>
      </div>

      {/* Erro de gravação. Os valores escritos permanecem nos campos, porque
          nada os limpa — o visitante volta a submeter sem reescrever tudo. */}
      {state.status === "error" ? (
        <p role="alert" className="mt-8 text-base text-red-600">
          {messages.error}
        </p>
      ) : null}
    </form>
  );
}
