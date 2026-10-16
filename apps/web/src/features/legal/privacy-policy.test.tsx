import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DATA_CONTROLLER, PRIVACY_CONTACT, PrivacyPolicy } from "./privacy-policy";

describe("PrivacyPolicy", () => {
  it("names the controller, the contact, the providers and the learner's rights", () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(DATA_CONTROLLER))).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: PRIVACY_CONTACT })) {
      expect(link).toHaveAttribute("href", `mailto:${PRIVACY_CONTACT}`);
    }
    for (const heading of ["Responsable del tratamiento", "Quién más interviene", "Tus derechos", "Menores de edad"]) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/Superintendencia de Industria y Comercio/)).toBeInTheDocument();
  });
});
