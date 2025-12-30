'use client';

import { useState, useEffect } from 'react';
import { Input, Button } from '@nextui-org/react';
import { LoadingDots } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { EyeFilledIcon, EyeSlashFilledIcon } from './EyeIcons';
import { PasswordStrengthIndicator, usePasswordValidation } from './PasswordStrengthIndicator';
import { GoogleSignInButton } from './GoogleSignInButton';
import { useScreenNameCheck } from '@/hooks/useScreenNameCheck';

interface RegistrationFormProps {
  onSuccess: () => void;
  onConfirmRequired: (email: string, password: string) => void;
}

const MIN_SCREEN_NAME_LENGTH = 3;

export function RegistrationForm({ onSuccess, onConfirmRequired }: RegistrationFormProps) {
  const { signUp, signIn } = useAuth();
  const { status: screenNameStatus, checkName, reset: resetScreenNameCheck } = useScreenNameCheck();

  const [email, setEmail] = useState('');
  const [screenName, setScreenName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  const { isValid: isPasswordValid } = usePasswordValidation(password);

  // Check screen name availability when it changes
  useEffect(() => {
    checkName(screenName);
  }, [screenName, checkName]);

  const handleRegister = async () => {
    if (!email || !screenName || !password || !confirmPassword) return;

    if (screenName.length < MIN_SCREEN_NAME_LENGTH) {
      setError('Screen name must be at least 3 characters');
      return;
    }
    if (screenNameStatus !== 'available') {
      setError(screenNameStatus === 'taken' ? 'Screen name is already taken' : 'Please wait for screen name check');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const result = await signUp(email, password, screenName);
      if (!result.isSignUpComplete) {
        onConfirmRequired(email, password);
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRegister();
    }
  };

  const getScreenNameEndContent = () => {
    if (screenNameStatus === 'checking') {
      return <LoadingDots className="scale-75" />;
    }
    if (screenNameStatus === 'available') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (screenNameStatus === 'taken') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return null;
  };

  const isDisabled = !email || !screenName || !password || !confirmPassword ||
    password !== confirmPassword || !isPasswordValid ||
    screenName.length < MIN_SCREEN_NAME_LENGTH || screenNameStatus !== 'available';

  return (
    <div className="space-y-4">
      <GoogleSignInButton
        isDisabled={isLoading}
        onError={setError}
      />

      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        variant="bordered"
        classNames={{
          input: 'text-white',
          label: 'text-gray-400',
        }}
      />

      <Input
        label="Screen Name"
        type="text"
        value={screenName}
        onChange={(e) => setScreenName(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        isRequired
        variant="bordered"
        description="Your public display name (min 3 characters)"
        isInvalid={screenNameStatus === 'taken'}
        errorMessage={screenNameStatus === 'taken' ? 'This screen name is already taken' : undefined}
        classNames={{
          input: 'text-white',
          label: 'text-gray-400',
          description: 'text-gray-500',
        }}
        endContent={getScreenNameEndContent()}
      />

      <Input
        label="Password"
        type={isPasswordVisible ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        variant="bordered"
        classNames={{
          input: 'text-white',
          label: 'text-gray-400',
        }}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
              <EyeFilledIcon className="text-xl text-gray-400" />
            ) : (
              <EyeSlashFilledIcon className="text-xl text-gray-400" />
            )}
          </button>
        }
      />

      <PasswordStrengthIndicator password={password} />

      <Input
        label="Confirm Password"
        type={isConfirmVisible ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        variant="bordered"
        isInvalid={!!confirmPassword && password !== confirmPassword}
        errorMessage={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
        classNames={{
          input: 'text-white',
          label: 'text-gray-400',
        }}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={() => setIsConfirmVisible(!isConfirmVisible)}
          >
            {isConfirmVisible ? (
              <EyeFilledIcon className="text-xl text-gray-400" />
            ) : (
              <EyeSlashFilledIcon className="text-xl text-gray-400" />
            )}
          </button>
        }
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button
        color="primary"
        onPress={handleRegister}
        isDisabled={isDisabled}
        isLoading={isLoading}
        className="w-full"
      >
        Create Account
      </Button>
    </div>
  );
}
