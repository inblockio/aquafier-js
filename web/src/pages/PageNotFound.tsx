
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/shadcn/ui/button";

const PageNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-orange-50/20 dark:to-orange-950/10 px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-orange-500/10 rounded-full filter blur-xl"></div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-orange-400/10 rounded-full filter blur-xl"></div>
          
          <div className="relative bg-white/80 dark:bg-black/50 backdrop-blur-sm border border-orange-200/50 dark:border-orange-800/30 rounded-xl shadow-xl p-8">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-orange-500/10 p-3 shadow-inner">
                <AlertCircle className="h-12 w-12 text-orange-500" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold font-headline mb-2">404</h1>
            <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
            
            <p className="text-muted-foreground mb-8">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            
            <Button 
              asChild 
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <Link to="/home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Aqua Protocol. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;