import { ReactNode } from "react"
import Navbar from "../components/navbar/Navbar"


interface IMainLayout {
    children: ReactNode
}

const MainLayout = ({ children }: IMainLayout) => {
    return (
        <div>
            <Navbar />
            {children}
        </div>
    )
}

export default MainLayout