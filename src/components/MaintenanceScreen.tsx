import { AlertTriangle, Construction } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MaintenanceScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-background to-muted" />
      
      <Card className="relative z-10 max-w-md mx-4 border-destructive/30 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <Construction className="w-10 h-10 text-destructive animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-display text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Website Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">
            The website is temporarily unavailable.
          </p>
          <p className="text-muted-foreground">
            Please check back later. We apologize for any inconvenience.
          </p>
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              If you are an administrator, please{' '}
              <a 
                href="/admin/login" 
                className="text-primary hover:underline font-medium"
              >
                log in here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceScreen;
