import { ReactNode } from "react"
import Navbar from "../components/navbar/Navbar"
import { useLocation } from "react-router-dom";


interface IMainLayout {
    children: ReactNode
}

const MainLayout = ({ children }: IMainLayout) => {
   const location = useLocation();
    
    // Check if the current path is '/files'
    const isFilesPath = location.pathname === '/files' || location.pathname.startsWith('/files');

    return (
        <div>
            {/* Hide navbar for files path */}
            {!isFilesPath && <Navbar />}
            {children}
        </div>
    )
}

export default MainLayout