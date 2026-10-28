import { describe, it, expect } from "vitest";
import {
  validateInviteInput,
  validatePasswordPair,
  validateExpertProfile,
  splitList,
  sameOrigin,
  destinationFor,
  applicationNotice,
  type ExpertProfileForm,
} from "@/lib/data/invite";

const goodForm: ExpertProfileForm = {
  title: "Landscape Architect",
  location: "Goa",
  bio: "Fifteen years designing coastal gardens and civic spaces across India.",
  years: "15",
  rate: "3,500",
  firm: "",
  coa: "CA/2010/777",
  credentials: "B.Arch",
  specialties: "Landscape, Coastal , landscape",
  languages: "English, Hindi",
  timezone: "Asia/Kolkata",
  upi: "",
};

describe("validateInviteInput", () => {
  it("lowercases and trims the email and tidies the name", () => {
    expect(validateInviteInput({ email: "  Ravi.Menon@Example.COM ", fullName: "  Ravi   Menon " })).toEqual({
      ok: true,
      email: "ravi.menon@example.com",
      fullName: "Ravi Menon",
    });
  });

  it("rejects missing and malformed emails with a message each", () => {
    for (const email of ["", "   ", "nope", "a@b", "a b@c.com", "a@@c.com", "a@c..com", `${"x".repeat(250)}@c.com`]) {
      const r = validateInviteInput({ email, fullName: "Ravi Menon" });
      expect(r.ok, JSON.stringify(email)).toBe(false);
      if (!r.ok) expect(r.errors.email).toBeTruthy();
    }
  });

  it("rejects a missing or silly name and reports both problems at once", () => {
    const r = validateInviteInput({ email: "bad", fullName: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "fullName"]);
  });
});

