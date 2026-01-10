"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, Input, Textarea, Button } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";
import {
  ContactFormSchema,
  type ContactFormInput,
} from "@/schemas/FormSchemas";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { graphqlClient } from "@/lib/graphql";
import { SEND_CONTACT } from "@/graphql/mutations";

interface SendContactResponse {
  data?: {
    sendContact?: boolean;
  };
  errors?: Array<{ message: string }>;
}

export default function ContactPage() {
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { executeRecaptcha, isConfigured } = useRecaptcha();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormInput) => {
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha("contact_form");
      if (!recaptchaToken) {
        setSubmitStatus("error");
        setErrorMessage(
          "reCAPTCHA verification failed. Please refresh and try again.",
        );
        return;
      }

      // Send contact form via GraphQL
      const result = (await graphqlClient.graphql({
        query: SEND_CONTACT,
        variables: {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          recaptchaToken,
        },
        authMode: "iam",
      })) as SendContactResponse;

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }

      if (result.data?.sendContact) {
        setSubmitStatus("success");
        reset();
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again later.",
      );
    }
  };

  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Lobby
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
          <p className="text-gray-400 mb-8">
            Have a question, feedback, or just want to say hello? We&apos;d love
            to hear from you!
          </p>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  label="Name"
                  placeholder="Your name"
                  {...register("name")}
                  isRequired
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                  classNames={{
                    input: "bg-gray-700/50",
                    inputWrapper: "bg-gray-700/50",
                  }}
                />
                <Input
                  type="email"
                  label="Email"
                  placeholder="your@email.com"
                  {...register("email")}
                  isRequired
                  isInvalid={!!errors.email}
                  errorMessage={errors.email?.message}
                  classNames={{
                    input: "bg-gray-700/50",
                    inputWrapper: "bg-gray-700/50",
                  }}
                />
                <Input
                  label="Subject"
                  placeholder="What's this about?"
                  {...register("subject")}
                  isRequired
                  isInvalid={!!errors.subject}
                  errorMessage={errors.subject?.message}
                  classNames={{
                    input: "bg-gray-700/50",
                    inputWrapper: "bg-gray-700/50",
                  }}
                />
                <Textarea
                  label="Message"
                  placeholder="Tell us more..."
                  {...register("message")}
                  isRequired
                  minRows={4}
                  isInvalid={!!errors.message}
                  errorMessage={errors.message?.message}
                  classNames={{
                    input: "bg-gray-700/50",
                    inputWrapper: "bg-gray-700/50",
                  }}
                />

                {submitStatus === "success" && (
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
                    Thank you for your message! We&apos;ll get back to you soon.
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                    {errorMessage ||
                      "Something went wrong. Please try again later."}
                  </div>
                )}

                {!isConfigured && (
                  <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
                    Contact form is temporarily unavailable. Please email us
                    directly at support@quiznight.live
                  </div>
                )}

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isSubmitting}
                  isDisabled={!isConfigured}
                >
                  Send Message
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  This site is protected by reCAPTCHA and the Google{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  apply.
                </p>
              </form>
            </CardBody>
          </Card>
        </div>
      </main>
      <AppFooter hideConnectionStatus />
    </>
  );
}
