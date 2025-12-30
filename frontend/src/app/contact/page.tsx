'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardBody, Input, Textarea, Button } from '@nextui-org/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactFormSchema, type ContactFormInput } from '@/schemas/FormSchemas';

export default function ContactPage() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormInput) => {
    setSubmitStatus('idle');

    try {
      // TODO: Implement actual form submission to backend
      console.log('Form data:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitStatus('success');
      reset();
    } catch {
      setSubmitStatus('error');
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
          <p className="text-gray-400 mb-8">
            Have a question, feedback, or just want to say hello? We&apos;d love to hear from you!
          </p>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  label="Name"
                  placeholder="Your name"
                  {...register('name')}
                  isRequired
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                  classNames={{
                    input: 'bg-gray-700/50',
                    inputWrapper: 'bg-gray-700/50',
                  }}
                />
                <Input
                  type="email"
                  label="Email"
                  placeholder="your@email.com"
                  {...register('email')}
                  isRequired
                  isInvalid={!!errors.email}
                  errorMessage={errors.email?.message}
                  classNames={{
                    input: 'bg-gray-700/50',
                    inputWrapper: 'bg-gray-700/50',
                  }}
                />
                <Input
                  label="Subject"
                  placeholder="What's this about?"
                  {...register('subject')}
                  isRequired
                  isInvalid={!!errors.subject}
                  errorMessage={errors.subject?.message}
                  classNames={{
                    input: 'bg-gray-700/50',
                    inputWrapper: 'bg-gray-700/50',
                  }}
                />
                <Textarea
                  label="Message"
                  placeholder="Tell us more..."
                  {...register('message')}
                  isRequired
                  minRows={4}
                  isInvalid={!!errors.message}
                  errorMessage={errors.message?.message}
                  classNames={{
                    input: 'bg-gray-700/50',
                    inputWrapper: 'bg-gray-700/50',
                  }}
                />

                {submitStatus === 'success' && (
                  <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
                    Thank you for your message! We&apos;ll get back to you soon.
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                    Something went wrong. Please try again later.
                  </div>
                )}

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isSubmitting}
                >
                  Send Message
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
