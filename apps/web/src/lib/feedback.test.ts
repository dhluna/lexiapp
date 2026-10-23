import { describe, expect, it } from "vitest";
import { suggestionMailto, wordReportMailto } from "./feedback";

const decode = (url: string) => {
  const [address, query] = url.split("?");
  const params = new URLSearchParams(query.replace(/\+/g, "%2B"));
  return { address, subject: params.get("subject"), body: params.get("body") };
};

describe("feedback links", () => {
  it("prefills the word, its id and its link", () => {
    const { address, subject, body } = decode(wordReportMailto({ id: "travel-luggage", term: "luggage" }));
    expect(address).toBe("mailto:hola@lexiapp.app");
    expect(subject).toBe("Error en la palabra «luggage»");
    expect(body).toContain("Palabra: luggage (travel-luggage)");
    expect(body).toContain("https://lexiapp.app/vocabulario/travel-luggage");
  });

  it("encodes characters that would break the link", () => {
    const url = wordReportMailto({ id: "phrasal-look-up", term: "look up & down?" });
    expect(url).not.toMatch(/[ &?]down/);
    expect(decode(url).subject).toBe("Error en la palabra «look up & down?»");
  });

  it("has a subject for general suggestions", () => {
    expect(decode(suggestionMailto()).subject).toBe("Sugerencia para Lexi");
  });
});
