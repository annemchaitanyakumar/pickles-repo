import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const { login } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailid: '',
    password: '',
    showPassword: false,
  });

  const [forgotPasswordState, setForgotPasswordState] = useState({
    showModal: false,
    step: 'email', // 'email' | 'otp' | 'reset'
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    error: '',
    loading: false,
    showNewPassword: false,
    showConfirmPassword: false,
    resendTimer: 0,
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleForgotPasswordInput = (e) => {
    const { id, value } = e.target;
    setForgotPasswordState((prev) => ({ ...prev, [id]: value, error: '' }));
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { emailid, password } = formData;
      const success = await login({ emailid, password });
      
      if (success) {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('authData'));
        console.log('Login successful, user data:', userData);
        
        // Navigate based on user role
        if (userData?.role && userData.role.toUpperCase() === 'ROLE_ADMIN') {
          console.log('Redirecting to admin dashboard');
          navigate('/admin');
        } else {
          console.log('Redirecting to home page');
          navigate('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An error occurred during login. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordState((prev) => ({ ...prev, error: '', loading: true }));

    try {
      if (forgotPasswordState.step === 'email') {
        await authService.forgotPassword(forgotPasswordState.email);
        setForgotPasswordState((prev) => ({ ...prev, step: 'otp', loading: false }));
        toast({ title: 'OTP Sent', description: 'Please check your email for the OTP.' });
      } else if (forgotPasswordState.step === 'otp') {
        await authService.validateResetOtp(forgotPasswordState.email, forgotPasswordState.otp);
        setForgotPasswordState((prev) => ({ ...prev, step: 'reset', loading: false }));
        toast({ title: 'OTP Verified', description: 'Please set your new password.' });
      } else if (forgotPasswordState.step === 'reset') {
        if (forgotPasswordState.newPassword.length < 6) {
          toast({
            variant: 'destructive',
            title: 'Invalid Password',
            description: 'Password must be at least 6 characters long.',
          });
          setForgotPasswordState((prev) => ({ ...prev, loading: false }));
          return;
        }
        if (forgotPasswordState.newPassword !== forgotPasswordState.confirmPassword) {
          toast({
            variant: 'destructive',
            title: 'Password Mismatch',
            description: 'New password and confirm password do not match.',
          });
          setForgotPasswordState((prev) => ({ ...prev, loading: false }));
          return;
        }

        await authService.resetPassword(forgotPasswordState.email, forgotPasswordState.newPassword);
        setForgotPasswordState((prev) => ({ ...prev, showModal: false, loading: false }));
        toast({
          title: 'Success',
          description: 'Password reset successfully. Please log in with your new password.',
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setForgotPasswordState((prev) => ({ ...prev, loading: false }));
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    }
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordState({
      showModal: true,
      step: 'email',
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
      error: '',
      loading: false,
      showNewPassword: false,
      showConfirmPassword: false,
      resendTimer: 0,
    });
  };

  const handleResendOTP = async () => {
    try {
      setForgotPasswordState((prev) => ({ ...prev, loading: true, error: '' }));
      await authService.forgotPassword(forgotPasswordState.email);
      setForgotPasswordState((prev) => ({
        ...prev,
        loading: false,
        resendTimer: 30,
      }));
      toast({ title: 'OTP Resent', description: 'A new OTP has been sent to your email.' });
    } catch (err) {
      setForgotPasswordState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to resend OTP',
      }));
    }
  };

  useEffect(() => {
    if (forgotPasswordState.resendTimer > 0) {
      const timer = setTimeout(() => {
        setForgotPasswordState((prev) => ({
          ...prev,
          resendTimer: prev.resendTimer - 1,
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [forgotPasswordState.resendTimer]);

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />

      <div className="pt-24 pb-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Login Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md mx-auto w-full"
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl text-center">
                    Welcome back to{' '}
                    <span className="gradient-primary bg-clip-text text-transparent">
                      HT Pickles
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailid">Email</Label>
                      <Input
                        id="emailid"
                        type="email"
                        value={formData.emailid}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={formData.showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter your password"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              showPassword: !prev.showPassword,
                            }))
                          }
                        >
                          {formData.showPassword ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={openForgotPasswordModal}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot your password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sign Up CTA */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center space-y-6 p-8 max-w-md mx-auto w-full"
            >
              <h2 className="text-3xl font-bold">New to HT Pickles?</h2>
              <p className="text-muted-foreground text-lg">
                Join our community and discover the authentic taste of homemade pickles.
              </p>
              <br />
              <Link to="/signup">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                >
                  Create an Account
                </Button>
              </Link>

              <div className="space-y-4 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-left text-sm">Quick and easy sign-up process</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-left text-sm">Track your orders and favorites</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog
        open={forgotPasswordState.showModal}
        onOpenChange={(open) => setForgotPasswordState((prev) => ({ ...prev, showModal: open }))}
      >
        <DialogContent aria-describedby="dialog-description">
          <DialogHeader>
            <DialogTitle>
              {forgotPasswordState.step === 'email' && 'Forgot Password'}
              {forgotPasswordState.step === 'otp' && 'Verify OTP'}
              {forgotPasswordState.step === 'reset' && 'Reset Password'}
            </DialogTitle>
            <DialogDescription id="dialog-description">
              {forgotPasswordState.step === 'email' && 'Enter your email address to reset your password'}
              {forgotPasswordState.step === 'otp' && 'Enter the verification code sent to your email'}
              {forgotPasswordState.step === 'reset' && 'Create a new password for your account'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            {forgotPasswordState.error && (
              <Alert variant="destructive">
                <AlertDescription>{forgotPasswordState.error}</AlertDescription>
              </Alert>
            )}

            {/* Email Step */}
            {forgotPasswordState.step === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={forgotPasswordState.email}
                  onChange={handleForgotPasswordInput}
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}

            {/* OTP Step */}
            {forgotPasswordState.step === 'otp' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter OTP</Label>
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit code to your email
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={forgotPasswordState.otp}
                    onChange={(value) => setForgotPasswordState(prev => ({ ...prev, otp: value }))}
                    render={({ slots }) => (
                      <InputOTPGroup className="gap-2 justify-center">
                        {slots.map((slot, index) => (
                          <InputOTPSlot
                            key={index}
                            {...slot}
                            className={cn(
                              "w-10 h-10 text-center text-xl rounded-md border",
                              "focus:ring-2 focus:ring-primary focus:border-primary",
                              "transition-all duration-200"
                            )}
                          />
                        ))}
                      </InputOTPGroup>
                    )}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm">
                    {forgotPasswordState.resendTimer > 0 ? (
                      <span className="text-muted-foreground">
                        Resend in {forgotPasswordState.resendTimer}s
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={handleResendOTP}
                        disabled={forgotPasswordState.loading}
                      >
                        Resend OTP
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reset Step */}
            {forgotPasswordState.step === 'reset' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={forgotPasswordState.showNewPassword ? 'text' : 'password'}
                      value={forgotPasswordState.newPassword}
                      onChange={handleForgotPasswordInput}
                      placeholder="Enter your new password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() =>
                        setForgotPasswordState((prev) => ({
                          ...prev,
                          showNewPassword: !prev.showNewPassword,
                        }))
                      }
                    >
                      {forgotPasswordState.showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={forgotPasswordState.showConfirmPassword ? 'text' : 'password'}
                      value={forgotPasswordState.confirmPassword}
                      onChange={handleForgotPasswordInput}
                      placeholder="Confirm your new password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() =>
                        setForgotPasswordState((prev) => ({
                          ...prev,
                          showConfirmPassword: !prev.showConfirmPassword,
                        }))
                      }
                    >
                      {forgotPasswordState.showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="flex justify-between sm:justify-between gap-2">
              {forgotPasswordState.step === 'otp' ? (
                <Button
                  type="submit"
                  disabled={forgotPasswordState.loading || forgotPasswordState.otp.length !== 6}
                  className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                >
                  {forgotPasswordState.loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={forgotPasswordState.loading}
                  className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                >
                  {forgotPasswordState.loading
                    ? 'Processing...'
                    : forgotPasswordState.step === 'email'
                    ? 'Send OTP'
                    : 'Reset Password'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
