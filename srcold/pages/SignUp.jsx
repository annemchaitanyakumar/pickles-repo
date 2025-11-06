import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/Navbar';
import { authService } from '@/services/authService';

export default function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    emailid: '',
    password: '',
    confirmPassword: '',
    mobilenum: '',
    otp: '',
    role: 'CUSTOMER'
  });
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (showOtpForm && resendTimer === 0) {
      setCanResend(true);
    }
    
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer, showOtpForm]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    console.log(`[SignUp] Input changed: ${id} = ${value}`);

    if (id === 'mobilenum') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [id]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    console.log('[SignUp] Form submitted:', { showOtpForm, formData });

    try {
      // Validate form data
      if (!formData.firstname || !formData.lastname) {
        throw new Error('Please enter your full name');
      }

      if (!formData.emailid || !/\S+@\S+\.\S+/.test(formData.emailid)) {
        throw new Error('Please enter a valid email address');
      }

      if (!formData.mobilenum || String(formData.mobilenum).length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (!showOtpForm) {
        try {
          const registrationData = {
            firstname: formData.firstname,
            lastname: formData.lastname,
            emailid: formData.emailid,
            password: formData.password,
            mobilenum: parseInt(formData.mobilenum, 10),
            role: formData.role
          };
          console.log('[SignUp] Sending registration request:', registrationData);
          
          const response = await authService.register(registrationData);
          console.log('[SignUp] Registration response:', response);
          
          setSuccess(response.message);
          setShowOtpForm(true);
        } catch (err) {
          console.error('[SignUp] Registration error:', err);
          let errorMessage = err.message;
          
          if (err.message.includes('Database connection')) {
            errorMessage = 'Our servers are busy. Please try again in a few minutes.';
          } else if (err.message.includes('already exists')) {
            errorMessage = 'An account with this email already exists.';
          }
          
          setError(errorMessage);
          setLoading(false);
        }
      } else {
        if (!formData.otp) {
          throw new Error('Please enter the OTP sent to your email');
        }
        try {
          console.log('[SignUp] Sending OTP verification request:', { ...formData });
          
          // Send all user data with OTP for verification
          const verificationData = {
            firstname: formData.firstname,
            lastname: formData.lastname,
            emailid: formData.emailid,
            password: formData.password,
            mobilenum: parseInt(formData.mobilenum, 10),
            role: formData.role,
            otp: formData.otp
          };
          
          console.log('[SignUp] Verification data:', verificationData);
          const response = await authService.verifyOtp(verificationData);
          
          console.log('[SignUp] OTP verification response:', response);
          
          const message = typeof response === 'string' ? response :
            response?.message || 'Registration completed successfully!';
            
          setSuccess(message);
          setTimeout(() => navigate('/login'), 2000); // Give user time to see success message
          
        } catch (err) {
          console.error('[SignUp] OTP verification error:', err);
          let errorMessage = err.message;
          
          // Map specific error messages to user-friendly ones
          if (err.message.includes('Database connection')) {
            errorMessage = 'Our servers are busy. Please try again in a few minutes.';
          } else if (err.message.includes('Invalid OTP')) {
            errorMessage = 'Invalid OTP. Please try again.';
          } else if (err.message.includes('expired')) {
            errorMessage = 'OTP has expired. Please request a new one.';
          }
          
          setError(errorMessage);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('[SignUp] General error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    }

    setLoading(false);
    console.log('[SignUp] Form submission complete, state:', { showOtpForm, error, success });
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError('');
      
      const registrationData = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        emailid: formData.emailid,
        password: formData.password,
        mobilenum: parseInt(formData.mobilenum, 10),
        role: formData.role
      };
      
      const response = await authService.register(registrationData);
      setSuccess('OTP resent successfully!');
      setResendTimer(30); // Start 30 second timer
      setCanResend(false);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  console.log('[SignUp] Rendering component, state:', { showOtpForm, error, success, formData });

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Join <span className="gradient-primary bg-clip-text text-transparent">Homely Taste</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  {success && (
                    <Alert variant="success">
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}
                  {!showOtpForm ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstname">First Name</Label>
                          <Input
                            id="firstname"
                            type="text"
                            value={formData.firstname}
                            onChange={handleInputChange}
                            placeholder="First name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastname">Last Name</Label>
                          <Input
                            id="lastname"
                            type="text"
                            value={formData.lastname}
                            onChange={handleInputChange}
                            placeholder="Last name"
                            required
                          />
                        </div>
                      </div>

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
                        <Label htmlFor="mobilenum">Mobile Number</Label>
                        <Input
                          id="mobilenum"
                          type="tel"
                          value={formData.mobilenum}
                          onChange={handleInputChange}
                          placeholder="Enter your mobile number"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Choose a password"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        value={formData.otp}
                        onChange={handleInputChange}
                        placeholder="Enter the 6-digit OTP"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                      />
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">
                          Please check your email for the OTP.
                        </p>
                        {resendTimer > 0 ? (
                          <p className="text-muted-foreground">
                            Resend in {resendTimer}s
                          </p>
                        ) : (
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={handleResendOTP}
                            disabled={!canResend || loading}
                          >
                            Resend OTP
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={loading}
                  >
                    {loading
                      ? showOtpForm
                        ? 'Verifying OTP...'
                        : 'Creating Account...'
                      : showOtpForm
                        ? 'Verify OTP'
                        : 'Create Account'}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}