describe("validatePasswordPair", () => {
  it("accepts a reasonable matching password", () => {
    expect(validatePasswordPair("correct horse battery", "correct horse battery", "a@b.com")).toBeNull();
  });

  it("rejects short, repetitive, email-like, over-long and mismatched passwords", () => {
    expect(validatePasswordPair("short", "short")).toMatch(/at least 10/);
    expect(validatePasswordPair("aaaaaaaaaaaa", "aaaaaaaaaaaa")).toMatch(/repetitive/);
    expect(validatePasswordPair("Ravi@Example.com", "Ravi@Example.com", "ravi@example.com")).toMatch(/email/);
    expect(validatePasswordPair("x".repeat(73), "x".repeat(73))).toMatch(/72/);
    expect(validatePasswordPair("correct horse battery", "correct horse batterX")).toMatch(/don't match/);
  });
});

describe("sameOrigin", () => {
  const url = "https://sos.example/api/admin/experts/invite";
  it("accepts the site's own origin and requests that carry no Origin", () => {
    expect(sameOrigin("https://sos.example", url)).toBe(true);
    expect(sameOrigin(null, url)).toBe(true);
  });
  it("rejects another site and anything unparseable", () => {
    expect(sameOrigin("https://evil.example", url)).toBe(false);
    expect(sameOrigin("https://sos.example.evil.com", url)).toBe(false);
    expect(sameOrigin("not a url", url)).toBe(false);
    expect(sameOrigin("null", url)).toBe(false);
  });
});

describe("splitList", () => {
  it("trims, de-duplicates ignoring case, and accepts commas, semicolons and new lines", () => {
    expect(splitList(" Residential ,interiors;Residential\nCivic ", 10, 40).items).toEqual(["Residential", "interiors", "Civic"]);
  });
  it("caps the count and the length of each entry", () => {
    expect(splitList("a,b,c", 2, 10).error).toMatch(/at most 2/);
    expect(splitList("x".repeat(11), 5, 10).error).toMatch(/under 10/);
  });
  it("returns an empty list for blank input", () => {
    expect(splitList("  , ,\n", 5, 10)).toEqual({ items: [] });
  });
});

describe("validateExpertProfile", () => {
  it("turns a good form into typed values", () => {
    const r = validateExpertProfile(goodForm);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({
        professionalTitle: "Landscape Architect",
        yearsExperience: 15,
        sessionRateInr: 3500,
        firm: null,
        coaRegistration: "CA/2010/777",
        specialties: ["Landscape", "Coastal"],
        languages: ["English", "Hindi"],
        timezone: "Asia/Kolkata",
        upiId: null,
      });
    }
  });

  it("reports every problem at once, field by field", () => {
    const r = validateExpertProfile({ ...goodForm, title: "", location: "", bio: "too short", years: "-1", rate: "5", timezone: "IST", upi: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["bio", "location", "rate", "timezone", "title", "upi", "years"]);
  });

  it("holds the rate to whole rupees inside sensible bounds, and accepts thousands separators", () => {
    for (const rate of ["", "abc", "99", "3500.5", "200001", "1e3", "-500"]) {
      expect(validateExpertProfile({ ...goodForm, rate }).ok, rate).toBe(false);
    }
    expect(validateExpertProfile({ ...goodForm, rate: "100" }).ok).toBe(true);
    expect(validateExpertProfile({ ...goodForm, rate: "200,000" }).ok).toBe(true);
  });

  it("requires whole years between 0 and 60", () => {
    for (const years of ["", "x", "1.5", "61", "-3", "1e1", "0x10", "٣"]) expect(validateExpertProfile({ ...goodForm, years }).ok, years).toBe(false);
    expect(validateExpertProfile({ ...goodForm, years: "0" }).ok).toBe(true);
  });

  it("checks the bio length at both ends", () => {
    expect(validateExpertProfile({ ...goodForm, bio: "x".repeat(39) }).ok).toBe(false);
    expect(validateExpertProfile({ ...goodForm, bio: "x".repeat(40) }).ok).toBe(true);
    expect(validateExpertProfile({ ...goodForm, bio: "x".repeat(2001) }).ok).toBe(false);
  });

  it("accepts a UPI ID when it looks like one and treats blank as none", () => {
    const ok = validateExpertProfile({ ...goodForm, upi: " ravi.menon@okhdfcbank " });
    expect(ok.ok && ok.value.upiId).toBe("ravi.menon@okhdfcbank");
    for (const upi of ["ravi", "@bank", "ravi@", "ravi menon@bank", "ravi@1bank"]) expect(validateExpertProfile({ ...goodForm, upi }).ok, upi).toBe(false);
  });

  it("rejects timezone abbreviations and offsets, and tidies the spelling of a real zone", () => {
    for (const timezone of ["EST", "IST", "+05:30", "", "Not/AZone"]) expect(validateExpertProfile({ ...goodForm, timezone }).ok, timezone).toBe(false);
    const r = validateExpertProfile({ ...goodForm, timezone: "europe/london" });
    expect(r.ok && r.value.timezone).toBe("Europe/London");
  });
});

describe("destinationFor", () => {
  it("sends each person to the page that fits them", () => {
    expect(destinationFor("admin")).toBe("/dashboard/admin");
    expect(destinationFor("client")).toBe("/dashboard/client");
    expect(destinationFor("expert", "invited")).toBe("/dashboard/expert/onboarding");
    expect(destinationFor("expert", "approved")).toBe("/dashboard/expert");
    expect(destinationFor("expert", "profile_submitted")).toBe("/dashboard/expert");
  });
  it("treats an expert with no profile row as needing to onboard, and an unknown role as a client", () => {
    expect(destinationFor("expert", null)).toBe("/dashboard/expert/onboarding");
    expect(destinationFor(null)).toBe("/dashboard/client");
    expect(destinationFor("mystery")).toBe("/dashboard/client");
  });
});

describe("applicationNotice", () => {
  it("guides an invited expert to complete their profile", () => {
    const n = applicationNotice("invited");
    expect(n?.tone).toBe("action");
    expect(n?.cta?.href).toBe("/dashboard/expert/onboarding");
  });
  it("is quiet for an approved expert and for no status", () => {
    expect(applicationNotice("approved")).toBeNull();
    expect(applicationNotice(null)).toBeNull();
    expect(applicationNotice(undefined)).toBeNull();
  });
  it("tells rejected and suspended experts where they stand, without a dead-end button", () => {
    expect(applicationNotice("rejected")?.tone).toBe("warn");
    expect(applicationNotice("suspended")?.cta).toBeUndefined();
    expect(applicationNotice("profile_submitted")?.tone).toBe("info");
  });
});
