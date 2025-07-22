import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'
import { BsTwitterX } from 'react-icons/bs'
import { FaFacebook, FaLinkedin } from 'react-icons/fa6'
import { Link, Outlet } from 'react-router-dom'

const Header = () => (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center mx-auto px-2">
            <nav className="hidden flex-1 md:flex items-center space-x-4 lg:space-x-6 justify-between">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="relative overflow-hidden p-1 ">
                        <img className="h-[40px]" src="/images/logo.png" />
                    </div>
                </Link>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <a
                        href="/#features"
                        className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Features
                    </a>
                    <a
                        href="/#how-it-works"
                        className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                    >
                        How It Works
                    </a>
                    <a
                        href="/#prototypes"
                        className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Prototypes
                    </a>
                    <a
                        href="/#vision"
                        className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Vision
                    </a>
                    <a
                        href="/#contact"
                        className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-orange-500 relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-primary after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                    >
                        Contact
                    </a>
                </div>
            </nav>
            <nav className="flex items-center space-x-2 group md:hidden">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="relative overflow-hidden">
                        <img className="h-[34px]" src="/images/logo.png" />
                    </div>
                </Link>
            </nav>
            <div className="flex flex-1 items-center justify-end space-x-3">
                <Button
                    variant="outline"
                    asChild
                    className="border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/5 transition-all duration-300"
                >
                    <Link
                        to="https://github.com/inblockio"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Github className="mr-2 h-4 w-4 text-orange-500" />
                        GitHub
                    </Link>
                </Button>
                <Button
                    asChild
                    className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    <Link to="/app">Go to App</Link>
                </Button>
            </div>
        </div>
    </header>
)

const Footer = () => (
    <footer className="bg-gradient-to-b from-orange-900 to-orange-950 text-orange-100/80">
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
                <div className="md:col-span-2 lg:col-span-2">
                    <div className="flex items-center space-x-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 256 256"
                            className="h-6 w-6 text-orange-300"
                        >
                            <rect width="256" height="256" fill="none"></rect>
                            <path
                                d="M48,208a16,16,0,0,1-16-16V64a16,16,0,0,1,16-16H208"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="16"
                            ></path>
                            <path
                                d="M208,208a16,16,0,0,0,16-16V93.3a15.9,15.9,0,0,0-4.7-11.3l-58.6-58.6a15.9,15.9,0,0,0-11.3-4.7H96a16,16,0,0,0-16,16v88"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="16"
                            ></path>
                            <polyline
                                points="152 24 152 88 216 88"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="16"
                            ></polyline>
                        </svg>
                        <span className="font-bold text-lg font-headline text-orange-100">
                            Aqua Protocol
                        </span>
                    </div>
                    <p className="mt-4 text-sm">
                        A Cryptographic Trust Protocol for Decentralized Data
                        Integrity.
                    </p>
                </div>
                <div>
                    <h4 className="font-headline font-semibold text-orange-100">
                        Protocol
                    </h4>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li>
                            <a
                                href="/#features"
                                className="hover:text-orange-300 transition-colors"
                            >
                                Features
                            </a>
                        </li>
                        <li>
                            <a
                                href="/#how-it-works"
                                className="hover:text-orange-300 transition-colors"
                            >
                                How It Works
                            </a>
                        </li>
                        <li>
                            <a
                                href="/#prototypes"
                                className="hover:text-orange-300 transition-colors"
                            >
                                Prototypes
                            </a>
                        </li>
                        <li>
                            <a
                                href="/#vision"
                                className="hover:text-orange-300 transition-colors"
                            >
                                Vision
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-headline font-semibold text-orange-100">
                        Company
                    </h4>
                    <ul className="mt-4 space-y-2 text-sm">
                        <li>
                            <Link
                                to="#"
                                className="hover:text-orange-300 transition-colors"
                            >
                                About Us
                            </Link>
                        </li>
                        <li>
                            <Link
                                to="mailto:demo@inblock.io"
                                className="hover:text-orange-300 transition-colors"
                            >
                                Contact
                            </Link>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-headline font-semibold text-orange-100">
                        Connect
                    </h4>
                    <div className="mt-4 flex space-x-4">
                        <Link
                            to="#"
                            className="hover:text-orange-300 transition-colors"
                        >
                            <BsTwitterX />
                        </Link>
                        <Link
                            to="#"
                            className="hover:text-orange-300 transition-colors"
                        >
                            <FaFacebook />
                        </Link>
                        <Link
                            to="#"
                            className="hover:text-orange-300 transition-colors"
                        >
                            <FaLinkedin />
                        </Link>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-orange-800 text-center text-sm">
                <div className="flex justify-center space-x-6 mb-4">
                    <Link
                        to="/terms-and-conditions"
                        className="hover:text-orange-300 transition-colors"
                    >
                        Terms & Conditions
                    </Link>
                    <Link
                        to="/privacy-policy"
                        className="hover:text-orange-300 transition-colors"
                    >
                        Privacy Policy
                    </Link>
                </div>
                <p>
                    &copy; {new Date().getFullYear()} Aqua Protocol. All rights
                    reserved.
                </p>
            </div>
        </div>
    </footer>
)

const TailwindMainLayout = () => {
    return (
        <div className="bg-background text-foreground font-body flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}

export default TailwindMainLayout
