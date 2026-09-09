import type { Lang, Profile } from "@/lib/types";

/**
 * Optional enhanced mentor, using the visitor's own Anthropic API key.
 *
 * Three rules, and they are not negotiable for a public repository:
 *
 *  1. No key is ever committed, bundled or defaulted. The only key that exists
 *     is one the visitor pasted into their own browser.
 *  2. It is stored in localStorage on their device and sent to exactly one
 *     origin, api.anthropic.com. There is no server here to relay it through
 *     even if we wanted one.
 *  3. The offline mentor remains the default. This path is additive, and every
 *     failure — bad key, rate limit, no network — falls back to it rather than
 *     leaving the student with an error.
 *
 * `anthropic-dangerous-direct-browser-access` is required for browser calls;
 * it is what makes the key the user's own responsibility, which is exactly the
 * arrangement here.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export interface MentorContext {
  profile: Profile | null;
  topCareers: { title: string; match: number }[];
  locale: Lang;
}

function systemPrompt(context: MentorContext): string {
  const { profile, topCareers, locale } = context;
  const lines = [
    "You are Masar, a career-guidance mentor for secondary-school students in the United Arab Emirates.",
    locale === "ar"
      ? "Reply in Modern Standard Arabic (الفصحى). Do not use dialect."
      : "Reply in clear English suitable for a 16-year-old.",
    "Be concrete and brief — a few short paragraphs at most.",
    "You are talking to a teenager about their future: never be discouraging, and never present an admission threshold as a verdict. Thresholds in this app are indicative and their grades are not final.",
    "If you do not know something about the UAE education system, say so rather than inventing an institution, a fee or a requirement.",
  ];

  if (profile) {
    lines.push(
      `The student's name is ${profile.fullName || "not given"}.`,
      profile.emirate ? `They live in ${profile.emirate}.` : "",
      profile.track ? `They are on the ${profile.track} stream.` : "",
    );
    if (topCareers.length > 0) {
      lines.push(
        "Their top career matches from the app's model are: "
        + topCareers.map((c) => `${c.title} (${c.match}%)`).join(", ")
        + ".",
      );
    }
  } else {
    lines.push("The student has not completed the assessment yet.");
  }

  return lines.filter(Boolean).join("\n");
}

export async function askAnthropic(
  question: string,
  apiKey: string,
  context: MentorContext,
): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt(context),
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API returned ${response.status}`);
  }

  const body = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (body.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Anthropic API returned no text");
  return text;
}
