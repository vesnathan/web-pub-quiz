import { describe, it, expect } from "vitest";
import {
  ContactFormSchema,
  RegistrationFormSchema,
  InviteEmailSchema,
} from "./FormSchemas";

describe("ContactFormSchema", () => {
  it("validates a correct contact form submission", () => {
    const validData = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Test Subject",
      message: "This is a valid test message with enough characters.",
    };
    const result = ContactFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const data = {
      name: "",
      email: "john@example.com",
      subject: "Test",
      message: "Valid message here.",
    };
    const result = ContactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("rejects invalid email format", () => {
    const data = {
      name: "John",
      email: "not-an-email",
      subject: "Test",
      message: "Valid message here.",
    };
    const result = ContactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("rejects message that is too short", () => {
    const data = {
      name: "John",
      email: "john@example.com",
      subject: "Test",
      message: "Short",
    };
    const result = ContactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("message");
    }
  });

  it("rejects name that is too long", () => {
    const data = {
      name: "A".repeat(101),
      email: "john@example.com",
      subject: "Test",
      message: "Valid message here.",
    };
    const result = ContactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects subject that is too long", () => {
    const data = {
      name: "John",
      email: "john@example.com",
      subject: "A".repeat(201),
      message: "Valid message here.",
    };
    const result = ContactFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("RegistrationFormSchema", () => {
  const validRegistration = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    screenName: "JohnDoe123",
    password: "Password1!",
    confirmPassword: "Password1!",
  };

  it("validates a correct registration", () => {
    const result = RegistrationFormSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it("rejects empty first name", () => {
    const data = { ...validRegistration, firstName: "" };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const data = { ...validRegistration, email: "invalid" };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects screen name that is too short", () => {
    const data = { ...validRegistration, screenName: "AB" };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects screen name that is too long", () => {
    const data = { ...validRegistration, screenName: "A".repeat(21) };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects screen name with invalid characters", () => {
    const data = { ...validRegistration, screenName: "John Doe!" };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts screen name with underscores", () => {
    const data = { ...validRegistration, screenName: "John_Doe_123" };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects password without uppercase", () => {
    const data = {
      ...validRegistration,
      password: "password1!",
      confirmPassword: "password1!",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects password without lowercase", () => {
    const data = {
      ...validRegistration,
      password: "PASSWORD1!",
      confirmPassword: "PASSWORD1!",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const data = {
      ...validRegistration,
      password: "Password!",
      confirmPassword: "Password!",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects password without special character", () => {
    const data = {
      ...validRegistration,
      password: "Password1",
      confirmPassword: "Password1",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects password that is too short", () => {
    const data = {
      ...validRegistration,
      password: "Pass1!",
      confirmPassword: "Pass1!",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const data = {
      ...validRegistration,
      confirmPassword: "DifferentPassword1!",
    };
    const result = RegistrationFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });
});

describe("InviteEmailSchema", () => {
  it("validates a correct invite", () => {
    const data = {
      friendName: "Jane",
      email: "jane@example.com",
    };
    const result = InviteEmailSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty friend name", () => {
    const data = {
      friendName: "",
      email: "jane@example.com",
    };
    const result = InviteEmailSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const data = {
      friendName: "Jane",
      email: "not-valid",
    };
    const result = InviteEmailSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects friend name that is too long", () => {
    const data = {
      friendName: "A".repeat(51),
      email: "jane@example.com",
    };
    const result = InviteEmailSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
