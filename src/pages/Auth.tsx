import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional(),
});

interface AuthProps {
  isModal?: boolean;
  onClose?: () => void;
}

const Auth = ({ isModal = false, onClose }: AuthProps) => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initialMode = searchParams.get('mode');
    if (initialMode === 'login') {
      setMode('login');
    } else if (initialMode === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      if (isModal && onClose) {
        onClose();
      } else {
        navigate('/');
      }
    }
  }, [user, navigate, isModal, onClose]);

  const validateForm = () => {
    try {
      const data: Record<string, string> = { email, password };
      if (mode === 'signup') {
        data.fullName = fullName;
      }
      authSchema.parse(data);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Login Failed',
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password. Please try again.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          if (isModal && onClose) {
            onClose();
          } else {
            navigate('/');
          }
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: 'Sign Up Failed',
            description: error.message.includes('already registered') 
              ? 'This email is already registered. Please log in instead.'
              : error.message,
            variant: 'destructive',
          });
        } else {
          if (phone) {
            const { data: { user: newUser } } = await supabase.auth.getUser();
            if (newUser) {
              await supabase
                .from('profiles')
                .update({ phone })
                .eq('user_id', newUser.id);
            }
          }
          toast({
            title: 'Account Created!',
            description: 'Welcome to Chopa Cosmetics!',
          });
          if (isModal && onClose) {
            onClose();
          } else {
            navigate('/');
          }
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <Card className={`w-full max-w-md glass-card border-border/50 ${isModal ? 'shadow-none border-0' : ''}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display gradient-text">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {mode === 'login' 
            ? 'Sign in to access your account' 
            : 'Join Chopa Cosmetics today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Please wait...
              </>
            ) : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="ml-2 text-primary hover:underline font-medium"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (isModal) {
    return content;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      {content}
    </div>
  );
};

export default Auth;
